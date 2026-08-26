"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Visor del archivo del documento, dentro de la app.
 *
 * Antes se abría la URL firmada en una pestaña nueva, y para un usuario final
 * eso está mal por tres motivos:
 *
 *   1. Sale de la aplicación. En el móvil instalado como PWA es peor todavía:
 *      salta al navegador, con su barra de direcciones y todo, y da la
 *      sensación de que la app te ha escupido fuera.
 *   2. Enseña la URL firmada del almacenamiento. Es un enlace que funciona sin
 *      sesión durante una hora: queda en el historial, y compartir la pestaña
 *      es compartir el documento de identidad.
 *   3. Esa URL caduca. Una pestaña abierta de ayer da un error críptico de
 *      Supabase en vez de una imagen.
 *
 * Aquí se ve encima de la app, se cierra con Escape o tocando fuera, y no
 * queda nada en el historial del navegador.
 */
export function VisorArchivo({
  url,
  titulo,
  onCerrar,
}: {
  url: string;
  titulo: string;
  onCerrar: () => void;
}) {
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPulsar);

    // Mientras el visor está abierto, el fondo no debe poder desplazarse:
    // en móvil, si no, se arrastra la lista por debajo de la imagen.
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", alPulsar);
      // Se restaura a vacío, no al valor que hubiera antes. Guardar el valor
      // previo parecía más correcto, pero si se abrían dos visores seguidos el
      // segundo guardaba "hidden" y al cerrarlo dejaba la página sin scroll
      // para siempre. Pasó en el móvil instalado y no había forma de salir
      // salvo recargando.
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  const esPdf = /\.pdf(\?|$)/i.test(url);

  if (!montado) return null;

  /**
   * Va en un portal, colgado directamente de <body>.
   *
   * Estaba dentro de la tarjeta, y aunque llevaba `fixed inset-0` se pintaba
   * en miniatura entre dos documentos. El motivo: si algún elemento por encima
   * tiene una transformación —y las tarjetas la tienen, por la animación de
   * entrada— deja de valer la pantalla como referencia y pasa a valer ese
   * elemento. El `fixed` se quedaba encerrado dentro de la tarjeta.
   *
   * Sacándolo a <body> no hay nada por encima que pueda encerrarlo.
   */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Archivo de ${titulo}`}
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex flex-col bg-black/85 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="min-w-0 truncate text-sm font-medium text-white/90">
          {titulo}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          // 44px: por debajo de eso se falla el toque en el móvil.
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        // El clic dentro no cierra: si no, ampliar la foto la haría desaparecer.
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-1 items-center justify-center overflow-auto px-4 pb-4"
      >
        {error ? (
          <div className="max-w-xs text-center">
            <p className="text-sm text-white/90">No se pudo cargar el archivo.</p>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              El enlace de acceso caduca al cabo de una hora. Cerrá esto y
              recargá la página para pedir uno nuevo.
            </p>
          </div>
        ) : esPdf ? (
          <iframe
            src={url}
            title={`Archivo de ${titulo}`}
            onLoad={() => setCargando(false)}
            className="h-full w-full rounded-lg bg-white"
          />
        ) : (
          <>
            {/* La foto de un documento pesa, y sobre todo la URL viene firmada
                y hay que ir a buscarla al almacenamiento. Sin esto la pantalla
                se queda negra y vacía unos segundos, que es exactamente lo que
                parece una app rota. */}
            {cargando && (
              <div className="flex flex-col items-center gap-3">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
                  aria-hidden
                />
                <p className="text-xs text-white/60">Cargando el archivo…</p>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Archivo de ${titulo}`}
              onLoad={() => setCargando(false)}
              onError={() => {
                setCargando(false);
                setError(true);
              }}
              className={`max-h-full max-w-full rounded-lg object-contain transition-opacity duration-300 ${
                cargando ? "absolute opacity-0" : "opacity-100"
              }`}
            />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
