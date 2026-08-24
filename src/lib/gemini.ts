import { GoogleGenAI, Type } from "@google/genai";
import { isValidIsoDate } from "@/lib/expiry";
import type { ExtractionResult } from "@/lib/types";

/** Error de negocio: el OCR no pudo leer una fecha fiable. */
export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly code:
      | "no_date_found"
      | "unreadable"
      | "invalid_response"
      | "api_error"
      | "not_configured",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const PROMPT = `Eres un extractor de datos de documentos de identidad y documentos oficiales.

Analiza la imagen o PDF adjunto y devuelve EXCLUSIVAMENTE JSON válido.

Reglas:
1. "expiry_date" es la FECHA DE CADUCIDAD / VALIDEZ del documento, en formato YYYY-MM-DD.
   - En documentos españoles suele aparecer como "VALIDEZ", "VÁLIDO HASTA", "FECHA DE CADUCIDAD" o "EXPIRY".
   - En pasaportes con MRZ, es el campo de expiración de la segunda línea (formato YYMMDD).
   - NO confundas con la fecha de nacimiento ni con la fecha de emisión/expedición.
   - Si el documento tiene varias fechas, elige la que representa hasta cuándo es válido.
2. Si NO puedes leer con seguridad una fecha de caducidad, devuelve expiry_date = null.
   Nunca inventes ni estimes una fecha.
3. "document_type" debe ser uno de: dni, passport, driving_license, residence_card,
   health_card, insurance, vehicle_itv, other.
4. "document_holder" es el nombre del titular si es legible; si no, null.
5. "confidence" refleja tu seguridad sobre expiry_date: high, medium o low.
6. "notes" es una frase corta en español explicando cualquier problema
   (imagen borrosa, recortada, fecha ambigua). Si todo está bien, null.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    expiry_date: {
      type: Type.STRING,
      nullable: true,
      description: "Fecha de caducidad en formato YYYY-MM-DD, o null.",
    },
    document_type: {
      type: Type.STRING,
      nullable: true,
      enum: [
        "dni",
        "passport",
        "driving_license",
        "residence_card",
        "health_card",
        "insurance",
        "vehicle_itv",
        "other",
      ],
    },
    document_holder: { type: Type.STRING, nullable: true },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    notes: { type: Type.STRING, nullable: true },
  },
  required: ["expiry_date", "confidence"],
};

/**
 * Envía el archivo a Gemini y extrae la fecha de caducidad.
 * Lanza ExtractionError con un código legible cuando no hay fecha fiable.
 */
export async function extractExpiryData(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ExtractionError(
      "Falta GEMINI_API_KEY en las variables de entorno.",
      "not_configured",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const base64 = Buffer.from(fileBuffer).toString("base64");

  let raw: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    raw = response.text;
  } catch (error) {
    throw new ExtractionError(
      `Gemini devolvió un error: ${error instanceof Error ? error.message : "desconocido"}`,
      "api_error",
    );
  }

  if (!raw) {
    throw new ExtractionError(
      "Gemini no devolvió contenido. Puede que la imagen no sea legible.",
      "unreadable",
    );
  }

  let parsed: Partial<ExtractionResult>;
  try {
    parsed = JSON.parse(raw) as Partial<ExtractionResult>;
  } catch {
    throw new ExtractionError(
      "La respuesta del OCR no era JSON válido.",
      "invalid_response",
    );
  }

  const expiry = normalizeDate(parsed.expiry_date);

  if (!expiry) {
    throw new ExtractionError(
      parsed.notes ||
        "No se pudo leer la fecha de caducidad. Probá con una foto más nítida y sin reflejos, o introducila a mano.",
      "no_date_found",
    );
  }

  return {
    expiry_date: expiry,
    document_type: parsed.document_type ?? null,
    document_holder: parsed.document_holder ?? null,
    confidence: parsed.confidence ?? "low",
    notes: parsed.notes ?? null,
  };
}

/** Acepta YYYY-MM-DD y tolera DD/MM/YYYY por si el modelo se desvía del esquema. */
function normalizeDate(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();

  if (isValidIsoDate(trimmed)) return trimmed;

  const slash = trimmed.match(/^(\d{2})[/.-](\d{2})[/.-](\d{4})$/);
  if (slash) {
    const candidate = `${slash[3]}-${slash[2]}-${slash[1]}`;
    if (isValidIsoDate(candidate)) return candidate;
  }

  return null;
}
