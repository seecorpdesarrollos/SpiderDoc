import { formatExpiryDate } from "@/lib/expiry";

/** Una fila de public.pending_notifications(). */
export type AvisoPendiente = {
  document_id: string;
  email: string;
  title: string;
  document_type: string | null;
  expiry_date: string;
  milestone: number;
  days_left: number;
};

/**
 * El texto se elige por los DÍAS QUE QUEDAN, no por el número del escalón.
 *
 * Antes iba por escalón: 1 → último aviso, 3 → se cierra, el resto → se abre
 * la ventana. Con la antelación por defecto de 6 meses cuadraba, porque los
 * escalones eran 6, 3 y 1.
 *
 * Pero la antelación la elige el usuario. Con 9 meses los escalones pasan a
 * ser 9, 4 y 1, y a un documento con 63 días por delante le tocaba el texto
 * del escalón 4 — o sea «todavía falta bastante, este es el primer día en que
 * podés hacer algo». Con dos meses de margen eso no es un matiz, es mentira.
 *
 * Los días son lo que de verdad importa, porque los plazos de los consulados
 * son absolutos: el argentino tarda unos noventa días tenga el usuario la
 * antelación que tenga.
 */
function tono(daysLeft: number) {
  if (daysLeft <= 35) {
    return {
      asunto: "Último aviso",
      titular: "Ya casi no queda margen",
      cuerpo:
        `Quedan ${daysLeft} días. Si el trámite pasa por un consulado, a estas alturas ` +
        `es probable que no llegues a tener el documento nuevo antes de que caduque el viejo. ` +
        `Miralo hoy: en algunos casos se puede pedir un justificante o una prórroga.`,
    };
  }

  if (daysLeft <= 100) {
    return {
      asunto: "Se te cierra la ventana",
      titular: "Quedan menos de tres meses",
      cuerpo:
        `A partir de aquí vas justo. El consulado argentino, por ejemplo, tarda unos 90 días ` +
        `en entregar el documento desde que lo pedís, y conseguir cita puede llevarte semanas. ` +
        `Si no empezaste el trámite, esta semana es el momento.`,
    };
  }

  return {
    asunto: "Ya podés renovarlo",
    titular: "Se abre la ventana para renovar",
    cuerpo:
      `Todavía falta bastante, y por eso mismo te avisamos ahora: muchos consulados no aceptan ` +
      `la renovación hasta seis meses antes de la caducidad, así que este es justo el primer día ` +
      `en que podés hacer algo. Pedir la cita ahora es lo que evita las prisas después.`,
  };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

/**
 * El título del documento lo escribe el usuario, así que va a parar a un email
 * como texto ajeno. Sin escapar, un título con "<" rompería el HTML.
 */
function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

export function asuntoAviso(aviso: AvisoPendiente): string {
  const t = tono(aviso.days_left);
  return `${t.asunto}: ${aviso.title} caduca el ${formatExpiryDate(aviso.expiry_date)}`;
}

/**
 * Mismo lenguaje visual que los emails de acceso: etiquetas simples con
 * estilos escritos dentro, porque los clientes de correo ignoran las hojas de
 * estilo y las tablas anidadas se rompen al pasar por editores intermedios.
 */
/**
 * A dónde lleva el botón del aviso.
 *
 * Al documento concreto, no al panel. Quien abre este correo ya sabe cuál le
 * preocupa — mandarlo a una lista para que lo busque es hacerle repetir un
 * trabajo que nosotros ya hicimos.
 *
 * El aviso de prueba usa un id falso porque puede no haber ningún documento
 * todavía; en ese caso se cae al panel en vez de a una ficha inexistente.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function enlaceDocumento(documentId: string): string {
  return UUID.test(documentId) ? `/documentos/${documentId}` : "/dashboard";
}

export function cuerpoAviso(aviso: AvisoPendiente, appUrl: string): string {
  const t = tono(aviso.days_left);
  const titulo = esc(aviso.title);
  const fecha = formatExpiryDate(aviso.expiry_date);
  const destino = `${appUrl}${enlaceDocumento(aviso.document_id)}`;

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:460px;margin:0 auto;padding:8px 4px;color:#1a1a1a;">
  <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#2a7d5f;font-weight:700;margin:0 0 20px 0;">Spiderjad Docs</p>
  <h1 style="font-size:21px;line-height:1.3;font-weight:600;margin:0 0 10px 0;color:#1a1a1a;">${esc(t.titular)}</h1>
  <p style="font-size:15px;line-height:1.6;color:#555b58;margin:0 0 22px 0;"><strong style="color:#1a1a1a;">${titulo}</strong> caduca el ${fecha}.</p>
  <p style="font-size:15px;line-height:1.6;color:#555b58;margin:0 0 26px 0;">${esc(t.cuerpo)}</p>
  <p style="margin:0 0 26px 0;">
    <a href="${destino}" style="background-color:#1a1a1a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:13px 24px;border-radius:7px;display:inline-block;">Ver el documento</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#8b918e;margin:0 0 22px 0;border-top:1px solid #e8eae9;padding-top:22px;">Recibís este aviso porque pediste que te avisáramos con antelación. Podés cambiar cuánta antelación querés desde tu cuenta.</p>
  <p style="font-size:12px;color:#a5aaa8;margin:0;">Spiderjad SL</p>
</div>`;
}
