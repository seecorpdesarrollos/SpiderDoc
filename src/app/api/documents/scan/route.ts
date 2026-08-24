import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractExpiryData, ExtractionError } from "@/lib/gemini";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_BYTES,
  FREE_DOCUMENT_LIMIT,
} from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Paso 1 del alta: analiza el archivo con Gemini y devuelve la fecha
 * detectada SIN guardar nada. El usuario confirma o corrige antes de que
 * se cree el documento (paso 2: POST /api/documents).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // El límite se comprueba antes de gastar una llamada a Gemini.
  const { count, error: countError } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json(
      { error: "No se pudieron contar tus documentos." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= FREE_DOCUMENT_LIMIT) {
    return NextResponse.json(
      {
        error: `Límite gratuito alcanzado (${FREE_DOCUMENT_LIMIT}/${FREE_DOCUMENT_LIMIT} documentos).`,
        code: "free_limit_reached",
      },
      { status: 403 },
    );
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el archivo enviado." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "Falta el archivo." },
      { status: 400 },
    );
  }

  if (!ACCEPTED_MIME_TYPES.includes(file.type as never)) {
    return NextResponse.json(
      { error: "Formato no admitido. Subí una imagen (JPG, PNG, WEBP) o un PDF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "El archivo pesa más de 8 MB. Probá con una foto más liviana." },
      { status: 400 },
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const result = await extractExpiryData(buffer, file.type);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ExtractionError) {
      // no_date_found no es un fallo del sistema: el usuario puede escribir
      // la fecha a mano. Devolvemos 200 con ok:false para que la UI siga.
      if (error.code === "no_date_found" || error.code === "unreadable") {
        return NextResponse.json({
          ok: false,
          code: error.code,
          error: error.message,
          expiry_date: null,
        });
      }
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.code === "not_configured" ? 500 : 502 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Error inesperado al analizar el documento." },
      { status: 500 },
    );
  }
}
