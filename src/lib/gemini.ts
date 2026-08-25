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

const PROMPT = `Eres un extractor de fechas de caducidad de documentos oficiales
de cualquier país. Analiza la imagen o PDF adjunto y devuelve EXCLUSIVAMENTE JSON válido.

QUÉ BUSCAR
"expiry_date" es la fecha hasta la que el documento es VÁLIDO, en formato YYYY-MM-DD.
Según el país y el idioma aparece con etiquetas distintas:

  Español    VALIDEZ · VÁLIDO HASTA · FECHA DE CADUCIDAD · VENCIMIENTO ·
             FECHA DE VENCIMIENTO (habitual en el DNI argentino)
  Italiano   SCADENZA · VALIDO FINO AL · DATA DI SCADENZA
  Inglés     EXPIRY · DATE OF EXPIRY · VALID UNTIL
  Francés    DATE D'EXPIRATION · VALABLE JUSQU'AU
  Portugués  VALIDADE · DATA DE VALIDADE
  Alemán     GÜLTIG BIS

ZONA MRZ (pasaportes y muchas tarjetas de identidad)
Si ves las dos o tres líneas de caracteres en mayúsculas con muchos símbolos "<",
úsalas: son más fiables que el texto impreso. En un pasaporte (formato TD3, dos
líneas de 44 caracteres), la segunda línea contiene, en orden: número de documento
(9), dígito de control (1), nacionalidad (3), fecha de nacimiento AAMMDD (6),
dígito de control (1), sexo (1), y entonces la FECHA DE CADUCIDAD en AAMMDD (6).
En los formatos TD1 y TD2 la caducidad también va después del sexo.
Interpreta el año de dos cifras con sentido: una caducidad está en el futuro o en
el pasado reciente, nunca a sesenta años vista.

REGLAS
1. NO confundas la caducidad con la fecha de nacimiento ni con la de emisión o
   expedición. Si hay varias fechas, elige la que indica hasta cuándo vale.
2. Ojo con el orden día/mes: los documentos españoles e italianos usan DD/MM/AAAA;
   algunos documentos en inglés usan MM/DD/AAAA. Si el día es mayor que 12,
   resuelve la ambigüedad con eso. Si sigue siendo ambiguo, bájale la confianza y
   dilo en "notes".
3. Si NO podés leer con seguridad una fecha de caducidad, devolvé expiry_date = null.
   Nunca inventes ni estimes una fecha.
4. Algunos documentos son permanentes y no caducan (ciertos DNI italianos antiguos,
   algunos certificados). En ese caso expiry_date = null y explicalo en "notes".
5. "document_type" debe ser uno de: dni, passport, driving_license, residence_card,
   health_card, insurance, vehicle_itv, other. La TIE y el NIE van como residence_card.
6. "issuing_country" es el código de tres letras del país emisor si podés
   determinarlo (ESP, ITA, ARG...); si no, null.
7. "document_holder" es el nombre del titular si es legible; si no, null.
8. "confidence" refleja tu seguridad sobre expiry_date: high, medium o low.
9. "notes" es una frase corta en español explicando cualquier problema: imagen
   borrosa, recortada, fecha ambigua, documento sin caducidad. Si todo está bien, null.`;

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
    issuing_country: {
      type: Type.STRING,
      nullable: true,
      description: "Código de 3 letras del país emisor (ESP, ITA, ARG...), o null.",
    },
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
  // Google retira modelos: en agosto de 2026 gemini-2.5-flash dejó de estar
  // disponible para cuentas nuevas. Por eso el modelo es configurable —
  // cuando vuelva a pasar, se cambia GEMINI_MODEL en el .env sin tocar código.
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
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
    issuing_country: parsed.issuing_country ?? null,
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
