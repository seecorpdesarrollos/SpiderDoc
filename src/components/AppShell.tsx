"use client";

import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  NavegacionMovil,
  NavegacionEscritorio,
  Contadores,
} from "@/components/Navegacion";
import {
  useTirarParaRecargar,
  IndicadorRecarga,
} from "@/components/TirarParaRecargar";

export type Resumen = { rojos: number; ambar: number };

/**
 * Esqueleto de la parte con sesión iniciada.
 *
 *   Escritorio  barra superior a todo el ancho, y debajo columna lateral y
 *               contenido. La barra va por encima de la columna, no al lado:
 *               así el estado y la acción principal quedan en el mismo sitio
 *               siempre, en cualquier pantalla de la app.
 *   Móvil       barra mínima arriba y navegación abajo, donde llega el pulgar.
 *
 * La barra de arriba en móvil es deliberadamente pobre: la pantalla es corta y
 * cada píxel de cromo es un documento menos visible sin desplazar.
 */
export function AppShell({
  email,
  resumen,
  acciones,
  children,
}: {
  email: string;
  /** Cuántos documentos piden atención. Solo lo pasa el panel. */
  resumen?: Resumen;
  /** Lo que va a la derecha de la barra superior: el botón de añadir, el
   *  contador del plan. Cada pantalla pone lo suyo, o nada. */
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tirar = useTirarParaRecargar();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ---- Barra superior, solo escritorio ---- */}
      <header className="hairline-b sticky top-0 z-30 hidden bg-background/95 backdrop-blur md:block">
        <div className="flex items-center justify-between gap-6 px-5 py-3">
          <div className="flex items-center gap-6">
            <Wordmark />
            {resumen && <Contadores resumen={resumen} />}
          </div>
          <div className="flex items-center gap-4">
            {acciones}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <NavegacionEscritorio email={email} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="hairline-b sticky top-0 z-20 flex items-center justify-between gap-3 bg-background/90 px-5 py-2.5 backdrop-blur md:hidden">
            <Wordmark />
            <div className="flex items-center gap-3">
              {resumen && <Contadores resumen={resumen} />}
              <ThemeToggle />
            </div>
          </header>

          {/* El contenido baja con el dedo. Esto es lo que hace que el gesto
              se entienda: sin ello el indicador parece un elemento suelto que
              apareció por su cuenta. */}
          <div className="relative flex-1">
            <IndicadorRecarga {...tirar} />
            <main
              className="h-full"
              style={{
                transform: `translate3d(0, ${tirar.desplazamiento}px, 0)`,
                transition: tirar.recargando
                  ? "transform 260ms cubic-bezier(0.16,1,0.3,1)"
                  : tirar.activo
                    ? "none"
                    : "transform 320ms cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </div>

      <NavegacionMovil />
    </div>
  );
}
