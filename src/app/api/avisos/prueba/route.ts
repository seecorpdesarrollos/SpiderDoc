import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/resend";
import { asuntoAviso, cuerpoAviso, type AvisoPendiente } from "@/lib/avisos";
import { daysUntil } from "@/lib/expiry";

/**
 * Manda AHORA un aviso de prueba al correo del usuario.
 *
 * Existe porque el motor de avisos es el producto entero y hasta que no llega
 * un correo de verdad a una bandeja de verdad, no está probado. El cron corre
 * una vez al día: esperar a mañana para descubrir que el remitente estaba mal
 * configurado, o que el correo cae en spam, es la peor forma de enterarse.
 *
 * Usa la MISMA plantilla y el mismo camino que el aviso real. Si esto llega
 * bien, el de verdad también.
 *
 * No marca nada como enviado: es una prueba, no puede consumir el aviso real.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "No hay sesión." }, { status: 401 });
  }

  // Se usa el documento que caduca antes, para que la prueba se parezca a lo
  // que el usuario va a recibir de verdad.
  const { data: documentos } = await supabase
    .from("documents")
    .select("id, title, document_type, expiry_date")
    .order("expiry_date", { ascending: true })
    .limit(1);

  const doc = documentos?.[0];

  const aviso: AvisoPendiente = doc
    ? {
        document_id: doc.id,
        email: user.email,
        title: doc.title,
        document_type: doc.document_type,
        expiry_date: doc.expiry_date,
        milestone: 6,
        days_left: Math.max(daysUntil(doc.expiry_date), 0),
      }
    : {
        // Sin documentos todavía, se manda un ejemplo. Sigue sirviendo para lo
        // que importa: comprobar que el correo sale y llega.
        document_id: "ejemplo",
        email: user.email,
        title: "Pasaporte italiano (ejemplo)",
        document_type: "passport",
        expiry_date: "2029-01-31",
        milestone: 6,
        days_left: 180,
      };

  const appUrl = new URL(_request.url).origin;

  const resultado = await enviarEmail({
    para: user.email,
    asunto: `[Prueba] ${asuntoAviso(aviso)}`,
    html: cuerpoAviso(aviso, appUrl),
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, para: user.email });
}
