"use client";

import { useState } from "react";
import {
  getExpiryStatus,
  formatExpiryDate,
  estadoCorto,
  etiquetaEnDias,
} from "@/lib/expiry";
import type { FormatoCaducidad } from "@/lib/preferencias";
import { documentTypeLabel, DOCUMENT_TYPES } from "@/lib/constants";
import type { DocumentWithUrl } from "@/lib/types";
import { VisorArchivo } from "@/components/VisorArchivo";

export function DocumentCard({
  document,
  onDelete,
  onChanged,
  indice = 0,
  formato = "ambos",
}: {
  document: DocumentWithUrl;
  onDelete: () => void;
  onChanged: () => void;
  /** Posición en la lista, para escalonar la entrada. */
  indice?: number;
  /** Cómo mostrar la caducidad. Ver src/lib/preferencias.ts */
  formato?: FormatoCaducidad;
}) {
  const [editing, setEditing] = useState(false);
  const [viendoArchivo, setViendoArchivo] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [expiry, setExpiry] = useState(document.expiry_date);
  const [docType, setDocType] = useState(document.document_type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = getExpiryStatus(document.expiry_date);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        expiry_date: expiry,
        document_type: docType,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo guardar.");
      return;
    }
    setEditing(false);
    onChanged();
  }

  return (
    <li
      className="card-surface entrada-lista"
      style={{ "--i": indice } as React.CSSProperties}
    >
      <div className="flex">
        <div className={`w-0.5 shrink-0 ${status.bar}`} aria-hidden />

        <div className="flex-1 p-4">
          {editing ? (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Nombre del documento"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="input-field w-auto"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setTitle(document.title);
                    setExpiry(document.expiry_date);
                    setDocType(document.document_type);
                    setError(null);
                  }}
                  className="btn-default px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="heading-meta text-fg-lighter">
                    {documentTypeLabel(document.document_type)}
                  </p>
                  <h3 className="mt-1.5 truncate font-heading text-base font-semibold text-foreground">
                    {document.title}
                  </h3>
                  {formato !== "relativo" && (
                    <p className="mt-0.5 text-sm text-fg-light">
                      {formatExpiryDate(document.expiry_date)}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap ${status.pill}`}
                >
                  {formato === "fecha"
                    ? estadoCorto(status.level)
                    : formato === "dias"
                      ? etiquetaEnDias(status.daysRemaining)
                      : status.label}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {document.signed_url && (
                  <button
                    type="button"
                    onClick={() => setViendoArchivo(true)}
                    className="focus-ring rounded text-brand-600 underline underline-offset-4"
                  >
                    Ver archivo
                  </button>
                )}
                <button
                  onClick={() => {
                    // Los campos se rellenan al ABRIR el editor, no al montar
                    // la tarjeta. Si no, después de guardar y refrescar, el
                    // formulario seguiría mostrando lo que había al principio.
                    setTitle(document.title);
                    setExpiry(document.expiry_date);
                    setDocType(document.document_type);
                    setError(null);
                    setEditing(true);
                  }}
                  className="focus-ring rounded text-fg-lighter underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Editar
                </button>
                {confirmingDelete ? (
                  <span className="flex items-center gap-2.5">
                    <span className="text-fg-lighter">¿Seguro?</span>
                    <button
                      onClick={onDelete}
                      className="focus-ring rounded font-medium text-destructive underline underline-offset-4"
                    >
                      Sí, borrar
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="focus-ring rounded text-fg-lighter underline underline-offset-4"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="focus-ring rounded text-fg-lighter underline underline-offset-4 transition-colors hover:text-destructive"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {viendoArchivo && document.signed_url && (
        <VisorArchivo
          url={document.signed_url}
          titulo={document.title}
          onCerrar={() => setViendoArchivo(false)}
        />
      )}
    </li>
  );
}
