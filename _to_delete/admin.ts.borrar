import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role. Salta RLS, así que SOLO puede usarse en el
 * servidor y siempre filtrando por el user_id ya autenticado.
 *
 * Se usa para dos cosas donde el cliente anónimo no basta:
 *   1. Contar documentos de forma fiable para el límite del plan gratuito.
 *   2. Firmar URLs de Storage y limpiar archivos huérfanos.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
