"use client";

import { useState } from "react";

const PALABRA = "BORRAR";

/**
 * Baja de cuenta con confirmación escrita.
 *
 * No basta un "¿seguro?": esto borra las fotos de los documentos de identidad
 * y no hay vuelta atrás. Escribir una palabra obliga a leer, que es justo lo
 * que un botón de confirmación no consigue.
 */
export function BorrarCuenta() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setBorrando(true);
    setError(null);

    const res = await fetch("/api/cuenta", { method: "DELETE" });

    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      setBorrando(false);
      setError(cuerpo.error ?? "No se pudo borrar la cuenta.");
      return;
    }

    // Recarga completa y no router.push: hay que tirar toda la sesión que
    // pueda quedar en memoria, no solo cambiar de pantalla.
    window.location.href = "/";
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="focus-ring rounded-md text-sm text-destructive underline underline-offset-4"
      >
        Dar de baja mi cuenta
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm leading-relaxed text-foreground">
        Se borrarán <strong>tus documentos y las fotos que subiste</strong>, y
        no se pueden recuperar. Los avisos dejarán de llegar.
      </p>

      <label className="mt-4 block">
        <span className="text-xs text-fg-light">
          Escribí <span className="font-mono font-semibold">{PALABRA}</span>{" "}
          para confirmar
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="input-field mt-2"
        />
      </label>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={texto !== PALABRA || borrando}
          onClick={borrar}
          className="focus-ring rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {borrando ? "Borrando…" : "Borrar mi cuenta para siempre"}
        </button>
        <button
          type="button"
          disabled={borrando}
          onClick={() => {
            setAbierto(false);
            setTexto("");
            setError(null);
          }}
          className="btn-default px-4 py-2.5 text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
