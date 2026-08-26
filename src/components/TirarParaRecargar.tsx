"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const UMBRAL = 70; // cuánto hay que tirar para que cuente
const TOPE = 110; // hasta dónde puede estirarse
const RADIO = 8.5;
const PERIMETRO = 2 * Math.PI * RADIO;

/**
 * Tirar hacia abajo para recargar.
 *
 * En una web normal lo hace el navegador, pero en una PWA instalada —que es
 * como se usa esto— el gesto no existe: no hay barra que tirar. El usuario lo
 * intenta, no pasa nada, y concluye que la app está colgada.
 *
 * El indicador es un aro que se va llenando conforme tirás, y al soltar pasa a
 * girar. Esa es la diferencia con un icono que solo aparece: el aro te dice
 * CUÁNTO te falta, así que sabés si ya podés soltar sin tener que adivinar.
 *
 * Sale de detrás de la cabecera, no encima. Un elemento que aparece flotando
 * sin venir de ningún sitio se lee como un pegote.
 */
export function TirarParaRecargar() {
  const router = useRouter();
  const [tirando, setTirando] = useState(0);
  const [recargando, startTransition] = useTransition();
  const inicioY = useRef<number | null>(null);
  const tirandoRef = useRef(0);

  useEffect(() => {
    function alEmpezar(e: TouchEvent) {
      if (window.scrollY > 0 || e.touches.length !== 1) {
        inicioY.current = null;
        return;
      }
      inicioY.current = e.touches[0].clientY;
    }

    function alMover(e: TouchEvent) {
      if (inicioY.current === null) return;

      const delta = e.touches[0].clientY - inicioY.current;
      if (delta <= 0) {
        tirandoRef.current = 0;
        setTirando(0);
        return;
      }

      // Resistencia creciente: al principio sigue al dedo, y cuanto más lejos
      // más cuesta. Es lo que da la sensación de goma en vez de la de arrastrar
      // una caja.
      const resistido = TOPE * (1 - Math.exp(-delta / TOPE));
      tirandoRef.current = resistido;
      setTirando(resistido);
    }

    function alSoltar() {
      if (inicioY.current === null) return;

      if (tirandoRef.current >= UMBRAL) {
        // router.refresh() no devuelve promesa; la transición sí sabe cuándo
        // termina, así que el aro gira hasta que llegan los datos de verdad.
        startTransition(() => router.refresh());
      }

      inicioY.current = null;
      tirandoRef.current = 0;
      setTirando(0);
    }

    // passive: no llamamos a preventDefault, así el navegador desplaza sin
    // esperar a nuestro código.
    const opciones = { passive: true } as const;
    document.addEventListener("touchstart", alEmpezar, opciones);
    document.addEventListener("touchmove", alMover, opciones);
    document.addEventListener("touchend", alSoltar, opciones);
    document.addEventListener("touchcancel", alSoltar, opciones);

    return () => {
      document.removeEventListener("touchstart", alEmpezar);
      document.removeEventListener("touchmove", alMover);
      document.removeEventListener("touchend", alSoltar);
      document.removeEventListener("touchcancel", alSoltar);
    };
  }, [router]);

  const activo = tirando > 0 || recargando;
  if (!activo) return null;

  const progreso = Math.min(tirando / UMBRAL, 1);
  const listo = progreso >= 1;

  // Mientras se tira, el aro sale de detrás de la cabecera. Al soltar se queda
  // a una altura fija hasta que termina.
  const desplazamiento = recargando ? 56 : 8 + tirando * 0.6;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-10 flex justify-center md:hidden"
      style={{
        transform: `translate3d(0, ${desplazamiento}px, 0)`,
        transition: recargando ? "transform 260ms cubic-bezier(0.16,1,0.3,1)" : "none",
      }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 shadow-[0_2px_10px_rgba(0,0,0,0.10)] ring-1 ring-black/5 dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)] dark:ring-white/10"
        style={{
          // Aparece creciendo, no de golpe.
          transform: `scale(${recargando ? 1 : 0.55 + progreso * 0.45})`,
          opacity: recargando ? 1 : Math.min(progreso * 1.6, 1),
          transition: recargando ? "transform 260ms ease-out" : "none",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${recargando ? "animate-spin" : ""}`}
          style={{
            // Mientras se tira, el aro gira despacio siguiendo el dedo.
            transform: recargando ? undefined : `rotate(${progreso * 270}deg)`,
          }}
        >
          {/* Surco de fondo: da referencia de cuánto falta. */}
          <circle
            cx="12"
            cy="12"
            r={RADIO}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            className="text-fg-lighter/25"
          />
          {/* Aro de progreso. Al recargar se queda en un cuarto y gira. */}
          <circle
            cx="12"
            cy="12"
            r={RADIO}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeDasharray={PERIMETRO}
            strokeDashoffset={
              recargando ? PERIMETRO * 0.72 : PERIMETRO * (1 - progreso)
            }
            transform="rotate(-90 12 12)"
            className={
              listo || recargando ? "text-brand" : "text-fg-light"
            }
            style={{ transition: "stroke-dashoffset 80ms linear" }}
          />
        </svg>
      </span>
    </div>
  );
}
