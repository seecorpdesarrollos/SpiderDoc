"use client";

import { useRef, useState } from "react";
import { formatExpiryDate, getExpiryStatus } from "@/lib/expiry";
import { documentTypeLabel } from "@/lib/constants";

type Veredicto = "pendiente" | "acierto" | "fallo";

type Resultado = {
  id: string;
  nombre: string;
  preview: string | null;
  cargando: boolean;
  veredicto: Veredicto;
  ok?: boolean;
  expiry_date?: string | null;
  document_type?: string | null;
  document_holder?: string | null;
  issuing_country?: string | null;
  confidence?: "high" | "medium" | "low";
  notes?: string | null;
  error?: string;
  ms?: number;
  bytes?: number;
};

/**
 * crypto.randomUUID() solo existe en contexto seguro: en localhost sí, pero al
 * entrar por la IP de la red desde el móvil (http://192.168.x.x) no está, y la
 * llamada revienta. Como este id solo sirve para distinguir filas en pantalla,
 * cualquier valor único vale.
 */
function nuevoId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // Da igual el motivo: seguimos con la reserva.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const CONFIANZA: Record<string, string> = {
  high: "alta",
  medium: "media",
  low: "baja",
};

export function Bench() {
  const [items, setItems] = useState<Resultado[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const aciertos = items.filter((i) => i.veredicto === "acierto").length;
  const fallos = items.filter((i) => i.veredicto === "fallo").length;
  const juzgados = aciertos + fallos;

  async function procesar(files: FileList) {
    for (const file of Array.from(files)) {
      const id = nuevoId();
      const preview = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;

      setItems((prev) => [
        { id, nombre: file.name, preview, cargando: true, veredicto: "pendiente" },
        ...prev,
      ]);

      const fd = new FormData();
      fd.append("file", file);

      try {
        const res = await fetch("/api/probar", { method: "POST", body: fd });
        const body = await res.json();
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, ...body, cargando: false } : i)),
        );
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, cargando: false, ok: false, error: "Fallo de red." }
              : i,
          ),
        );
      }
    }
  }

  function juzgar(id: string, veredicto: Veredicto) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, veredicto } : i)),
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 pb-24">
      <header className="hairline-b flex flex-wrap items-end justify-between gap-4 pb-4">
        <div>
          <p className="heading-meta text-brand-600">Banco de pruebas</p>
          <h1 className="mt-1.5 font-heading text-2xl font-medium">
            ¿Acierta la fecha?
          </h1>
        </div>
        {juzgados > 0 && (
          <p className="text-sm text-fg-light">
            <span className="font-heading text-2xl font-medium text-foreground tabular-nums">
              {aciertos}
            </span>
            <span className="text-fg-lighter">/{juzgados}</span> aciertos
          </p>
        )}
      </header>

      <p className="mt-4 text-sm leading-relaxed text-fg-light">
        Subí los documentos que quieras, uno detrás de otro: DNI, pasaporte
        italiano, documentación argentina, carnet. Cada foto se manda al OCR y
        vuelve con la fecha que ha leído.{" "}
        <span className="text-foreground">
          Marcá vos si acertó o no
        </span>{" "}
        — eso es lo que estamos midiendo.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-fg-lighter">
        No se guarda nada: ni cuenta, ni base de datos, ni la imagen. La foto
        pasa al OCR y se descarta.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-primary px-4 py-2.5 text-sm"
        >
          Elegir foto o hacer una
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setItems([])}
            className="btn-default px-4 py-2.5 text-sm"
          >
            Empezar de cero
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) procesar(e.target.files);
          e.target.value = "";
        }}
      />

      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <Tarjeta key={item.id} item={item} onJuzgar={juzgar} />
        ))}
      </ul>
    </main>
  );
}

function Tarjeta({
  item,
  onJuzgar,
}: {
  item: Resultado;
  onJuzgar: (id: string, v: Veredicto) => void;
}) {
  const status = item.expiry_date ? getExpiryStatus(item.expiry_date) : null;

  return (
    <li className="card-surface p-4">
      <div className="flex gap-4">
        {item.preview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.preview}
            alt=""
            className="hairline h-20 w-20 shrink-0 rounded-md object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-fg-lighter">{item.nombre}</p>

          {item.cargando ? (
            <p className="mt-2 text-sm text-fg-light">Leyendo…</p>
          ) : item.expiry_date ? (
            <>
              <p className="mt-1 font-heading text-xl font-semibold">
                {formatExpiryDate(item.expiry_date)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {status && (
                  <span
                    className={`rounded-md border px-2 py-0.5 font-medium ${status.pill}`}
                  >
                    {status.label}
                  </span>
                )}
                <span className="text-fg-lighter">
                  {documentTypeLabel(item.document_type)}
                  {item.issuing_country ? ` · ${item.issuing_country}` : ""}
                  {item.confidence
                    ? ` · confianza ${CONFIANZA[item.confidence]}`
                    : ""}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-destructive">
              {item.error ?? "No leyó ninguna fecha."}
            </p>
          )}

          {item.notes && (
            <p className="mt-2 text-xs leading-relaxed text-warning">
              {item.notes}
            </p>
          )}

          {!item.cargando && (
            <p className="mt-2 text-xs text-fg-lighter tabular-nums">
              {item.ms ? `${(item.ms / 1000).toFixed(1)} s` : ""}
              {item.bytes ? ` · ${(item.bytes / 1024 / 1024).toFixed(1)} MB` : ""}
            </p>
          )}
        </div>
      </div>

      {!item.cargando && (
        <div className="hairline-t mt-3 flex flex-wrap items-center gap-2 pt-3">
          {item.veredicto === "pendiente" ? (
            <>
              <span className="text-xs text-fg-lighter">¿Es correcta?</span>
              <button
                onClick={() => onJuzgar(item.id, "acierto")}
                className="btn-default px-3 py-1 text-xs"
              >
                Sí, acertó
              </button>
              <button
                onClick={() => onJuzgar(item.id, "fallo")}
                className="btn-default px-3 py-1 text-xs"
              >
                No, falló
              </button>
            </>
          ) : (
            <button
              onClick={() => onJuzgar(item.id, "pendiente")}
              className={`text-xs font-medium underline underline-offset-4 ${
                item.veredicto === "acierto" ? "text-brand-600" : "text-destructive"
              }`}
            >
              {item.veredicto === "acierto" ? "Acertó" : "Falló"} · cambiar
            </button>
          )}
        </div>
      )}
    </li>
  );
}
