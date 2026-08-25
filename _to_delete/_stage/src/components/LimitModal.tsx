"use client";

export function LimitModal({
  limit,
  onClose,
}: {
  limit: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overlay-scrim p-6 backdrop-blur-sm">
      <div className="card-surface w-full max-w-sm p-6 text-center">
        <p className="heading-meta text-brand-600">Plan gratuito</p>

        <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
          Límite alcanzado ({limit}/{limit})
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-light">
          El plan gratuito guarda hasta {limit} documentos. Borrá uno que ya no
          uses para hacer sitio.
        </p>

        <button onClick={onClose} className="btn-primary mt-6 w-full px-4 py-2 text-sm">
          Entendido
        </button>
      </div>
    </div>
  );
}
