"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLinkStatus } from "next/link";

/**
 * Navegación de la aplicación.
 *
 * En móvil va ABAJO, como en las apps nativas, y no arriba. No es una moda:
 * en un teléfono de hoy la parte alta de la pantalla no se alcanza con el
 * pulgar sin recolocar la mano. Lo que se usa a menudo va donde llega el dedo.
 *
 * En escritorio esa misma barra abajo quedaría ridícula, así que ahí pasa a
 * ser una columna lateral. Son el mismo componente y la misma lista de
 * destinos; solo cambia la forma según el ancho.
 *
 * El área táctil de cada botón supera los 44 px, que es el mínimo por debajo
 * del cual se empiezan a fallar los toques.
 */

const DESTINOS = [
  {
    href: "/dashboard",
    etiqueta: "Documentos",
    icono: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    href: "/ajustes",
    etiqueta: "Ajustes",
    // Controles deslizantes, no el engranaje clásico: el engranaje que había
    // era un círculo con rayos y se leía igual que el sol del botón de tema.
    // Dos iconos idénticos con significados distintos, uno al lado del otro.
    icono: (
      <>
        <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h10M18 17h2" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="16" cy="17" r="2" />
      </>
    ),
  },
];

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/**
 * Señal de que el toque SÍ entró.
 *
 * Estas páginas se generan en el servidor y tardan. Sin una respuesta
 * inmediata, tocás y no pasa nada durante segundos: parece que la app se ha
 * colgado y volvés a tocar. useLinkStatus sabe si la navegación está en curso
 * y lo dice sin esperar a que llegue nada.
 */
function Pendiente() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-brand/25"
      aria-hidden
    >
      <span className="block h-full w-1/3 animate-[barrido_900ms_ease-in-out_infinite] bg-brand" />
    </span>
  );
}

/**
 * Cuántos documentos piden atención.
 *
 * Estaba dentro del panel, así que en cuanto bajabas un poco dejaba de verse.
 * Aquí vive en la navegación: siempre visible, en las dos pantallas. Es el
 * dato por el que uno abre esta app.
 */
export function Contadores({
  resumen,
}: {
  resumen: { rojos: number; ambar: number };
}) {
  const nada = resumen.rojos === 0 && resumen.ambar === 0;

  if (nada) {
    return (
      <span className="text-xs text-fg-lighter">Todo en regla</span>
    );
  }

  return (
    <span className="flex items-center gap-3 text-xs">
      {resumen.rojos > 0 && (
        <span className="flex items-baseline gap-1.5">
          <span className="font-medium tabular-nums text-destructive">
            {resumen.rojos}
          </span>
          <span className="text-fg-lighter">urgentes</span>
        </span>
      )}
      {resumen.ambar > 0 && (
        <span className="flex items-baseline gap-1.5">
          <span className="font-medium tabular-nums text-warning">
            {resumen.ambar}
          </span>
          <span className="text-fg-lighter">a renovar</span>
        </span>
      )}
    </span>
  );
}

export function NavegacionMovil() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      /* Barra flotante y redondeada, como las apps de iOS de ahora, en vez de
         una franja pegada al borde inferior.
 
         No es solo estética: al despegarse del borde, el contenido se ve
         correr por debajo y la app deja de parecer dos bloques apilados.
 
         pb con safe-area-inset-bottom: en los iPhone sin botón de inicio hay
         una franja de gestos abajo. Sin ese hueco, la barra se le monta encima
         y el último milímetro no responde al dedo. */
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-xs gap-1 rounded-[22px] border border-black/5 bg-surface-100/85 p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
        {DESTINOS.map((destino) => {
          const activo = pathname.startsWith(destino.href);
          return (
            <li key={destino.href} className="flex-1">
              <Link
                href={destino.href}
                aria-current={activo ? "page" : undefined}
                /* min-h 48: por debajo de 44 se empiezan a fallar los toques,
                   y aquí hay margen porque el dedo llega en diagonal. */
                className={`focus-ring relative flex min-h-12 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[16px] text-[11px] font-medium transition-colors ${
                  activo
                    ? "bg-brand/12 text-brand-600"
                    : "text-fg-lighter active:bg-surface-200"
                }`}
              >
                <Pendiente />
                <Icono>{destino.icono}</Icono>
                {destino.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function NavegacionEscritorio({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="hairline-r hidden w-60 shrink-0 flex-col bg-surface-100 md:flex">
      <nav aria-label="Navegación principal" className="flex-1 px-3 pt-4">
        <ul className="space-y-1">
          {DESTINOS.map((destino) => {
            const activo = pathname.startsWith(destino.href);
            return (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  aria-current={activo ? "page" : undefined}
                  className={`focus-ring relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activo
                      ? "bg-brand/10 text-brand-600"
                      : "text-fg-light hover:bg-surface-200 hover:text-foreground"
                  }`}
                >
                  <Pendiente />
                  <Icono>{destino.icono}</Icono>
                  {destino.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hairline-t px-5 py-4">
        <p className="truncate text-xs text-fg-lighter" title={email}>
          {email}
        </p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button type="submit" className="btn-default w-full px-3 py-1.5 text-xs">
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
