"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "spiderjad-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  // Empieza en null hasta que monta: el servidor no sabe qué tema tiene el
  // usuario, así que pintar un icono concreto en SSR daría un desajuste de
  // hidratación. El script del layout ya evita el parpadeo del fondo.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      // Modo privado o cookies bloqueadas: seguimos con el del sistema.
    }
    setTheme(stored ?? "system");
  }, []);

  function toggle() {
    const isDark =
      theme === "dark" || (theme === "system" && systemPrefersDark());
    const next: Theme = isDark ? "light" : "dark";

    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Si no se puede guardar, el cambio vale para esta pestaña y ya.
    }
  }

  const label = theme === null ? "Cambiar tema" : "Cambiar a tema claro u oscuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="btn-default h-7 w-7 shrink-0 p-0"
    >
      {/* Sol y luna, uno visible por tema vía CSS: así el icono es correcto
          desde el primer pintado aunque React todavía no sepa el tema. */}
      <svg
        viewBox="0 0 24 24"
        className="hidden h-3.5 w-3.5 dark-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 light-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
