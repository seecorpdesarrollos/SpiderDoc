/**
 * Pie de página con la versión del build que se está sirviendo.
 *
 * No es decorativo. Cuando probás en el móvil y algo no cambia, la primera
 * pregunta siempre es «¿estoy viendo el despliegue nuevo o el navegador me
 * está dando uno viejo?». Con el commit a la vista se responde en un segundo
 * en vez de en media hora.
 */
export function Footer() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const commit = process.env.NEXT_PUBLIC_APP_COMMIT ?? "local";

  return (
    <footer className="hairline-t mt-auto">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-fg-lighter">
        <span>Spiderjad SL</span>
        <span className="font-mono tabular-nums">
          v{version} · {commit}
        </span>
      </div>
    </footer>
  );
}
