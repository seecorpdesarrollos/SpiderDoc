# Spiderjad Docs

**Control de caducidades de documentos personales.** Subís una foto del DNI, el
pasaporte o el carnet, el OCR lee la fecha de caducidad y el dashboard te la
ordena por urgencia.

Un producto de **Spiderjad SL**.

---

## Stack

| Capa | Tecnología | Coste |
|---|---|---|
| Frontend / PWA | Next.js 16 (App Router) + Tailwind v4 | Vercel free |
| Auth + BBDD + Storage | Supabase (PostgreSQL) | Free tier |
| OCR / Visión | Google Gemini (`gemini-2.5-flash`) | AI Studio free tier |
| Deploy | Vercel | Free |

Todo TypeScript en modo `strict`.

---

## Puesta en marcha (de cero a corriendo)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto de Supabase

1. Entrá en [supabase.com](https://supabase.com) → **New project**.
   Elegí región `eu-central` o `eu-west` (los usuarios están en España).
2. Cuando termine de provisionarse, andá a **SQL Editor → New query**,
   pegá el contenido de [`supabase/schema.sql`](supabase/schema.sql) y dale a **Run**.
   Eso crea las tablas, las políticas RLS, el trigger del límite de 5
   documentos y el bucket privado de Storage.
3. **Authentication → Sign In / Providers → Email**: dejá activado
   *Enable email provider*. No hace falta contraseña: usamos magic link.
4. **Authentication → URL Configuration**: poné `http://localhost:3000` en
   *Site URL* y añadí `http://localhost:3000/auth/callback` a
   *Redirect URLs*. Cuando despliegues, añadí también la URL de Vercel.

### 3. Conseguir la API key de Gemini

Andá a [aistudio.google.com/apikey](https://aistudio.google.com/apikey) →
**Create API key**. El tier gratuito alcanza de sobra para el MVP.

### 4. Variables de entorno

```bash
cp .env.example .env.local
```

Rellená:

| Variable | Dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → `anon` o `publishable` |
| `GEMINI_API_KEY` | Google AI Studio |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local |

> No hace falta la `service_role` key. Todo el acceso a datos pasa por el
> cliente autenticado del usuario y lo filtra RLS, que es justo lo que
> queremos para documentos de identidad: ni el propio servidor tiene una vía
> para leer los documentos de otro usuario.

### 5. Arrancar

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

### 6. Desplegar en Vercel

1. Importá el repo en Vercel.
2. Copiá las cuatro variables de entorno en **Settings → Environment Variables**.
3. Cambiá `NEXT_PUBLIC_SITE_URL` a la URL de producción.
4. Añadí `https://tu-dominio.vercel.app/auth/callback` a las *Redirect URLs*
   de Supabase.

---

## Cómo funciona el alta de un documento

El flujo es en dos pasos a propósito: **el OCR nunca guarda nada sin que el
usuario confirme la fecha.**

```
Usuario elige archivo
        │
        ▼
POST /api/documents/scan ──► comprueba límite (5) ──► Gemini ──► { expiry_date, confidence }
        │                                                              │
        │                             (no guarda nada en BBDD ni Storage)
        ▼
Usuario revisa / corrige la fecha en el diálogo
        │
        ▼
POST /api/documents ──► límite ──► Storage.upload ──► INSERT documents
                                          │
                          si el INSERT falla, se borra el archivo (sin huérfanos)
```

Si Gemini no encuentra una fecha fiable devuelve `expiry_date: null` y la UI
pide escribirla a mano en vez de romperse. Nunca inventa una fecha.

---

## El límite de 5 documentos

Está aplicado en **tres capas**, de fuera hacia dentro:

1. **UI** — el botón «Añadir documento» abre el modal de límite en vez del de
   subida cuando ya hay 5.
2. **API** — `/scan` y `POST /documents` cuentan las filas antes de actuar
   (`/scan` lo hace primero para no gastar una llamada a Gemini).
3. **Base de datos** — el trigger `documents_enforce_free_limit` levanta
   `FREE_LIMIT_REACHED`. Esta es la que de verdad no se puede saltar, aunque
   alguien llame a la API de Supabase directamente con su propio token.

Para subir el límite: `FREE_DOCUMENT_LIMIT` en `src/lib/constants.ts` **y** la
constante `free_limit` del trigger en `supabase/schema.sql`.

---

## Semáforo de caducidad

Definido en `src/lib/expiry.ts`, según lo acordado en el brief:

| Color | Condición |
|---|---|
| 🔴 Rojo | Caducado o faltan **menos de 30** días |
| 🟡 Amarillo | Entre **30 y 90** días |
| 🟢 Verde | Más de **90** días |

El dashboard ordena siempre por `expiry_date` ascendente: lo que caduca antes,
arriba.

---

## Estructura

```
src/
├── app/
│   ├── page.tsx                     landing
│   ├── login/                       magic link
│   ├── auth/callback/               canje del código PKCE
│   ├── dashboard/                   listado + semáforo
│   └── api/documents/
│       ├── scan/route.ts            OCR sin guardar
│       ├── route.ts                 alta (Storage + INSERT)
│       └── [id]/route.ts            editar / borrar
├── components/                      UploadDialog, DocumentCard, LimitModal
└── lib/
    ├── expiry.ts                    semáforo y fechas
    ├── gemini.ts                    OCR con salida JSON estructurada
    ├── constants.ts                 límite, tipos, bucket
    └── supabase/                    client / server / middleware
supabase/schema.sql                  tablas, RLS, trigger, bucket
```

---

## Seguridad

- Bucket **privado**: los archivos se sirven con URLs firmadas de 1 hora.
- RLS activo en `profiles`, `documents` y `storage.objects`; cada usuario solo
  ve su carpeta `documents/<user_id>/`.
- El middleware refresca el token en cada petición y protege `/dashboard`.
- Las rutas de API vuelven a filtrar por `user_id` aunque RLS ya lo haga
  (defensa en profundidad).

---

## Pendiente (siguiente iteración)

- [ ] Avisos por email con Resend + cron de Vercel (30 / 7 / 1 días antes).
- [ ] Web Push y service worker para PWA instalable offline.
- [ ] Recorte y mejora de la foto antes de mandarla al OCR (menos tokens, más acierto).
- [ ] Pasarela de pago para el plan de pago.
