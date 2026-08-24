export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        Spiderjad
        <span className="text-brand">.</span>
      </span>
      {!compact && <span className="heading-meta text-fg-lighter">Docs</span>}
    </div>
  );
}
