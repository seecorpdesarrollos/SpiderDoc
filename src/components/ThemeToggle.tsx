"use client";

import { useEffect, useState } from "react";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  parseTheme,
  type Theme,
} from "@/lib/theme";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * La cookie la escribe el cliente, pero la lee el servidor en el layout. Por
 * eso no vale un `document.cookie` cualquiera: sin `path=/` solo valdría para
 * la ruta actual, y sin `max-age` se borraría al cerrar el navegador.
 *
 * SameSite=Lax es suficiente: no es una cookie de sesión ni de autenticación,
 * es una preferencia visual. No lleva `Secure` a propósito, para que siga
 * funcionando cuando abrís la app por la IP local desde el móvil, que es http.
 */
function saveTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ThemeToggle() {
  // El servidor ya escribió data-theme en el <html> si había cookie, así que
  // aquí solo hay que leerlo del DOM. No hay desajuste de hidratación posible:
  // se lee justo lo que el servidor puso.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(parseTheme(document.documentElement.getAttribute("data-theme")) ?? null);
  }, []);

  function toggle() {
    // Sin elección previa, el punto de partida es lo que diga el sistema.
    const isDark = theme ? theme === "dark" : systemPrefersDark();
    const next: Theme = isDark ? "light" : "dark";

    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    saveTheme(next);
  }

  const label = "Cambiar a tema claro u oscuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      // 44px en móvil: 28 es la mitad del mínimo táctil y se falla el toque.
      // En pantallas grandes vuelve al tamaño compacto del resto del header.
      className="btn-default h-11 w-11 shrink-0 touch-manipulation p-0 sm:h-7 sm:w-7"
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
