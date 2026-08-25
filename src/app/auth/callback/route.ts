import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del magic link. Supabase manda un `code` (PKCE) que hay que
 * canjear por una sesión antes de redirigir al dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Siempre el origen de la petición, nunca una URL configurada. Si el enlace
  // se abre desde el móvil por la IP de la red, la vuelta tiene que ir a esa
  // misma IP; una variable fijada a localhost dejaba la sesión colgada en
  // cualquier dispositivo que no fuera el del desarrollo.
  const base = origin;

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${base}/login?error=exchange_failed`);
  }

  // Evita open redirects: solo rutas internas.
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(`${base}${safeNext}`);
}
