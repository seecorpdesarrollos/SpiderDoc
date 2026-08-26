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


/* ---------------------------------------------------------------------------
 * NOTIFICACIONES PUSH
 * ---------------------------------------------------------------------------
 * El navegador despierta este service worker cuando llega un aviso, incluso
 * con la app cerrada. Es lo único que puede mostrar la notificación: la página
 * puede no existir en ese momento.
 *
 * El contenido viene cifrado desde nuestro servidor y solo este navegador
 * puede descifrarlo. Importa, porque el texto dice qué documento tenés.
 */

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    // Si algún día llega un push sin JSON, mejor un aviso genérico que ninguno.
  }

  const titulo = datos.titulo || "Spiderjad Docs";
  const opciones = {
    body: datos.cuerpo || "Tenés un documento que necesita atención.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // tag: si llegan dos avisos del mismo documento, el segundo reemplaza al
    // primero en vez de apilarse. Nadie quiere seis notificaciones del mismo
    // pasaporte.
    tag: datos.tag || "spiderjad-aviso",
    data: { url: datos.url || "/dashboard" },
    // En móvil, que vibre: un aviso de caducidad que pasa desapercibido no
    // sirve de nada.
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((ventanas) => {
        // Si la app ya está abierta, se reutiliza esa ventana en vez de abrir
        // otra. Abrir una segunda copia de la app al tocar un aviso es de las
        // cosas que más delatan a una web disfrazada de aplicación.
        for (const ventana of ventanas) {
          if ("focus" in ventana) {
            ventana.navigate(destino);
            return ventana.focus();
          }
        }
        return self.clients.openWindow(destino);
      }),
  );
});
