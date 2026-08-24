export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold tracking-tight">
        Spiderjad
        <span className="text-rust">.</span>
      </span>
      {!compact && (
        <span className="label-track text-muted">Docs</span>
      )}
    </div>
  );
}
