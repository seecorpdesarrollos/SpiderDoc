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
          setScanNote("Revisá la fecha: la lectura no fue del todo nítida.");
        }
      } else {
        setScanNote(
          body.error ?? "No pudimos leer la fecha. Escribila a mano y listo.",
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="card-surface max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-b-none sm:rounded-lg">
        <div className="hairline-b flex items-center justify-between px-4 py-3">
          <p className="heading-meta text-fg-lighter">Nuevo documento</p>
          <button
            onClick={onClose}
            className="focus-ring rounded px-1 text-lg leading-none text-fg-lighter transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {step === "pick" && (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="focus-ring w-full rounded-lg border border-dashed px-6 py-12 text-center transition-colors hover:border-brand"
                style={{ borderColor: "var(--border-control)" }}
              >
                <p className="font-heading text-base font-semibold text-foreground">
                  Elegí una foto o PDF
                </p>
                <p className="mt-1.5 text-sm text-fg-light">
                  JPG, PNG, WEBP o PDF. Hasta 8 MB.
                </p>
              </button>

              <p className="mt-4 text-center text-xs leading-relaxed text-fg-lighter">
                Leemos la fecha de caducidad automáticamente. Vos la confirmás
                antes de guardar.
              </p>

              <button
                type="button"
                onClick={() => {
                  setStep("review");
                  setScanNote("Alta manual: escribí los datos del documento.");
                }}
                className="focus-ring mt-3 w-full rounded text-center text-sm text-fg-lighter underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Prefiero escribirlo a mano
              </button>
            </>
          )}

          {step === "scanning" && (
            <div className="flex flex-col items-center py-14 text-center">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-brand"
                style={{ borderColor: "var(--border-control)", borderTopColor: "var(--color-brand)" }}
              />
              <p className="mt-5 font-heading text-base font-semibold text-foreground">
                Leyendo el documento…
              </p>
              <p className="mt-1.5 text-sm text-fg-light">
                Buscando la fecha de caducidad. Tarda unos segundos.
              </p>
            </div>
          )}

          {(step === "review" || step === "saving") && (
            <div className="space-y-4">
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt="Vista previa del documento"
                  className="hairline max-h-40 w-full rounded-md object-contain"
                  style={{ backgroundColor: "var(--field)" }}
                />
              )}

              {scanNote && (
                <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                  {scanNote}
                </p>
              )}

              <label className="block">
                <span className="heading-meta text-fg-lighter">Nombre</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="DNI de Diego"
                  className="input-field mt-1.5"
                />
              </label>

              <label className="block">
                <span className="heading-meta text-fg-lighter">Tipo</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="input-field mt-1.5"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="heading-meta text-brand">
                  Fecha de caducidad
                </span>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="input-field mt-1.5"
                />
                {status && (
                  <span
                    className={`mt-2 inline-block rounded-md border px-2 py-1 text-xs font-medium ${status.pill}`}
                  >
                    {formatExpiryDate(expiry)} · {status.label}
                  </span>
                )}
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={step === "saving" || !expiry}
                  className="btn-primary flex-1 px-4 py-2 text-sm"
                >
                  {step === "saving" ? "Guardando…" : "Guardar documento"}
                </button>
                <button onClick={onClose} className="btn-default px-4 py-2 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

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
