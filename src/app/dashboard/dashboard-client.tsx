"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DocumentCard } from "@/components/DocumentCard";
import { UploadDialog } from "@/components/UploadDialog";
import { LimitModal } from "@/components/LimitModal";
import { getExpiryStatus } from "@/lib/expiry";
import type { DocumentWithUrl } from "@/lib/types";

export function DashboardClient({
  email,
  initialDocuments,
  limit,
  loadError,
}: {
  email: string;
  initialDocuments: DocumentWithUrl[];
  limit: number;
  loadError: string | null;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

  /**
   * Ids borrados desde aquí y que el servidor todavía no sabe que no están.
   *
   * Antes la lista vivía en un useState(initialDocuments), y eso era el bug
   * por el que subir un documento no lo mostraba: useState solo mira su valor
   * inicial la primera vez. router.refresh() volvía a pedir los datos al
   * servidor y llegaban bien, pero el estado ya estaba fijado y los ignoraba.
   * Solo aparecía recargando la página a mano.
   *
   * Ahora la lista SIEMPRE es la del servidor. Lo único que guardamos es qué
   * hemos borrado, para que la tarjeta desaparezca al instante sin esperar a
   * la respuesta. Cuando el servidor confirma, el documento ya no viene en la
   * lista y el id sobrante no molesta.
   */
  const [borrando, setBorrando] = useState<ReadonlySet<string>>(new Set());

  const documents = useMemo(
    () => initialDocuments.filter((d) => !borrando.has(d.id)),
    [initialDocuments, borrando],
  );

  const used = documents.length;
  const atLimit = used >= limit;

  const summary = useMemo(() => {
    const now = new Date();
    let red = 0;
    let amber = 0;
    for (const doc of documents) {
      const level = getExpiryStatus(doc.expiry_date, now).level;
      if (level === "expired" || level === "critical") red += 1;
      else if (level === "warning") amber += 1;
    }
    return { red, amber };
  }, [documents]);

  function handleAdd() {
    if (atLimit) setLimitOpen(true);
    else setUploadOpen(true);
  }

  async function handleDelete(id: string) {
    setBorrando((ids) => new Set(ids).add(id));

    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });

    if (!res.ok) {
      // No se pudo borrar: la tarjeta vuelve.
      setBorrando((ids) => {
        const siguiente = new Set(ids);
        siguiente.delete(id);
        return siguiente;
      });
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="hairline-b sticky top-0 z-20 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Wordmark />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-fg-lighter sm:inline">
              {email}
            </span>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-default px-2.5 py-1 text-xs">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 pb-28">
        <section className="card-surface">
          <div className="hairline-b flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <p className="heading-meta text-fg-lighter">Tus documentos</p>
            <div className="flex items-center gap-4 text-xs">
              <Stat value={summary.red} label="Urgentes" tone="text-destructive" />
              <Stat value={summary.amber} label="Renovar ya" tone="text-warning" />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 p-4">
            <div>
              <p className="font-heading text-3xl font-medium tabular-nums text-foreground">
                {used}
                <span className="text-xl text-fg-lighter">/{limit}</span>
              </p>
              <p className="mt-1 text-sm text-fg-light">
                {atLimit
                  ? "Plan gratuito completo."
                  : `Te quedan ${limit - used} en el plan gratuito.`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              + Añadir documento
            </button>
          </div>
        </section>

        {loadError && (
          <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            No se pudieron cargar los documentos: {loadError}
          </p>
        )}

        <section className="mt-6">
          {documents.length === 0 ? (
            <EmptyState onAdd={handleAdd} />
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={() => handleDelete(doc.id)}
                  onChanged={() => router.refresh()}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            setUploadOpen(false);
            router.refresh();
          }}
          onLimitReached={() => {
            setUploadOpen(false);
            setLimitOpen(true);
          }}
        />
      )}

      {limitOpen && (
        <LimitModal limit={limit} onClose={() => setLimitOpen(false)} />
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-medium tabular-nums ${tone}`}>{value}</span>
      <span className="heading-meta text-fg-lighter">{label}</span>
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="card-surface px-6 py-14 text-center">
      <p className="heading-meta text-brand-600">Todavía nada por aquí</p>
      <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">
        Empezá por el que más te preocupa
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-light">
        Sacá una foto del DNI, el pasaporte o el carnet de conducir. Leemos la
        fecha de caducidad por vos.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="btn-primary mt-6 px-4 py-2 text-sm"
      >
        Subir el primero
      </button>
    </div>
  );
}
