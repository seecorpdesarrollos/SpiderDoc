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
export const WINDOW_OPENS_DAYS = 180;
export const WINDOW_CLOSING_DAYS = 90;

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
 * El corte está justo en WINDOW_CLOSING_DAYS a propósito: dentro de la banda
 * roja los días cuentan de verdad (89 días no es lo mismo que 60 cuando el
 * consulado tarda 90), así que ahí se dan exactos. Fuera de ella, redondear a
 * meses no pierde nada útil.
 */
export function humanizeDays(days: number): string {
  const n = Math.abs(days);
  if (n < WINDOW_CLOSING_DAYS) return n === 1 ? "1 día" : `${n} días`;
  if (n < 730) {
    const months = Math.round(n / 30.44);
    return months === 1 ? "1 mes" : `${months} meses`;
  }
  const years = Math.floor(n / 365.25);
  return years === 1 ? "1 año" : `${years} años`;
}

/**
 * Semáforo de caducidad.
 *   Rojo    -> caducado o quedan menos de 3 meses
 *   Ámbar   -> entre 3 y 6 meses: la ventana de trámite está abierta
 *   Verde   -> más de 6 meses
 *
 * Los colores son los de la paleta de estado de Supabase, no los rojos y
 * ámbares por defecto de Tailwind: mantienen la cohesión con el resto.
 */
export function getExpiryStatus(expiryDate: string, now: Date = new Date()): ExpiryStatus {
  const daysRemaining = daysUntil(expiryDate, now);

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

  if (daysRemaining < WINDOW_CLOSING_DAYS) {
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

  if (daysRemaining <= WINDOW_OPENS_DAYS) {
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
