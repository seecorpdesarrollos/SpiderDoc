"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const UMBRAL = 72; // cuánto hay que tirar para que cuente
const TOPE = 120; // hasta dónde puede estirarse
const RADIO = 7;
const PERIMETRO = 2 * Math.PI * RADIO;

/**
 * Estado del gesto de tirar para recargar.
 *
 * Se separa del dibujo porque quien tiene que moverse NO es solo el indicador:
 * es el contenido. Una primera versión movía únicamente un círculo sobre una
 * página quieta, y así el gesto no se lee — parece que ha aparecido un punto
 * suelto. Lo que hace entender "estoy tirando de la página" es ver la página
 * bajar con el dedo y el indicador salir del hueco que deja.
 *
 * Por eso el estado vive aquí y lo consume AppShell, que es quien puede mover
 * las dos cosas a la vez.
 */
export function useTirarParaRecargar() {
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

      // Resistencia creciente: al principio sigue al dedo y cuanto más lejos,
      // más cuesta. Es lo que da sensación de goma y no de arrastrar una caja.
      const resistido = TOPE * (1 - Math.exp(-delta / TOPE));
      tirandoRef.current = resistido;
      setTirando(resistido);
    }

    function alSoltar() {
      if (inicioY.current === null) return;

      if (tirandoRef.current >= UMBRAL) {
        // router.refresh() no devuelve promesa; la transición sí sabe cuándo
        // termina, así que el indicador se queda hasta que llegan los datos.
        startTransition(() => router.refresh());
      }

      inicioY.current = null;
      tirandoRef.current = 0;
      setTirando(0);
    }

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

  const progreso = Math.min(tirando / UMBRAL, 1);

  return {
    /** Píxeles que hay que bajar el contenido. */
    desplazamiento: recargando ? 56 : tirando,
    progreso,
    recargando,
    activo: tirando > 0 || recargando,
  };
}

/**
 * El indicador.
 *
 * Es una pastilla con aro y TEXTO, no un icono suelto. El texto es lo que
 * quita toda duda: un aro girando puede ser cualquier cosa, "Actualizando…"
 * no. Y va cambiando —tirá / soltá / actualizando— así que el usuario sabe en
 * todo momento qué falta para que pase algo.
 */
export function IndicadorRecarga({
  progreso,
  recargando,
  activo,
  desplazamiento,
}: {
  progreso: number;
  recargando: boolean;
  activo: boolean;
  desplazamiento: number;
}) {
  if (!activo) return null;

  const listo = progreso >= 1;
  const texto = recargando
    ? "Actualizando…"
    : listo
      ? "Soltá para actualizar"
      : "Tirá para actualizar";

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center md:hidden"
      style={{
        // Se coloca centrado dentro del hueco que abre el contenido al bajar.
        transform: `translate3d(0, ${Math.max(desplazamiento / 2 - 16, 4)}px, 0)`,
        transition: recargando
          ? "transform 260ms cubic-bezier(0.16,1,0.3,1)"
          : "none",
        opacity: recargando ? 1 : Math.min(progreso * 1.8, 1),
      }}
    >
      <span className="flex items-center gap-2 rounded-full border border-black/5 bg-surface-100/90 py-1.5 pr-3.5 pl-2.5 text-xs font-medium text-fg-light shadow-[0_4px_16px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 ${recargando ? "animate-spin" : ""}`}
          style={{
            transform: recargando ? undefined : `rotate(${progreso * 180}deg)`,
            transition: "transform 80ms linear",
          }}
        >
          <circle
            cx="12"
            cy="12"
            r={RADIO}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-fg-lighter/25"
          />
          <circle
            cx="12"
            cy="12"
            r={RADIO}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={PERIMETRO}
            strokeDashoffset={
              recargando ? PERIMETRO * 0.7 : PERIMETRO * (1 - progreso)
            }
            transform="rotate(-90 12 12)"
            className={listo || recargando ? "text-brand" : "text-fg-light"}
            style={{ transition: "stroke-dashoffset 80ms linear" }}
          />
        </svg>
        <span className={listo || recargando ? "text-brand-600" : undefined}>
          {texto}
        </span>
      </span>
    </div>
  );
}
