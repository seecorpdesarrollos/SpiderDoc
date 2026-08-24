"use client";

export function LimitModal({
  limit,
  onClose,
}: {
  limit: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-7 text-center">
        <p className="label-track text-rust">Plan gratuito</p>
        <div className="rule-accent mx-auto mt-3 mb-6 w-10" />

        <h2 className="text-2xl font-bold tracking-tight">
          Límite alcanzado ({limit}/{limit})
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          El plan gratuito guarda hasta {limit} documentos. Borrá uno que ya no
          uses para hacer sitio.
        </p>

        <button
          onClick={onClose}
          className="label-track mt-7 w-full rounded-full bg-rust px-6 py-3.5 text-bone transition hover:bg-rust-soft"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
