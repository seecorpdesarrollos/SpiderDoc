"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    icono: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
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

export function NavegacionMovil() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      /* pb-[env(safe-area-inset-bottom)]: en los iPhone sin botón de inicio
         hay una franja de gestos abajo. Sin esto, la barra queda debajo de
         ella y el último milímetro no se puede tocar. */
      className="hairline-t fixed inset-x-0 bottom-0 z-30 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {DESTINOS.map((destino) => {
          const activo = pathname.startsWith(destino.href);
          return (
            <li key={destino.href} className="flex-1">
              <Link
                href={destino.href}
                aria-current={activo ? "page" : undefined}
                className={`focus-ring flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  activo ? "text-brand-600" : "text-fg-lighter"
                }`}
              >
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
    <aside className="hairline-r sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-surface-100 md:flex">
      <div className="flex items-center justify-between px-5 py-4">
        <Wordmark />
        <ThemeToggle />
      </div>

      <nav aria-label="Navegación principal" className="flex-1 px-3">
        <ul className="space-y-1">
          {DESTINOS.map((destino) => {
            const activo = pathname.startsWith(destino.href);
            return (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  aria-current={activo ? "page" : undefined}
                  className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    activo
                      ? "bg-brand/10 text-brand-600"
                      : "text-fg-light hover:bg-surface-200 hover:text-foreground"
                  }`}
                >
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
