"use client";

import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavegacionMovil, NavegacionEscritorio } from "@/components/Navegacion";

/**
 * Esqueleto de la parte con sesión iniciada.
 *
 *   Escritorio  columna lateral fija a la izquierda, contenido a la derecha.
 *   Móvil       barra mínima arriba (marca y tema) y navegación abajo.
 *
 * La barra de arriba en móvil es deliberadamente pobre: en un teléfono la
 * pantalla es corta, y cada píxel gastado en cromo es un documento menos que
 * se ve sin desplazar. Lo que se toca a menudo está abajo.
 */
export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <NavegacionEscritorio email={email} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hairline-b sticky top-0 z-20 flex items-center justify-between bg-background/90 px-5 py-2.5 backdrop-blur md:hidden">
          <Wordmark />
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <NavegacionMovil />
    </div>
  );
}
