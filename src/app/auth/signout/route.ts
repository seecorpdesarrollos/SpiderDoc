import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // El origen de la petición: devuelve al usuario a donde estaba, sea
  // localhost, la IP de la red o el dominio de producción.
  const base = new URL(request.url).origin;
  return NextResponse.redirect(`${base}/`, { status: 303 });
}
