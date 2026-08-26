import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidIsoDate } from "@/lib/expiry";
import {
  ACCEPTED_MIME_TYPES,
  DOCUMENTS_BUCKET,
  FREE_DOCUMENT_LIMIT,
  MAX_FILE_BYTES,
  DOCUMENT_TYPES,
} from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Paso 2 del alta: guarda el archivo en Storage y crea la fila en
 * `documents` con la fecha ya confirmada por el usuario.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= FREE_DOCUMENT_LIMIT) {
    return NextResponse.json(
      {
        error: `Límite gratuito alcanzado (${FREE_DOCUMENT_LIMIT}/${FREE_DOCUMENT_LIMIT} documentos).`,
        code: "free_limit_reached",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "other");
  const expiryDate = String(formData.get("expiry_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // El país emisor lo lee el OCR. Se normaliza a tres letras mayúsculas y se
  // descarta cualquier otra cosa: es una clave del catálogo de ventanas, no
  // texto libre, y una fila con "Argentina" en vez de "ARG" no cruzaría.
  const paisCrudo = String(formData.get("issuing_country") ?? "").trim().toUpperCase();
  const issuingCountry = /^[A-Z]{3}$/.test(paisCrudo) ? paisCrudo : null;

  if (!title) {
    return NextResponse.json(
      { error: "Poné un nombre al documento." },
      { status: 400 },
    );
  }

  if (!isValidIsoDate(expiryDate)) {
    return NextResponse.json(
      { error: "La fecha de caducidad no es válida." },
      { status: 400 },
    );
  }

  if (!DOCUMENT_TYPES.some((t) => t.value === documentType)) {
    return NextResponse.json(
      { error: "Tipo de documento no reconocido." },
      { status: 400 },
    );
  }

  // El archivo es opcional: se puede dar de alta un documento a mano.
  let filePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!ACCEPTED_MIME_TYPES.includes(file.type as never)) {
      return NextResponse.json(
        { error: "Formato de archivo no admitido." },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "El archivo pesa más de 8 MB." },
        { status: 400 },
      );
    }

    const extension = extensionFor(file.type, file.name);
    filePath = `${user.id}/${crypto.randomUUID()}${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `No se pudo guardar el archivo: ${uploadError.message}` },
        { status: 500 },
      );
    }
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      document_type: documentType,
      expiry_date: expiryDate,
      issuing_country: issuingCountry,
      file_path: filePath,
      notes,
    })
    .select()
    .single();

  if (error) {
    // Si falla el insert, no dejamos el archivo huérfano en Storage.
    if (filePath) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
    }

    if (error.message.includes("FREE_LIMIT_REACHED")) {
      return NextResponse.json(
        {
          error: `Límite gratuito alcanzado (${FREE_DOCUMENT_LIMIT}/${FREE_DOCUMENT_LIMIT} documentos).`,
          code: "free_limit_reached",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: `No se pudo guardar el documento: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, document: data }, { status: 201 });
}

function extensionFor(mimeType: string, fileName: string): string {
  const fromName = fileName.includes(".")
    ? `.${fileName.split(".").pop()!.toLowerCase()}`
    : "";
  if (fromName.length > 1 && fromName.length <= 6) return fromName;

  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? "";
}
