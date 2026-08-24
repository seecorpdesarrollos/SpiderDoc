import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidIsoDate } from "@/lib/expiry";
import { DOCUMENTS_BUCKET, DOCUMENT_TYPES } from "@/lib/constants";

export const runtime = "nodejs";

/** Editar título, tipo o fecha de caducidad. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    document_type?: string;
    expiry_date?: string;
  };

  const patch: Record<string, string> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "El nombre no puede quedar vacío." },
        { status: 400 },
      );
    }
    patch.title = title;
  }

  if (body.document_type !== undefined) {
    if (!DOCUMENT_TYPES.some((t) => t.value === body.document_type)) {
      return NextResponse.json(
        { error: "Tipo de documento no reconocido." },
        { status: 400 },
      );
    }
    patch.document_type = body.document_type;
  }

  if (body.expiry_date !== undefined) {
    if (!isValidIsoDate(body.expiry_date)) {
      return NextResponse.json(
        { error: "La fecha de caducidad no es válida." },
        { status: 400 },
      );
    }
    patch.expiry_date = body.expiry_date;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que cambiar." }, { status: 400 });
  }

  // RLS ya restringe por usuario; el filtro explícito es defensa en profundidad.
  const { data, error } = await supabase
    .from("documents")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, document: data });
}

/** Borrar el documento y su archivo en Storage. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (doc?.file_path) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);
  }

  return NextResponse.json({ ok: true });
}
