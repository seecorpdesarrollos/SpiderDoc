"use client";

import { useEffect, useState } from "react";

type Estado =
  | "comprobando"
  | "no-soportado"
  | "requiere-instalar"
  | "bloqueado"
  | "apagado"
  | "encendido";

/** La clave pública VAPID viaja como texto y hay que pasarla a bytes. */
function claveABytes(base64: string): Uint8Array {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const crudo = atob(normal);
  const bytes = new Uint8Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

/**
 * Activar o desactivar los avisos push en ESTE dispositivo.
 *
 * Tres cosas que no son obvias y por las que este componente es más largo de
 * lo que parecería:
 *
 * 1. En iOS solo funciona si la app está añadida a la pantalla de inicio.
 *    Desde Safari normal no existe. Si no se explica, el usuario cree que
 *    está roto.
 *
 * 2. El permiso se pide SOLO al pulsar el botón, nunca al cargar la página.
 *    Un permiso pedido sin contexto se deniega, y una vez denegado el
 *    navegador no vuelve a preguntar: se pierde el canal para siempre.
 *
 * 3. La suscripción es por dispositivo, no por cuenta. Activarlo en el móvil
 *    no lo activa en el portátil, y eso hay que decirlo o parece un fallo.
 */
export function ActivarPush() {
  const [estado, setEstado] = useState<Estado>("comprobando");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    async function comprobar() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        // En iOS, PushManager solo existe cuando la app está instalada.
        const esIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
        const instalada = window.matchMedia("(display-mode: standalone)").matches;
        setEstado(esIOS && !instalada ? "requiere-instalar" : "no-soportado");
        return;
      }

      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? "encendido" : "apagado");
    }

    comprobar().catch(() => setEstado("no-soportado"));
  }, []);

  async function encender() {
    setTrabajando(true);
    setError(null);

    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }

      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) {
        setError("Faltan las claves de push en el servidor.");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        // Obligatorio: no se permiten avisos silenciosos sin mostrar nada.
        userVisibleOnly: true,
        applicationServerKey: claveABytes(clave) as BufferSource,
      });

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });

      if (!res.ok) {
        const cuerpo = await res.json().catch(() => ({}));
        // Si el servidor no la guardó, no dejamos la suscripción viva en el
        // navegador: quedaría encendido de cara al usuario y sin recibir nada.
        await suscripcion.unsubscribe().catch(() => {});
        setError(cuerpo.error ?? "No se pudo guardar la suscripción.");
        return;
      }

      setEstado("encendido");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setTrabajando(false);
    }
  }

  async function apagar() {
    setTrabajando(true);
    setError(null);

    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();

      if (suscripcion) {
        await fetch(
          `/api/push?endpoint=${encodeURIComponent(suscripcion.endpoint)}`,
          { method: "DELETE" },
        );
        await suscripcion.unsubscribe();
      }

      setEstado("apagado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo desactivar.");
    } finally {
      setTrabajando(false);
    }
  }

  if (estado === "comprobando") {
    return <div className="esqueleto h-10 w-52" />;
  }

  if (estado === "requiere-instalar") {
    return (
      <p className="text-sm leading-relaxed text-fg-light">
        En iPhone los avisos push solo funcionan con la app añadida a la
        pantalla de inicio. Instalala primero —tenés los pasos aquí arriba— y
        volvé a esta pantalla desde su icono.
      </p>
    );
  }

  if (estado === "no-soportado") {
    return (
      <p className="text-sm leading-relaxed text-fg-light">
        Este navegador no admite avisos push. Los correos te llegan igual.
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <p className="text-sm leading-relaxed text-fg-light">
        Bloqueaste las notificaciones para esta app, así que el navegador ya no
        te va a preguntar. Se reactiva desde los ajustes del propio navegador,
        en los permisos de este sitio.
      </p>
    );
  }

  return (
    <div>
      {estado === "encendido" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
            Activados en este dispositivo
          </span>
          <button
            type="button"
            onClick={apagar}
            disabled={trabajando}
            className="focus-ring rounded-md text-sm text-fg-lighter underline underline-offset-4 hover:text-foreground"
          >
            Desactivar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={encender}
          disabled={trabajando}
          className="btn-primary px-4 py-2.5 text-sm"
        >
          {trabajando ? "Activando…" : "Activar avisos en este dispositivo"}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <p className="mt-3 text-xs leading-relaxed text-fg-lighter">
        Se activan por dispositivo. Si lo encendés en el móvil, en el ordenador
        hay que encenderlo aparte.
      </p>
    </div>
  );
}
