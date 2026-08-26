import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_FORMATO, parseFormato } from "@/lib/preferencias";
import { AjustesClient } from "./ajustes-client";

export const metadata = { title: "Ajustes — Spiderjad Docs" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("lead_time_months")
    .eq("id", user.id)
    .single();

  const formato = parseFormato((await cookies()).get(COOKIE_FORMATO)?.value);

  return (
    <AjustesClient
      email={user.email ?? ""}
      antelacionInicial={perfil?.lead_time_months ?? 6}
      formatoInicial={formato}
    />
  );
}
