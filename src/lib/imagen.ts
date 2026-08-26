/**
 * Reducción del peso de las fotos antes de subirlas.
 *
 * Una foto de móvil son 3-5 MB. Eso son segundos de subida con datos móviles,
 * cuota del almacenamiento gratuito, y tokens de Gemini en cada análisis — la
 * imagen viaja entera al OCR.
 *
 * EL EQUILIBRIO, QUE AQUÍ NO ES TRIVIAL
 * Comprimir de más rompe el producto. El OCR tiene que leer letra pequeña y,
 * sobre todo, la banda MRZ del pasaporte: esa fila de caracteres apretados es
 * lo que hace que acierte con las fechas ambiguas. Machacarla a 800 píxeles
 * sería ahorrar unos kilobytes a cambio de la única función que importa.
 *
 * Por eso 2048 píxeles en el lado largo y calidad 0,85: sigue siendo bastante
 * más resolución de la que necesita un documento tamaño tarjeta, y baja una
 * foto típica de 4 MB a medio mega. La compresión agresiva no se toca sin
 * volver a pasar el banco de pruebas de /probar.
 */

const LADO_MAXIMO = 2048;
const CALIDAD = 0.85;

/** Por debajo de esto no hay nada que ganar y sí algo que perder. */
const UMBRAL_BYTES = 600 * 1024;

export type ResultadoCompresion = {
  archivo: File;
  bytesAntes: number;
  bytesDespues: number;
  /** false si se devolvió el original tal cual. */
  comprimida: boolean;
};

export async function comprimirImagen(file: File): Promise<ResultadoCompresion> {
  const sinCambios: ResultadoCompresion = {
    archivo: file,
    bytesAntes: file.size,
    bytesDespues: file.size,
    comprimida: false,
  };

  // Los PDF no se tocan: no son mapas de bits y recomprimirlos aquí solo
  // podría estropearlos.
  if (!file.type.startsWith("image/")) return sinCambios;
  if (file.size <= UMBRAL_BYTES) return sinCambios;
  if (typeof createImageBitmap !== "function") return sinCambios;

  try {
    // imageOrientation: "from-image" es imprescindible. Las fotos de móvil
    // llevan la rotación en los metadatos EXIF, y al dibujarlas en un canvas
    // sin esto salen tumbadas. Le mandaríamos al OCR un pasaporte de lado.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) return sinCambios;

    // Los documentos son texto sobre fondo claro. Sin fondo blanco, un PNG con
    // transparencia se convertiría a JPEG con el fondo en negro y el texto
    // oscuro desaparecería.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD),
    );

    if (!blob) return sinCambios;

    // Puede pasar con imágenes ya optimizadas: recomprimir las engorda. En ese
    // caso se queda el original, que además conserva su calidad intacta.
    if (blob.size >= file.size) return sinCambios;

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";

    return {
      archivo: new File([blob], nombre, { type: "image/jpeg" }),
      bytesAntes: file.size,
      bytesDespues: blob.size,
      comprimida: true,
    };
  } catch {
    // Si algo falla —formato exótico, memoria en un móvil viejo— se sube el
    // original. Perder peso es deseable; perder el documento, no.
    return sinCambios;
  }
}

/** "3,8 MB" / "412 KB" */
export function formatearBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}
