export type ExpiryLevel = "expired" | "critical" | "warning" | "ok";

export type ExpiryStatus = {
  level: ExpiryLevel;
  daysRemaining: number;
  label: string;
  /** Clases Tailwind para la píldora y la barra del semáforo. */
  pill: string;
  bar: string;
  dot: string;
};

/**
 * Umbrales del semáforo, en días.
 *
 * No son 30/90 días como en la primera versión, y el cambio no es cosmético:
 * es el producto entero. Renovar un documento en un consulado extranjero no
 * se parece en nada a renovarlo en tu propio país.
 *
 *   · El consulado italiano no acepta la renovación del pasaporte hasta
 *     6 meses antes de la caducidad. Antes de eso no podés hacer nada.
 *   · El consulado argentino tarda ~90 días en entregar el documento, y los
 *     turnos se liberan los miércoles solo para la semana siguiente.
 *   · La TIE española tiene una espera real de 3 a 6 meses en Madrid,
 *     Barcelona y Valencia.
 *
 * De ahí salen los dos cortes:
 *   180 días (6 meses) -> se abre la ventana. Es el aviso útil.
 *    90 días (3 meses) -> la ventana se está cerrando. Es la alarma.
 *
 * Avisar a 30 días, como hacía la versión anterior, es avisar cuando ya no
 * hay nada que hacer.
 */
/** Antelación por defecto, en meses, si el usuario no ha elegido otra. */
export const ANTELACION_POR_DEFECTO = 6;

/**
 * Cuántos días faltan hasta dentro de N meses, contando meses de calendario.
 *
 * No vale multiplicar por 30: hay que dar el MISMO número que da Postgres con
 * `current_date + interval 'N months'`, porque de eso depende que el color de
 * la tarjeta y el correo digan lo mismo del mismo documento.
 */
function diasHastaMeses(meses: number, now: Date): number {
  const hoy = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const futuro = new Date(hoy);
  futuro.setUTCMonth(futuro.getUTCMonth() + meses);
  return Math.round((futuro.getTime() - hoy) / 86_400_000);
}

/**
 * Los dos cortes del semáforo, derivados de la antelación que eligió el
 * usuario.
 *
 * Antes estaban fijos en 180 y 90 días. Coincidían con el valor por defecto,
 * así que parecía correcto — pero en cuanto alguien cambiaba su antelación en
 * Ajustes, la tarjeta y el aviso empezaban a contradecirse: con 12 meses el
 * correo llegaba al año y la tarjeta seguía verde hasta los seis.
 *
 * La división entera y el mínimo de 1 replican exactamente lo que hace
 * pending_notifications() en SQL. Tienen que ser los mismos escalones o
 * volvemos al mismo problema por otra puerta.
 */
export function cortesSemaforo(leadTimeMonths: number, now: Date) {
  const lead = Math.min(Math.max(Math.round(leadTimeMonths), 1), 24);
  const mitad = Math.max(Math.floor(lead / 2), 1);
  return {
    /** Se abre la ventana: a partir de aquí ya se puede hacer algo. */
    abre: diasHastaMeses(lead, now),
    /** Se está cerrando: a partir de aquí vas justo. */
    cierra: diasHastaMeses(mitad, now),
  };
}

/** Diferencia en días naturales entre hoy y la fecha de caducidad (UTC, sin horas). */
export function daysUntil(expiryDate: string, now: Date = new Date()): number {
  const [y, m, d] = expiryDate.split("-").map(Number);
  const target = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

/**
 * Convierte un número de días en algo que una persona lee de un vistazo.
 *
 * "Caduca en 1954 días" no lo procesa nadie: hay que pararse a dividir. Como
 * ahora el horizonte del producto son años y no semanas, por encima de tres
 * meses se habla en meses y por encima de dos años, en años.
 *
 * El corte está en 90 días: por debajo, los días cuentan de verdad —89 no es
 * lo mismo que 60 cuando el consulado tarda 90— así que se dan exactos. Por
 * encima, redondear a meses no pierde nada útil.
 */
export function humanizeDays(days: number): string {
  const n = Math.abs(days);

  if (n < 90) return n === 1 ? "1 día" : `${n} días`;

  if (n < 730) {
    const months = Math.round(n / 30.44);
    return months === 1 ? "1 mes" : `${months} meses`;
  }

  // Por encima de dos años NO basta con los años a secas. Un carnet que caduca
  // el 31/01/2029 visto desde agosto de 2026 son 2 años y 5 meses; decir
  // "2 años" se come cinco meses enteros y suena a dato exacto cuando no lo
  // es. En una aplicación cuya única promesa es avisar a tiempo, eso no vale.
  const years = Math.floor(n / 365.25);
  const restoMeses = Math.round((n - years * 365.25) / 30.44);

  // El redondeo del resto puede dar 12: entonces es un año más y cero meses.
  const anios = restoMeses === 12 ? years + 1 : years;
  const meses = restoMeses === 12 ? 0 : restoMeses;

  const textoAnios = anios === 1 ? "1 año" : `${anios} años`;
  if (meses === 0) return textoAnios;

  const textoMeses = meses === 1 ? "1 mes" : `${meses} meses`;
  return `${textoAnios} y ${textoMeses}`;
}

/**
 * Semáforo de caducidad, con los cortes que correspondan a la antelación que
 * el usuario haya elegido.
 *
 * Con el valor por defecto (6 meses) sale lo de siempre: rojo por debajo de
 * 3 meses, ámbar entre 3 y 6, verde por encima. Con cualquier otro valor, el
 * color y el correo siguen diciendo lo mismo — que es el punto.
 *
 * Los colores son los de la paleta de estado de Supabase, no los rojos y
 * ámbares por defecto de Tailwind: mantienen la cohesión con el resto.
 */
export function getExpiryStatus(
  expiryDate: string,
  now: Date = new Date(),
  leadTimeMonths: number = ANTELACION_POR_DEFECTO,
): ExpiryStatus {
  const daysRemaining = daysUntil(expiryDate, now);
  const { abre, cierra } = cortesSemaforo(leadTimeMonths, now);

  const danger = {
    pill: "border-destructive/30 bg-destructive/10 text-destructive",
    bar: "bg-destructive-dim",
    dot: "bg-destructive",
  };

  if (daysRemaining < 0) {
    return {
      level: "expired",
      daysRemaining,
      label:
        daysRemaining === -1
          ? "Caducó ayer"
          : `Caducó hace ${humanizeDays(daysRemaining)}`,
      ...danger,
    };
  }

  if (daysRemaining < cierra) {
    return {
      level: "critical",
      daysRemaining,
      label:
        daysRemaining === 0
          ? "Caduca hoy"
          : daysRemaining === 1
            ? "Caduca mañana"
            : `Caduca en ${humanizeDays(daysRemaining)}`,
      ...danger,
    };
  }

  if (daysRemaining <= abre) {
    return {
      level: "warning",
      daysRemaining,
      label: `Caduca en ${humanizeDays(daysRemaining)}`,
      pill: "border-warning/30 bg-warning/10 text-warning",
      bar: "bg-warning-dim",
      dot: "bg-warning",
    };
  }

  return {
    level: "ok",
    daysRemaining,
    label: `Caduca en ${humanizeDays(daysRemaining)}`,
    pill: "border-brand/30 bg-brand/10 text-brand-600",
    bar: "bg-brand-500",
    dot: "bg-brand",
  };
}

/**
 * La cuenta atrás en días exactos, para quien prefiere el número crudo.
 *
 * "889 días" se lee peor que "2 años y 5 meses" —hay que pararse a dividir—
 * pero para plazos cortos es justo al revés, y hay gente que quiere el número
 * y no una aproximación. Por eso es una opción y no el valor por defecto.
 */
export function etiquetaEnDias(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const n = Math.abs(daysRemaining);
    return n === 1 ? "Caducó ayer" : `Caducó hace ${n} días`;
  }
  if (daysRemaining === 0) return "Caduca hoy";
  if (daysRemaining === 1) return "Caduca mañana";
  return `Caduca en ${daysRemaining} días`;
}

/**
 * Una palabra para el estado, cuando el usuario prefiere ver la fecha exacta
 * y no la cuenta atrás. La píldora sigue haciendo de semáforo: el color es lo
 * que se lee de un vistazo, el texto solo lo confirma.
 */
export function estadoCorto(level: ExpiryLevel): string {
  switch (level) {
    case "expired":
      return "Caducado";
    case "critical":
      return "Urgente";
    case "warning":
      return "Renovar ya";
    default:
      return "Vigente";
  }
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2027-03-14" -> "14 de marzo de 2027" */
export function formatExpiryDate(expiryDate: string): string {
  const [y, m, d] = expiryDate.split("-").map(Number);
  if (!y || !m || !d) return expiryDate;
  return `${d} de ${MONTHS_ES[m - 1]} de ${y}`;
}

/** Valida el formato YYYY-MM-DD y que sea una fecha real. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
