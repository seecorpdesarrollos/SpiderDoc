"use client";

import { useState } from "react";

/**
 * Manda un aviso de prueba a tu propio correo.
 *
 * Es el único modo de comprobar de punta a punta que el motor de avisos
 * funciona sin esperar a que el cron corra mañana.
 */
export function ProbarAviso() {
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado">("listo");
  const [error, setError] = useState<string | null>(null);

  async function probar() {
    setEstado("enviando");
    setError(null);

    const res = await fetch("/api/avisos/prueba", { method: "POST" });

    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      setEstado("listo");
      setError(cuerpo.error ?? "No se pudo enviar.");
      return;
    }

    setEstado("enviado");
    setTimeout(() => setEstado("listo"), 6000);
  }

  return (
    <div>
      <button
        type="button"
        onClick={probar}
        disabled={estado === "enviando"}
        className="btn-default px-4 py-2.5 text-sm"
      >
        {estado === "enviando" ? "Enviando…" : "Mandarme un aviso de prueba"}
      </button>

      {estado === "enviado" && (
        <p className="mt-3 text-sm leading-relaxed text-brand-600">
          Enviado. Miralo en tu correo — y si no aparece, mirá también en spam:
          eso ya sería algo que hay que arreglar antes de enseñárselo a nadie.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
