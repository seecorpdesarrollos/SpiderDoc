/**
 * Tema claro/oscuro sin fogonazo y sin JavaScript bloqueante.
 *
 * La preferencia va en una COOKIE, no en localStorage, y esa es toda la
 * gracia: el layout es un Server Component, así que lee la cookie y escribe
 * `data-theme` directamente en el <html> que sale del servidor. El navegador
 * recibe el HTML ya con el tema puesto.
 *
 * Lo anterior era un <script> inline que leía localStorage antes del primer
 * pintado. Funcionaba, pero React 19 avisa por consola cada vez que encuentra
 * una etiqueta <script> dentro de un componente, y la alternativa de
 * next/script tampoco vale: con strategy="beforeInteractive" no inyecta el
 * script en el HTML, lo encola en `__next_s` para que lo ejecute el runtime
 * de Next — es decir, DESPUÉS de cargar el framework, que es justo cuando ya
 * no sirve. Comprobado sirviendo el HTML y buscándolo.
 *
 * Con la cookie no hay script, no hay aviso y no hay fogonazo posible.
 *
 * Si no hay cookie no se escribe atributo, y entonces manda
 * `prefers-color-scheme` desde CSS. Ese caso nunca parpadeó.
 */

export type Theme = "light" | "dark";

export const THEME_COOKIE = "spiderjad-theme";

/** Un año. La preferencia de tema no caduca por su cuenta. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Descarta cualquier valor que no sea uno de los dos temas válidos. */
export function parseTheme(value: string | undefined | null): Theme | undefined {
  return value === "dark" || value === "light" ? value : undefined;
}
