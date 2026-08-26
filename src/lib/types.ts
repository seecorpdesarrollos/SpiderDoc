export type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  document_type: string;
  /** Código de 3 letras del país emisor. Media clave del catálogo de ventanas. */
  issuing_country: string | null;
  expiry_date: string; // YYYY-MM-DD
  file_path: string;
  created_at: string;
};

/** Documento tal y como lo consume la UI, con la URL firmada ya resuelta. */
export type DocumentWithUrl = DocumentRow & {
  signed_url: string | null;
};

/** Respuesta del OCR de Gemini. */
export type ExtractionResult = {
  expiry_date: string | null; // YYYY-MM-DD
  document_type: string | null;
  document_holder: string | null;
  /** Código de 3 letras del país emisor (ESP, ITA, ARG...), si se pudo leer. */
  issuing_country: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
};
