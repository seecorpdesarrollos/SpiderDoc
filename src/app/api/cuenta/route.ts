import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/constants";

/**
 * Baja de la cuenta.
 *
 * No es una función "por si acaso": si alguien guarda aquí fotos de su
 * pasaporte, tiene derecho a llevárselas y a que desaparezcan. Sin esto no se
 * puede tener usuarios en Europa.
 *
 * Borra en este orden, y el orden importa:
 *   1. Los archivos del almacenamiento. Si se borrara el usuario primero, las
 *      fotos quedarían huérfanas en el bucket para siempre, sin nadie que
 *      pudiera reclamarlas ni encontrarlas.
 *   2. El usuario de auth. Las filas de profiles y documents se van solas
 *      detrás, por el "on delete cascade" del esquema.
 *
 * Hace falta la service_role key porque borrar un usuario de auth es una
 * operación de administración: nadie puede hacerlo con su propio token.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return NextResponse.json(
      { error: "La baja de cuenta no está configurada en este entorno." },
      { status: 500 },
    );
  }

  const admin = createAdminClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Los archivos. Se listan con el cliente del propio usuario, que por RLS
  // solo ve su carpeta: así ni siquiera aquí hay forma de tocar los de otro.
  const { data: archivos } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .list(user.id);

  if (archivos && archivos.length > 0) {
    const rutas = archivos.map((a) => `${user.id}/${a.name}`);
    const { error: errorBorrado } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .remove(rutas);

    if (errorBorrado) {
      // Se para aquí a propósito. Borrar la cuenta dejando las imágenes
      // sueltas sería lo peor de los dos mundos: el usuario cree que se ha
      // ido y sus documentos siguen ahí.
      return NextResponse.json(
        { error: `No se pudieron borrar los archivos: ${errorBorrado.message}` },
        { status: 500 },
      );
    }
  }

  // 2. El usuario. Detrás caen profiles y documents por cascada.
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: `No se pudo borrar la cuenta: ${error.message}` },
      { status: 500 },
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
