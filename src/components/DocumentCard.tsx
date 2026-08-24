"use client";

import { useState } from "react";
import { getExpiryStatus, formatExpiryDate } from "@/lib/expiry";
import { documentTypeLabel, DOCUMENT_TYPES } from "@/lib/constants";
import type { DocumentWithUrl } from "@/lib/types";

export function DocumentCard({
  document,
  onDelete,
  onChanged,
}: {
  document: DocumentWithUrl;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
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
    <li className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex">
        {/* Barra del semáforo */}
        <div className={`w-1.5 shrink-0 ${status.bar}`} aria-hidden />

        <div className="flex-1 p-5">
          {editing ? (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-bone outline-none focus:border-rust"
                placeholder="Nombre del documento"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-bone outline-none focus:border-rust"
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
                  className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-bone outline-none focus:border-rust"
                />
              </div>
              {error && <p className="text-sm text-red-300">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="label-track rounded-full bg-rust px-5 py-2 text-bone transition hover:bg-rust-soft disabled:opacity-50"
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
                  className="label-track rounded-full border border-line px-5 py-2 text-muted transition hover:text-bone"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-track text-muted">
                    {documentTypeLabel(document.document_type)}
                  </p>
                  <h3 className="mt-1.5 truncate text-lg font-semibold">
                    {document.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {formatExpiryDate(document.expiry_date)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${status.pill}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                {document.signed_url && (
                  <a
                    href={document.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rust-soft underline underline-offset-4"
                  >
                    Ver archivo
                  </a>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted underline underline-offset-4 transition hover:text-bone"
                >
                  Editar
                </button>
                {confirmingDelete ? (
                  <span className="flex items-center gap-3">
                    <span className="text-muted">¿Seguro?</span>
                    <button
                      onClick={onDelete}
                      className="font-semibold text-red-400 underline underline-offset-4"
                    >
                      Sí, borrar
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      className="text-muted underline underline-offset-4"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="text-muted underline underline-offset-4 transition hover:text-red-400"
                  >
                    Borrar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
