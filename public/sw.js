/*
 * Service worker de Spiderjad Docs.
 *
 * Existe por un motivo concreto: sin un service worker con manejador de
 * fetch, Chrome en Android NO ofrece instalar la aplicación. No hay más.
 *
 * Y por eso hace lo mínimo posible. Un service worker que cachea de más es
 * de las cosas más difíciles de depurar que existen: el usuario se queda con
 * una versión vieja de la app metida en el móvil, no entiende por qué no ve
 * los cambios, y vaciar la caché del navegador no siempre basta.
 *
 * Aquí solo se interceptan las NAVEGACIONES (abrir una página), y siempre
 * primero por red. La caché únicamente guarda una página de "sin conexión"
 * para cuando no hay señal.
 *
 * Lo que NUNCA pasa por aquí:
 *   · las llamadas a /api (subir documentos, OCR, borrar)
 *   · las rutas de /auth (magic link, cierre de sesión)
 *   · las URLs firmadas de las imágenes, que caducan en una hora
 *   · el JavaScript y el CSS de la app
 *
 * Todo eso va directo a la red, como si el service worker no existiera.
 */

const CACHE = "spiderjad-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
  // Sin esto, una versión nueva del service worker se queda esperando a que
  // se cierren todas las pestañas. Puede tardar días.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo navegaciones. Todo lo demás ni se toca.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL)),
  );
});
