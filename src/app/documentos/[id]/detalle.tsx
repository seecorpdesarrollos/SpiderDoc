"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  getExpiryStatus,
  formatExpiryDate,
  estadoCorto,
  etiquetaEnDias,
} from "@/lib/expiry";
import { documentTypeLabel, DOCUMENT_TYPES } from "@/lib/constants";
import { urgenciaTramite, type Ventana } from "@/lib/ventanas";
import type { FormatoCaducidad } from "@/lib/preferencias";
import type { DocumentWithUrl } from "@/lib/types";

/**
 * Ficha de un documento.
 *
 * Existe porque es el destino natural de un aviso: abrís el correo que dice
 * que el pasaporte caduca y aterrizás en el pasaporte, con la foto delante y
 * el plazo del consulado escrito. En el panel había que buscarlo en una lista.
 *
 * Aquí la imagen se ve en grande y directamente, sin visor emergente: en esta
 * pantalla el documento ES el contenido, no un anexo.
 */
export function DocumentoDetalle({
  email,
  documento,
  antelacion,
  ventana,
  formato,
}: {
  email: string;
  documento: DocumentWithUrl;
  antelacion: number;
  ventana: Ventana | null;
  formato: FormatoCaducidad;
}) {
  const router = useRouter();

  const [editando, setEditando] = useState(false);
  const [title, setTitle] = useState(documento.title);
  const [expiry, setExpiry] = useState(documento.expiry_date);
  const [docType, setDocType] = useState(documento.document_type);
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoImagen, setCargandoImagen] = useState(true);

  const status = getExpiryStatus(documento.expiry_date, new Date(), antelacion);
  const urgencia = urgenciaTramite(ventana, status.daysRemaining);
  const esPdf = /\.pdf(\?|$)/i.test(documento.signed_url ?? "");

  const etiqueta =
    formato === "fecha"
      ? estadoCorto(status.level)
      : formato === "dias"
        ? etiquetaEnDias(status.daysRemaining)
        : status.label;

  async function guardar() {
    setGuardando(true);
    setError(null);

    const res = await fetch(`/api/documents/${documento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        expiry_date: expiry,
        document_type: docType,
      }),
    });

    setGuardando(false);

    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      setError(cuerpo.error ?? "No se pudo guardar.");
      return;
    }

    setEditando(false);
    router.refresh();
  }

  async function borrar() {
    const res = await fetch(`/api/documents/${documento.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("No se pudo borrar.");
      return;
    }
    // replace y no push: el documento ya no existe, no tiene sentido que el
    // botón de atrás vuelva a una ficha vacía.
    router.replace("/dashboard");
  }

  return (
    <AppShell email={email}>
      <div className="mx-auto w-full max-w-3xl px-6 py-6 pb-28">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md text-sm text-fg-light transition-colors hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Todos los documentos
        </Link>

        {/* ---- Encabezado ---- */}
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="heading-meta text-fg-lighter">
              {documentTypeLabel(documento.document_type)}
              {documento.issuing_country ? ` · ${documento.issuing_country}` : ""}
            </p>
            <h1 className="mt-2 font-heading text-2xl font-medium tracking-tight text-foreground">
              {documento.title}
            </h1>
            {formato !== "relativo" && (
              <p className="mt-1 text-sm text-fg-light">
                Caduca el {formatExpiryDate(documento.expiry_date)}
              </p>
            )}
          </div>

          <span
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${status.pill}`}
          >
            {etiqueta}
          </span>
        </div>

        {/* ---- El plazo del trámite ---- */}
        {urgencia && (
          <p
            className={`mt-5 flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed ${
              urgencia.tipo === "tarde"
                ? "border-destructive/30 bg-destructive/8 text-destructive"
                : "border-warning/30 bg-warning/8 text-warning"
            }`}
          >
            <span aria-hidden>{urgencia.tipo === "tarde" ? "⚠" : "!"}</span>
            <span>
              <strong className="font-semibold">
                {urgencia.tipo === "tarde" ? "Vas tarde." : "Vas justo."}
              </strong>{" "}
              El trámite tarda unos {urgencia.diasTramite} días y quedan{" "}
              {urgencia.diasRestantes}.
              {ventana?.nota ? ` ${ventana.nota}` : ""}
            </span>
          </p>
        )}

        {/* Cuando no hay urgencia pero sí sabemos algo del trámite, se cuenta
            igual: es la información por la que alguien usaría esta app en vez
            de una nota en el móvil. */}
        {!urgencia && ventana?.nota && (
          <p className="mt-5 border-l-2 border-border pl-3 text-sm leading-relaxed text-fg-light">
            {ventana.nota}
          </p>
        )}

        {/* ---- El documento ---- */}
        {documento.signed_url ? (
          <div className="card-surface mt-6 overflow-hidden">
            {esPdf ? (
              <iframe
                src={documento.signed_url}
                title={documento.title}
                className="h-[70vh] w-full bg-white"
              />
            ) : (
              <div className="relative flex min-h-48 items-center justify-center bg-surface-200">
                {cargandoImagen && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span
                      className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-fg-light"
                      aria-hidden
                    />
                    <p className="text-xs text-fg-lighter">Cargando el archivo…</p>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={documento.signed_url}
                  alt={documento.title}
                  onLoad={() => setCargandoImagen(false)}
                  onError={() => setCargandoImagen(false)}
                  className={`max-h-[70vh] w-full object-contain transition-opacity duration-300 ${
                    cargandoImagen ? "opacity-0" : "opacity-100"
                  }`}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="card-surface mt-6 px-4 py-8 text-center text-sm text-fg-lighter">
            Este documento no tiene ningún archivo guardado.
          </p>
        )}

        {/* ---- Acciones ---- */}
        {editando ? (
          <div className="card-surface mt-4 space-y-3 p-4">
            <label className="block">
              <span className="heading-meta text-fg-lighter">Nombre</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field mt-2"
              />
            </label>

            <label className="block">
              <span className="heading-meta text-fg-lighter">Tipo</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="input-field mt-2"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="heading-meta text-fg-lighter">Caduca el</span>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="input-field mt-2"
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="btn-primary px-4 py-2 text-sm"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setTitle(documento.title);
                  setExpiry(documento.expiry_date);
                  setDocType(documento.document_type);
                  setError(null);
                }}
                className="btn-default px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="focus-ring rounded text-fg-light underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Editar
            </button>

            {confirmando ? (
              <span className="flex items-center gap-3">
                <span className="text-fg-lighter">¿Seguro?</span>
                <button
                  type="button"
                  onClick={borrar}
                  className="focus-ring rounded font-medium text-destructive underline underline-offset-4"
                >
                  Sí, borrar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="focus-ring rounded text-fg-lighter underline underline-offset-4"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="focus-ring rounded text-fg-lighter underline underline-offset-4 transition-colors hover:text-destructive"
              >
                Borrar
              </button>
            )}

            {error && <span className="text-destructive">{error}</span>}
          </div>
        )}

        {ventana && !ventana.verificado && (
          <p className="mt-8 text-xs leading-relaxed text-fg-lighter">
            Los plazos de trámite que mostramos son orientativos y todavía no
            están confirmados en fuente oficial. Comprobalos en la web del
            organismo antes de organizarte.
          </p>
        )}
      </div>
    </AppShell>
  );
}
