import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET, FREE_DOCUMENT_LIMIT } from "@/lib/constants";
import type { DocumentRow, DocumentWithUrl } from "@/lib/types";
import { cookies } from "next/headers";
import { COOKIE_FORMATO, parseFormato } from "@/lib/preferencias";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

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
        .createSignedUrl(row.file_path, 60 * 60);
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
