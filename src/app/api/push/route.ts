import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Alta de un dispositivo para recibir avisos push. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 });
  }

  let body: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida." }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : null;
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : null;
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Faltan datos de la suscripción." },
      { status: 400 },
    );
  }

  // upsert por endpoint: si el mismo navegador se vuelve a suscribir —pasa al
  // reinstalar o al renovarse la suscripción— se actualiza en lugar de
  // duplicarse. RLS garantiza que solo puede ser suya.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      user_id: user.id,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json(
      { error: `No se pudo guardar la suscripción: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** Baja de este dispositivo. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "Falta el endpoint." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
