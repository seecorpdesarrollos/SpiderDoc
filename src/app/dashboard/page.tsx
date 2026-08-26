import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET, FREE_DOCUMENT_LIMIT } from "@/lib/constants";
import type { DocumentRow, DocumentWithUrl } from "@/lib/types";
import { cookies } from "next/headers";
import { COOKIE_FORMATO, parseFormato } from "@/lib/preferencias";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

/**
 * Cuánto vale el enlace de la foto de un documento.
 *
 * Un enlace firmado abre el archivo SIN sesión: durante su vida, quien lo
 * tenga ve el documento aunque no tenga cuenta. Es cómo funciona el
 * almacenamiento, no un fallo — pero cuanto más corto, menos ventana.
 *
 * Estaba en una hora y no hacía ninguna falta: el visor carga la imagen en
 * un par de segundos. Tres minutos dejan margen de sobra para abrirla y mirarla
 * con calma, y recortan la exposición en un 95 %. Si caduca mientras está
 * abierta, el visor lo explica y basta con recargar.
 */
const SEGUNDOS_URL_FIRMADA = 3 * 60;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Orden crítico del producto: lo que caduca antes, primero.
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("expiry_date", { ascending: true });

  const rows = (data ?? []) as DocumentRow[];

  // URLs firmadas (bucket privado), válidas 1 hora.
  const documents: DocumentWithUrl[] = await Promise.all(
    rows.map(async (row) => {
      if (!row.file_path) return { ...row, signed_url: null };
      const { data: signed } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(row.file_path, SEGUNDOS_URL_FIRMADA);
      return { ...row, signed_url: signed?.signedUrl ?? null };
    }),
  );

  // El formato sale del servidor para que la lista se pinte bien a la
  // primera, sin cambiar de aspecto un instante después de cargar.
  const formato = parseFormato((await cookies()).get(COOKIE_FORMATO)?.value);

  return (
    <DashboardClient
      email={user.email ?? ""}
      initialDocuments={documents}
      limit={FREE_DOCUMENT_LIMIT}
      loadError={error?.message ?? null}
      formato={formato}
    />
  );
}
