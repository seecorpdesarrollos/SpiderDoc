/**
 * Preferencia de cómo mostrar las caducidades.
 *
 * Va en una COOKIE, no en localStorage, por el mismo motivo que el tema: el
 * panel se pinta en el servidor, así que si la preferencia solo viviera en el
 * navegador la lista aparecería primero con el formato por defecto y cambiaría
 * un instante después. Con cookie sale bien desde el primer pintado.
 *
 * Y no va en la base de datos: la antelación de los avisos sí, porque la lee
 * el cron y tiene que valer en cualquier dispositivo, pero cómo prefiere uno
 * LEER una fecha no le importa a nadie más que a este navegador.
 */

export type FormatoCaducidad = "relativo" | "fecha" | "ambos";

export const COOKIE_FORMATO = "spiderjad-formato";
export const COOKIE_FORMATO_MAX_AGE = 60 * 60 * 24 * 365;

export const FORMATOS: {
  valor: FormatoCaducidad;
  etiqueta: string;
  ejemplo: string;
}[] = [
  {
    valor: "ambos",
    etiqueta: "Las dos cosas",
    ejemplo: "31 de enero de 2029 · Caduca en 2 años y 5 meses",
  },
  {
    valor: "relativo",
    etiqueta: "Cuánto queda",
    ejemplo: "Caduca en 2 años y 5 meses",
  },
  {
    valor: "fecha",
    etiqueta: "La fecha exacta",
    ejemplo: "31 de enero de 2029 · Vigente",
  },
];

export function parseFormato(valor: string | undefined | null): FormatoCaducidad {
  return valor === "relativo" || valor === "fecha" ? valor : "ambos";
}

export function guardarFormato(formato: FormatoCaducidad) {
  document.cookie = `${COOKIE_FORMATO}=${formato}; path=/; max-age=${COOKIE_FORMATO_MAX_AGE}; SameSite=Lax`;
}
