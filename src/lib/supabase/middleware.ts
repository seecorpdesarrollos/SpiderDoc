import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Rutas que exigen sesión iniciada. */
const PROTECTED_PREFIXES = ["/dashboard", "/ajustes"];

/**
 * Refresca el token de Supabase en cada petición y protege /dashboard.
 * Sin esto, la sesión caduca y los Server Components ven al usuario como
 * anónimo aunque el refresh token siga siendo válido.
 *
 * DEGRADACIÓN
 * Este código corre en TODAS las rutas. Si lanza una excepción, no se cae una
 * página: se cae el sitio entero, incluida la de login, con un
 * MIDDLEWARE_INVOCATION_FAILED que no explica nada. Pasó en el primer
 * despliegue a Vercel, por unas variables de entorno que faltaban.
 *
 * Por eso ni la configuración ausente ni un fallo de red tumban nada: se
 * registra en el log y se deja pasar la petición. No abre ningún agujero,
 * porque /dashboard vuelve a comprobar la sesión por su cuenta en el servidor
 * y redirige a /login si no hay usuario. El middleware es una optimización y
 * una primera barrera, nunca la única.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Ojo: las NEXT_PUBLIC_* se incrustan al COMPILAR, no al arrancar. Si se
    // añaden en Vercel después de un despliegue, hay que volver a desplegar
    // para que existan. Añadirlas y recargar la página no sirve de nada.
    console.error(
      "[middleware] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "La sesión no se refresca. Si las acabás de añadir en Vercel, hay que volver a desplegar.",
    );
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: no meter lógica entre createServerClient y getUser().
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // Supabase caído o sin red: se trata como "sin sesión". Las rutas
    // protegidas mandan a /login, que es el comportamiento seguro, y las
    // públicas siguen funcionando.
    console.error("[middleware] No se pudo verificar la sesión:", error);
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
