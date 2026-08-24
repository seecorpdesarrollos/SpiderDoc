/** Límite del plan gratuito. Definido en un solo sitio para poder subirlo luego. */
export const FREE_DOCUMENT_LIMIT = 5;

/** Tipos de archivo aceptados en la subida. */
export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

/** Tamaño máximo por archivo (bytes). */
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Bucket privado de Supabase Storage donde viven los documentos. */
export const DOCUMENTS_BUCKET = "documents";

/** Catálogo de tipos de documento del MVP. */
export const DOCUMENT_TYPES = [
  { value: "dni", label: "DNI / NIE" },
  { value: "passport", label: "Pasaporte" },
  { value: "driving_license", label: "Carnet de conducir" },
  { value: "residence_card", label: "Tarjeta de residencia" },
  { value: "health_card", label: "Tarjeta sanitaria" },
  { value: "insurance", label: "Seguro" },
  { value: "vehicle_itv", label: "ITV / vehículo" },
  { value: "other", label: "Otro" },
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]["value"];

export function documentTypeLabel(value: string | null | undefined): string {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? "Otro";
}
