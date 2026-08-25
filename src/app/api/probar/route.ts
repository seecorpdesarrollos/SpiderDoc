import { NextResponse, type NextRequest } from "next/server";
import { extractExpiryData, ExtractionError } from "@/lib/gemini";
import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Banco de pruebas del OCR. SIN autenticación a propósito: existe para poder
 * medir si Gemini acierta la fecha sin depender del login.
 *
 * Por eso está detrás de una bandera: si PROBAR_OCR no vale "1", devuelve 404.
 * Un endpoint abierto que llama a Gemini es una factura esperando a que alguien
 * encuentre la URL. No lo actives en producción.
 *
 * No guarda nada: la imagen pasa y se descarta.
 */
export async function POST(request: NextRequest) {
  if (process.env.PROBAR_OCR !== "1") {
    return new NextResponse(null, { status: 404 });
  }

  const started = Date.now();

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type as never)) {
    return NextResponse.json(
      { error: `Formato no admitido (${file.type || "desconocido"}).` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "El archivo pesa más de 8 MB." },
      { status: 400 },
    );
  }

  try {
    const result = await extractExpiryData(await file.arrayBuffer(), file.type);
    return NextResponse.json({
      ok: true,
      ...result,
      ms: Date.now() - started,
      bytes: file.size,
    });
  } catch (error) {
    if (error instanceof ExtractionError) {
      return NextResponse.json({
        ok: false,
        code: error.code,
        error: error.message,
        ms: Date.now() - started,
        bytes: file.size,
      });
    }
    return NextResponse.json(
      { ok: false, error: "Error inesperado.", ms: Date.now() - started },
      { status: 500 },
    );
  }
}
