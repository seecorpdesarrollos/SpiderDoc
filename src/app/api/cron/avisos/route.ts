import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/resend";
import { asuntoAviso, cuerpoAviso, type AvisoPendiente } from "@/lib/avisos";
import { enviarPush, pushConfigurado } from "@/lib/push";
import { formatExpiryDate } from "@/lib/expiry";

/**
 * Cron diario de avisos de caducidad.
 *
 * Lo llama Vercel una vez al día (ver vercel.json). Vercel manda la cabecera
 * Authorization con el valor de CRON_SECRET, así que la ruta queda cerrada a
 * cualquiera que no lo tenga.
 *
 * SOBRE LA CLAVE PRIVILEGIADA
 * Un proceso automático necesita leer documentos de todos los usuarios, y RLS
 * lo impide justamente para eso, así que aquí usamos la service_role key. Esa
 * clave lo abre todo, incluidas las imágenes escaneadas.
 *
 * Por eso esta ruta NO consulta las tablas directamente: llama a
 * pending_notifications(), que devuelve solo email, título y fecha, nunca
 * file_path. Si mañana alguien mete un bug aquí, el peor caso sigue sin poder
 * tocar una foto de un pasaporte.
 *
 * La clave vive únicamente en las variables de entorno de Vercel y no está en
 * el repositorio. Si alguna vez se filtra, se rota desde el panel de Supabase.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** El título del push, corto: en la pantalla de bloqueo no cabe más. */
function asuntoPush(milestone: number): string {
  if (milestone <= 1) return "Último aviso";
  if (milestone <= 3) return "Se te cierra la ventana";
  return "Ya podés renovarlo";
}

function noAutorizado() {
  // 404 y no 401: a un endpoint que no existe no se le insiste.
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return noAutorizado();

  const cabecera = request.headers.get("authorization");
  if (cabecera !== `Bearer ${secreto}`) return noAutorizado();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    return NextResponse.json(
      { error: "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("pending_notifications");
  if (error) {
    return NextResponse.json(
      { error: `No se pudo leer la lista de avisos: ${error.message}` },
      { status: 500 },
    );
  }

  const pendientes = (data ?? []) as AvisoPendiente[];

  // Un documento puede caer en varios escalones a la vez: si se sube cuando ya
  // faltan tres semanas, cumple el de 6, el de 3 y el de 1 el mismo día. Se
  // manda UN email —el del escalón más urgente, que es el número más bajo— y
  // los demás se marcan como enviados para que no reaparezcan mañana.
  //
  // La función SQL ya ordena por urgencia, así que el primero que llega de
  // cada documento es el que toca mandar.
  const aEnviar = new Map<string, AvisoPendiente>();
  const aSilenciar = new Map<string, number[]>();

  for (const aviso of pendientes) {
    if (!aEnviar.has(aviso.document_id)) {
      aEnviar.set(aviso.document_id, aviso);
      aSilenciar.set(aviso.document_id, []);
    } else {
      aSilenciar.get(aviso.document_id)!.push(aviso.milestone);
    }
  }

  const appUrl = new URL(request.url).origin;
  let enviados = 0;
  const fallos: { documento: string; error: string }[] = [];

  for (const aviso of aEnviar.values()) {
    const resultado = await enviarEmail({
      para: aviso.email,
      asunto: asuntoAviso(aviso),
      html: cuerpoAviso(aviso, appUrl),
    });

    if (!resultado.ok) {
      // No se marca nada: mañana se reintenta. Es preferible un aviso repetido
      // a un aviso que nunca llegó.
      fallos.push({ documento: aviso.document_id, error: resultado.error });
      continue;
    }

    enviados += 1;

    // ---- Push, además del correo ----
    // El correo es el canal principal: se queda en la bandeja y se puede
    // reenviar o retomar semanas después, que es lo que hace falta para un
    // aviso con meses de horizonte. El push es el empujón del momento.
    //
    // Si falla, NO se aborta nada: el correo ya salió y ese es el compromiso.
    if (pushConfigurado()) {
      const { data: destinos } = await supabase.rpc("push_targets", {
        p_document_id: aviso.document_id,
      });

      for (const destino of (destinos ?? []) as {
        endpoint: string;
        p256dh: string;
        auth: string;
      }[]) {
        const resultadoPush = await enviarPush(destino, {
          titulo: asuntoPush(aviso.milestone),
          cuerpo: `${aviso.title} caduca el ${formatExpiryDate(aviso.expiry_date)}.`,
          url: "/dashboard",
          // Un aviso por documento: si llega otro del mismo, reemplaza al
          // anterior en vez de apilarse.
          tag: `doc-${aviso.document_id}`,
        });

        if (!resultadoPush.ok && resultadoPush.caducada) {
          // Desinstalaron la app o revocaron el permiso. Se olvida, o el cron
          // lo reintentaría cada día para siempre.
          await supabase.rpc("push_forget", { p_endpoint: destino.endpoint });
        }
      }
    }

    // El escalón enviado y los que quedaban por debajo, todos a la vez.
    const escalones = [
      aviso.milestone,
      ...(aSilenciar.get(aviso.document_id) ?? []),
    ];
    for (const milestone of escalones) {
      const { error: errorMarca } = await supabase.rpc("mark_notification_sent", {
        p_document_id: aviso.document_id,
        p_milestone: milestone,
      });
      if (errorMarca) {
        // El email ya salió. Si esto falla, mañana se manda otra vez: molesto,
        // pero no se pierde nada. Queda en el log para poder verlo.
        fallos.push({
          documento: aviso.document_id,
          error: `Enviado pero no marcado (escalón ${milestone}): ${errorMarca.message}`,
        });
      }
    }
  }

  return NextResponse.json({
    revisados: pendientes.length,
    documentos: aEnviar.size,
    enviados,
    fallos,
  });
}
