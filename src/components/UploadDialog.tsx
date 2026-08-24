"use client";

import { useRef, useState } from "react";
import { DOCUMENT_TYPES, documentTypeLabel } from "@/lib/constants";
import { formatExpiryDate, getExpiryStatus } from "@/lib/expiry";
import type { ExtractionResult } from "@/lib/types";

type Step = "pick" | "scanning" | "review" | "saving";

export function UploadDialog({
  onClose,
  onCreated,
  onLimitReached,
}: {
  onClose: () => void;
  onCreated: () => void;
  onLimitReached: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<string>("dni");
  const [expiry, setExpiry] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(selected: File) {
    setFile(selected);
    setError(null);
    setScanNote(null);
    setPreview(
      selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null,
    );
    setStep("scanning");

    const formData = new FormData();
    formData.append("file", selected);

    try {
      const res = await fetch("/api/documents/scan", {
        method: "POST",
        body: formData,
      });
      const body = (await res.json()) as Partial<ExtractionResult> & {
        ok?: boolean;
        error?: string;
        code?: string;
      };

      if (res.status === 403 && body.code === "free_limit_reached") {
        onLimitReached();
        return;
      }

      if (!res.ok && body.code !== "no_date_found") {
        setError(body.error ?? "No se pudo analizar el documento.");
        setStep("review");
        return;
      }

      if (body.expiry_date) {
        setExpiry(body.expiry_date);
        if (body.confidence && body.confidence !== "high") {
          setScanNote(
            "Revisá la fecha: la lectura no fue del todo nítida.",
          );
        }
      } else {
        setScanNote(
          body.error ??
            "No pudimos leer la fecha. Escribila a mano y listo.",
        );
      }

      if (body.document_type) setDocType(body.document_type);
      if (!title) {
        setTitle(
          body.document_type
            ? documentTypeLabel(body.document_type)
            : selected.name.replace(/\.[^.]+$/, ""),
        );
      }
      setStep("review");
    } catch {
      setError("Fallo de red al analizar el documento.");
      setStep("review");
    }
  }

  async function handleSave() {
    if (!expiry) {
      setError("Necesitamos la fecha de caducidad.");
      return;
    }
    setStep("saving");
    setError(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("title", title.trim() || documentTypeLabel(docType));
    formData.append("document_type", docType);
    formData.append("expiry_date", expiry);

    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    const body = await res.json().catch(() => ({}));

    if (res.status === 403 && body.code === "free_limit_reached") {
      onLimitReached();
      return;
    }

    if (!res.ok) {
      setError(body.error ?? "No se pudo guardar el documento.");
      setStep("review");
      return;
    }

    onCreated();
  }

  const status = expiry ? getExpiryStatus(expiry) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-6 sm:rounded-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="label-track text-rust">Nuevo documento</p>
            <div className="rule-accent mt-2.5 w-10" />
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-muted transition hover:text-bone"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {step === "pick" && (
          <div className="mt-7">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-card border border-dashed border-line bg-surface-2 px-6 py-12 text-center transition hover:border-rust"
            >
              <p className="text-lg font-semibold">Elegí una foto o PDF</p>
              <p className="mt-2 text-sm text-muted">
                JPG, PNG, WEBP o PDF. Hasta 8 MB.
              </p>
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted">
              Leemos la fecha de caducidad automáticamente. Vos la confirmás
              antes de guardar.
            </p>

            <button
              type="button"
              onClick={() => {
                setStep("review");
                setScanNote("Alta manual: escribí los datos del documento.");
              }}
              className="mt-4 w-full text-center text-sm text-muted underline underline-offset-4 transition hover:text-bone"
            >
              Prefiero escribirlo a mano
            </button>
          </div>
        )}

        {step === "scanning" && (
          <div className="mt-10 flex flex-col items-center py-10 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-rust" />
            <p className="mt-6 font-semibold">Leyendo el documento…</p>
            <p className="mt-2 text-sm text-muted">
              Buscando la fecha de caducidad. Tarda unos segundos.
            </p>
          </div>
        )}

        {(step === "review" || step === "saving") && (
          <div className="mt-7 space-y-5">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Vista previa del documento"
                className="max-h-44 w-full rounded-lg border border-line object-contain bg-surface-2"
              />
            )}

            {scanNote && (
              <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                {scanNote}
              </p>
            )}

            <label className="block">
              <span className="label-track text-muted">Nombre</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="DNI de Diego"
                className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-bone outline-none focus:border-rust"
              />
            </label>

            <label className="block">
              <span className="label-track text-muted">Tipo</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-bone outline-none focus:border-rust"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label-track text-rust">Fecha de caducidad</span>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="mt-2 w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-bone outline-none focus:border-rust"
              />
              {status && (
                <span
                  className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${status.pill}`}
                >
                  {formatExpiryDate(expiry)} · {status.label}
                </span>
              )}
            </label>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={step === "saving" || !expiry}
                className="label-track flex-1 rounded-full bg-rust px-6 py-3.5 text-bone transition hover:bg-rust-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === "saving" ? "Guardando…" : "Guardar documento"}
              </button>
              <button
                onClick={onClose}
                className="label-track rounded-full border border-line px-6 py-3.5 text-muted transition hover:text-bone"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) handleFile(selected);
          }}
        />
      </div>
    </div>
  );
}
