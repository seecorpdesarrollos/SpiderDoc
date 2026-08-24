export type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  document_type: string;
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
  confidence: "high" | "medium" | "low";
  notes: string | null;
};
