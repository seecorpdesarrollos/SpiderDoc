# Desplegar Spiderjad Docs en Vercel

Estado: el código ya está commiteado en tu máquina y **el build de producción
pasa** (lo compilé entero: 9 rutas, TypeScript sin errores).

Lo que queda son cuatro pasos que necesitan tu sesión iniciada. Ninguno lleva
más de un par de minutos.

---

## 1. Subir el commit a GitHub

Desde una terminal tuya de Windows (PowerShell o Git Bash), **no desde Cowork** —
la máquina virtual de Cowork no tiene salida a internet:

```
cd "C:\Users\dpennisi\OneDrive - GRUP CAÑIGUERAL IMP SL\Documentos\Apps\spiderjad-docs"
git push
```

Si pide usuario y contraseña, la contraseña es un *personal access token* de
GitHub, no la de tu cuenta.

---

## 2. Importar el repo en Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
2. Elegí `seecorpdesarrollos/SpiderDoc`.
3. Framework: detecta Next.js solo. No toques nada más.
4. **NO le des a Deploy todavía** — primero las variables (paso 3), o el primer
   despliegue se cae.

---

## 3. Variables de entorno

En la misma pantalla de import, sección **Environment Variables**. Son cuatro,
y las tres primeras las copiás tal cual de tu `.env`:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | el mismo de tu `.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | el mismo de tu `.env` |
| `GEMINI_API_KEY` | el mismo de tu `.env` |
| `GEMINI_MODEL` | `gemini-3.6-flash` |

**Lo que NO va:**

- `DEV_ORIGIN` — es solo para abrir la app desde el móvil en tu red local.
- `PROBAR_OCR` — si no la ponés vale 0, que es lo correcto. **Nunca la pongas
  a 1 en Vercel:** `/probar` es un endpoint sin autenticar que llama a Gemini
  con tu clave. Cualquiera con la URL te gastaría la cuota.
- `SUPABASE_SERVICE_ROLE_KEY` — no se usa. Todo pasa por RLS.

Ahora sí: **Deploy**.

---

## 4. Decirle a Supabase cuál es la URL nueva

Este es el paso que se olvida siempre y hace que el magic link no funcione.

Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://<lo-que-te-dé-vercel>.vercel.app`
- **Redirect URLs:** añadí (sin quitar el de localhost, que lo seguís usando)

```
https://<lo-que-te-dé-vercel>.vercel.app/auth/callback
```

Vercel te da también una URL distinta por cada despliegue de preview. Si vas a
probar previews, añadí el patrón con comodín:

```
https://spiderdoc-*.vercel.app/auth/callback
```

---

## 5. Comprobarlo de punta a punta

Desde el móvil, no desde el portátil — es donde lo van a usar:

1. Abrí la URL de Vercel.
2. Pedí el magic link con tu email. **Que llegue** (mirá spam).
3. Entrá y subí una foto del pasaporte.
4. Comprobá que el OCR responde y que el semáforo pinta bien.
5. En el móvil: compartir → «Añadir a pantalla de inicio». Tiene que aparecer
   con su icono y abrirse sin barra de navegador.

Si algo de esto falla, decímelo con lo que veas en pantalla.

---

## Ojo con el email

Supabase manda los magic links con su SMTP compartido, y tiene un límite bajo
(del orden de unos pocos emails por hora) más una entregabilidad regular:
acaban en spam con facilidad.

Para vos probando, alcanza. **Para enseñárselo a cuatro personas, no.** Si el
link no les llega, no vas a estar midiendo si les interesa el producto, vas a
estar midiendo el spam filter de Gmail.

Antes de la primera demo con alguien que no seas vos: conectar Resend como SMTP
propio en Supabase. Es media hora y hace falta un dominio. Cuando llegues ahí,
lo montamos.
