"use client";

import { useState } from "react";

/**
 * Botón de compartir.
 *
 * En el móvil usa el menú nativo de compartir del sistema — el mismo que sale
 * en cualquier app — así que el usuario puede mandarlo por WhatsApp, Telegram
 * o donde quiera sin que nosotros tengamos que integrar nada.
 *
 * En el escritorio ese menú no existe en la mayoría de navegadores, así que
 * se copia el enlace al portapapeles. Y si tampoco hay portapapeles (pasa
 * fuera de https), se enseña la dirección para copiarla a mano. Tres niveles,
 * ninguno deja al usuario sin salida.
 */
export function CompartirApp() {
  const [estado, setEstado] = useState<"listo" | "copiado" | "manual">("listo");
  const [url, setUrl] = useState("");

  async function compartir() {
    const enlace = window.location.origin;
    const texto =
      "Spiderjad Docs: le sacás una foto al pasaporte o al DNI y te avisa " +
      "con meses de antelación, antes de que se te pase.";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Spiderjad Docs", text: texto, url: enlace });
        return;
      } catch {
        // El usuario canceló, o el navegador lo rechazó. Seguimos al plan B
        // sin decir nada: cancelar no es un error que haya que anunciar.
      }
    }

    try {
      await navigator.clipboard.writeText(enlace);
      setEstado("copiado");
      setTimeout(() => setEstado("listo"), 2200);
      return;
    } catch {
      setUrl(enlace);
      setEstado("manual");
    }
  }

  if (estado === "manual") {
    return (
      <div>
        <p className="text-sm text-fg-light">Copiá esta dirección:</p>
        <p className="mt-2 rounded-md border border-border bg-surface-200 px-3 py-2 font-mono text-xs break-all text-foreground">
          {url}
        </p>
      </div>
    );
  }

  return (
    <button type="button" onClick={compartir} className="btn-primary px-4 py-2.5 text-sm">
      {estado === "copiado" ? "Enlace copiado" : "Compartir Spiderjad Docs"}
    </button>
  );
}
