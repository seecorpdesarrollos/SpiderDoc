"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
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
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);

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
    const previous = documents;
    setDocuments((docs) => docs.filter((d) => d.id !== id));

    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDocuments(previous);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-28">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-muted sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="label-track rounded-full border border-line px-4 py-2 text-muted transition hover:border-rust hover:text-rust-soft"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="mt-12">
        <p className="label-track text-rust">Tus documentos</p>
        <div className="rule-thick mt-3 mb-6 w-full" />

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-5xl font-bold tracking-tight">
              {used}
              <span className="text-2xl text-muted">/{limit}</span>
            </p>
            <p className="mt-2 text-sm text-muted">
              {atLimit
                ? "Plan gratuito completo."
                : `Te quedan ${limit - used} en el plan gratuito.`}
            </p>
          </div>

          <div className="flex gap-6">
            <Stat value={summary.red} label="Urgentes" tone="text-red-400" />
            <Stat value={summary.amber} label="Próximos" tone="text-amber-300" />
          </div>
        </div>
      </section>

      {loadError && (
        <p className="mt-6 rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudieron cargar los documentos: {loadError}
        </p>
      )}

      <section className="mt-10">
        {documents.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <ul className="space-y-3">
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

      {/* Botón flotante de alta */}
      <button
        type="button"
        onClick={handleAdd}
        className="label-track fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-rust px-8 py-4 text-bone shadow-2xl shadow-black/50 transition hover:bg-rust-soft"
      >
        + Añadir documento
      </button>

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
    <div className="text-right">
      <p className={`text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="label-track mt-1 text-muted">{label}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface/50 px-8 py-16 text-center">
      <p className="label-track text-rust">Todavía nada por aquí</p>
      <h2 className="mt-4 text-2xl font-semibold">
        Empezá por el que más te preocupa
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Sacá una foto del DNI, el pasaporte o el carnet de conducir. Leemos la
        fecha de caducidad por vos.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="label-track mt-8 rounded-full border border-rust px-7 py-3.5 text-rust-soft transition hover:bg-rust hover:text-bone"
      >
        Subir el primero
      </button>
    </div>
  );
}
