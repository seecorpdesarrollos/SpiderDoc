"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const UMBRAL = 64; // píxeles a arrastrar para que cuente
const TOPE = 96; // hasta dónde puede estirarse

/**
 * Tirar hacia abajo para recargar.
 *
 * En una web normal el navegador ya lo hace, pero en una PWA instalada —que
 * es como se usa esto— ese gesto no existe: la app corre a pantalla completa
 * y no hay barra que tirar. El usuario intenta el gesto de siempre, no pasa
 * nada, y concluye que la app está colgada.
 *
 * Solo se activa cuando la página ya está arriba del todo, para no pisar el
 * desplazamiento normal. Y no bloquea nada: si se suelta antes del umbral,
 * vuelve a su sitio sin hacer nada.
 */
export function TirarParaRecargar() {
  const router = useRouter();
  const [tirando, setTirando] = useState(0);
  const [recargando, startTransition] = useTransition();
  const inicioY = useRef<number | null>(null);

  useEffect(() => {
    function alEmpezar(e: TouchEvent) {
      // Solo cuenta si ya estamos arriba del todo y es un dedo, no un pellizco.
      if (window.scrollY > 0 || e.touches.length !== 1) {
        inicioY.current = null;
        return;
      }
      inicioY.current = e.touches[0].clientY;
    }

    function alMover(e: TouchEvent) {
      if (inicioY.current === null) return;

      const delta = e.touches[0].clientY - inicioY.current;

      // Hacia arriba no es este gesto: es scroll normal.
      if (delta <= 0) {
        setTirando(0);
        return;
      }

      // La resistencia (delta / 2) es lo que da la sensación de goma. Sin
      // ella el indicador vuela y el gesto se siente barato.
      setTirando(Math.min(delta / 2, TOPE));
    }

    function alSoltar() {
      if (inicioY.current === null) return;

      if (tirando >= UMBRAL) {
        // router.refresh() no devuelve promesa; la transición sí sabe cuándo
        // termina, y así el indicador se queda hasta que llegan los datos.
        startTransition(() => router.refresh());
      }

      inicioY.current = null;
      setTirando(0);
    }

    // passive: los listeners no llaman a preventDefault, así que declararlo
    // deja al navegador desplazar sin esperar a nuestro código.
    document.addEventListener("touchstart", alEmpezar, { passive: true });
    document.addEventListener("touchmove", alMover, { passive: true });
    document.addEventListener("touchend", alSoltar, { passive: true });
    document.addEventListener("touchcancel", alSoltar, { passive: true });

    return () => {
      document.removeEventListener("touchstart", alEmpezar);
      document.removeEventListener("touchmove", alMover);
      document.removeEventListener("touchend", alSoltar);
      document.removeEventListener("touchcancel", alSoltar);
    };
  }, [router, tirando]);

  const visible = tirando > 0 || recargando;
  if (!visible) return null;

  const listo = tirando >= UMBRAL;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center md:hidden"
      style={{
        transform: `translateY(${recargando ? 48 : Math.min(tirando, TOPE)}px)`,
        transition: recargando ? "transform 180ms ease-out" : "none",
      }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-100 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${recargando ? "animate-spin text-brand-600" : listo ? "text-brand-600" : "text-fg-lighter"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: recargando ? undefined : `rotate(${tirando * 3}deg)`,
          }}
        >
          <path d="M21 12a9 9 0 1 1-3.5-7.1" />
          <path d="M21 3v6h-6" />
        </svg>
      </span>
    </div>
  );
}
