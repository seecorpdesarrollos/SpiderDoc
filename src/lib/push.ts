import webpush from "web-push";

/**
 * Envío de notificaciones push.
 *
 * VAPID es lo que le demuestra a Google, Apple o Mozilla que el aviso viene de
 * nosotros y no de cualquiera que haya pillado la dirección de suscripción de
 * un usuario. Sin esas claves, los servicios de push rechazan el envío.
 */

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;

  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  const contacto = process.env.VAPID_SUBJECT || "mailto:avisos@bytweb.com";

  if (!publica || !privada) return false;

  webpush.setVapidDetails(contacto, publica, privada);
  configurado = true;
  return true;
}

export type Suscripcion = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type ResultadoPush =
  | { ok: true }
  /** La suscripción ya no existe: hay que borrarla de la base de datos. */
  | { ok: false; caducada: true; error: string }
  | { ok: false; caducada: false; error: string };

export function pushConfigurado(): boolean {
  return configurar();
}

export async function enviarPush(
  suscripcion: Suscripcion,
  carga: { titulo: string; cuerpo: string; url?: string; tag?: string },
): Promise<ResultadoPush> {
  if (!configurar()) {
    return {
      ok: false,
      caducada: false,
      error: "Faltan las claves VAPID en el entorno.",
    };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: suscripcion.endpoint,
        keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth },
      },
      JSON.stringify(carga),
      { TTL: 60 * 60 * 24 }, // si el móvil está apagado, se guarda un día
    );
    return { ok: true };
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;

    // 404 y 410 significan lo mismo: esa suscripción murió — desinstalaron la
    // app, revocaron el permiso, cambiaron de móvil. Hay que olvidarla o el
    // cron lo reintentará cada día para siempre.
    const caducada = status === 404 || status === 410;

    return {
      ok: false,
      caducada,
      error:
        error instanceof Error ? error.message : `Error de push (${status ?? "?"})`,
    };
  }
}
