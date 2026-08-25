/**
 * Envío de emails con la API de Resend.
 *
 * Solo para los avisos de caducidad, que son nuestros. El email de acceso lo
 * manda Supabase por SMTP a propósito: si nuestro código falla mandando un
 * aviso, alguien se queda sin recordatorio; si falla en el camino del login,
 * nadie puede entrar. No metemos código propio en la ruta de autenticación.
 */

export type ResultadoEnvio =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function enviarEmail(opciones: {
  para: string;
  asunto: string;
  html: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.RESEND_FROM;

  if (!apiKey || !remitente) {
    return { ok: false, error: "Faltan RESEND_API_KEY o RESEND_FROM." };
  }

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remitente,
        to: [opciones.para],
        subject: opciones.asunto,
        html: opciones.html,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error: `No se pudo contactar con Resend: ${error instanceof Error ? error.message : "desconocido"}`,
    };
  }

  const cuerpo = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      error: cuerpo?.message ?? `Resend devolvió ${response.status}.`,
    };
  }

  if (!cuerpo?.id) {
    return { ok: false, error: "Resend no devolvió un id de envío." };
  }

  return { ok: true, id: cuerpo.id };
}
