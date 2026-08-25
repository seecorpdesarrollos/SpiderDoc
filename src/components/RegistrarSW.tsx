"use client";

import { useEffect } from "react";

/**
 * Registra el service worker, que es lo que hace que Chrome en Android
 * ofrezca instalar la app.
 *
 * Solo en producción: en desarrollo un service worker sirve archivos viejos
 * y te vuelve loco buscando por qué un cambio no aparece.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Que falle el registro no debe romper nada: la app funciona igual,
      // simplemente no se puede instalar.
      console.error("[sw] No se pudo registrar:", error);
    });
  }, []);

  return null;
}
