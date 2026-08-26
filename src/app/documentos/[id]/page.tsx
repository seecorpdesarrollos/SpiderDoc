import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/constants";
import { COOKIE_FORMATO, parseFormato } from "@/lib/preferencias";
import { ventanaDe, type Ventana } from "@/lib/ventanas";
import type { DocumentRow } from "@/lib/types";
import { DocumentoDetalle } from "./detalle";

export const dynamic = "force-dynamic";

/** Igual que en el panel: lo justo para abrir la imagen y mirarla. */
const SEGUNDOS_URL_FIRMADA = 3 * 60;

export const metadata: Metadata = { title: "Documento — Spiderjad Docs" };

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // El .eq("user_id") es redundante —RLS ya lo filtra en la base de datos—
  // pero se queda como segunda barrera: esta ruta la abre un enlace que llega
  // por correo, y un correo se reenvía.
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // notFound y no un mensaje de "no es tuyo": si el documento existe pero es
  // de otra persona, decirlo ya sería contar algo.
  if (!data) notFound();

  const documento = data as DocumentRow;

  let signedUrl: string | null = null;
  if (documento.file_path) {
    const { data: firmada } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(documento.file_path, SEGUNDOS_URL_FIRMADA);
    signedUrl = firmada?.signedUrl ?? null;
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("lead_time_months")
    .eq("id", user.id)
    .single();

  const { data: ventanasData } = await supabase
    .from("renewal_windows")
    .select("document_type, country, meses_aviso, dias_tramite, nota, verificado");

  const ventanas = (ventanasData ?? []) as Ventana[];
  const formato = parseFormato((await cookies()).get(COOKIE_FORMATO)?.value);

  return (
    <DocumentoDetalle
      email={user.email ?? ""}
      documento={{ ...documento, signed_url: signedUrl }}
      antelacion={perfil?.lead_time_months ?? 6}
      ventana={ventanaDe(ventanas, documento.document_type, documento.issuing_country)}
      formato={formato}
    />
  );
}
