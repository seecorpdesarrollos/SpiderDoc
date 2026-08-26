"use client";

import { useEffect, useState } from "react";

type Plataforma = "ios" | "android" | "escritorio";

function detectar(): Plataforma {
  const ua = navigator.userAgent;
  // iPadOS moderno se identifica como Mac: se distingue por el táctil.
  const esIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (esIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "escritorio";
}

/**
 * Cómo instalar la app, explicado según el teléfono que tenga delante.
 *
 * Hace falta porque en iOS NO EXISTE el botón de instalar, para ninguna web.
 * Apple no lo permite. La única vía es Compartir → Añadir a pantalla de
 * inicio, y quien no lo sepa da por hecho que la app no se puede instalar.
 */
export function ComoInstalar() {
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    setPlataforma(detectar());
    // display-mode: standalone significa que ya se está abriendo desde el
    // icono y no desde el navegador.
    setInstalada(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (plataforma === null) return null;

  if (instalada) {
    return (
      <p className="text-sm leading-relaxed text-fg-light">
        Ya la estás usando como app instalada. Se abre desde su icono, a
        pantalla completa y sin barra de navegador.
      </p>
    );
  }

  const pasos: Record<Plataforma, string[]> = {
    ios: [
      "Tocá el botón de compartir de Safari, el cuadrado con la flecha hacia arriba.",
      "Bajá en la lista hasta «Añadir a pantalla de inicio».",
      "Tocá «Añadir», arriba a la derecha.",
    ],
    android: [
      "Abrí el menú de Chrome, los tres puntos de arriba a la derecha.",
      "Elegí «Instalar aplicación» o «Añadir a pantalla de inicio».",
      "Confirmá con «Instalar».",
    ],
    escritorio: [
      "En la barra de direcciones de Chrome o Edge, buscá el icono de instalar, a la derecha del todo.",
      "Si no aparece, está en el menú de tres puntos, dentro de «Guardar y compartir».",
      "Confirmá con «Instalar».",
    ],
  };

  const titulo: Record<Plataforma, string> = {
    ios: "En tu iPhone o iPad",
    android: "En tu móvil Android",
    escritorio: "En este ordenador",
  };

  return (
    <div>
      <p className="text-sm font-medium text-foreground">
        {titulo[plataforma]}
      </p>
      <ol className="mt-3 space-y-2.5">
        {pasos[plataforma].map((paso, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-fg-light">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand-600">
              {i + 1}
            </span>
            {paso}
          </li>
        ))}
      </ol>

      {plataforma === "ios" && (
        <p className="mt-4 border-l-2 border-border pl-3 text-xs leading-relaxed text-fg-lighter">
          En iPhone no existe un botón de «instalar» para ninguna web: Apple no
          lo permite. Añadirla a la pantalla de inicio <em>es</em> la
          instalación — se abre a pantalla completa, con su icono, igual que
          cualquier otra app.
        </p>
      )}
    </div>
  );
}
