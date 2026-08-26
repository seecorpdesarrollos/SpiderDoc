import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Actualiza la antelación con la que el usuario quiere los avisos. */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 });
  }

  let body: { lead_time_months?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const meses = Number(body.lead_time_months);

  // Los mismos límites que la restricción de la base de datos. Se comprueba
  // aquí para dar un mensaje legible en vez de un error de Postgres, pero la
  // que de verdad no se puede saltar es la de la base de datos.
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
    return NextResponse.json(
      { error: "La antelación tiene que estar entre 1 y 24 meses." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ lead_time_months: meses })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: `No se pudo guardar: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ lead_time_months: meses });
}
