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

/** Diferencia en días naturales entre hoy y la fecha de caducidad (UTC, sin horas). */
export function daysUntil(expiryDate: string, now: Date = new Date()): number {
  const [y, m, d] = expiryDate.split("-").map(Number);
  const target = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

/**
 * Semáforo de caducidad.
 *   Rojo    -> caducado o < 30 días
 *   Amarillo-> 30 a 90 días
 *   Verde   -> > 90 días
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
          : `Caducó hace ${Math.abs(daysRemaining)} días`,
      ...danger,
    };
  }

  if (daysRemaining < 30) {
    return {
      level: "critical",
      daysRemaining,
      label:
        daysRemaining === 0
          ? "Caduca hoy"
          : daysRemaining === 1
            ? "Caduca mañana"
            : `Caduca en ${daysRemaining} días`,
      ...danger,
    };
  }

  if (daysRemaining <= 90) {
    return {
      level: "warning",
      daysRemaining,
      label: `Caduca en ${daysRemaining} días`,
      pill: "border-warning/30 bg-warning/10 text-warning",
      bar: "bg-warning-dim",
      dot: "bg-warning",
    };
  }

  return {
    level: "ok",
    daysRemaining,
    label: `Caduca en ${daysRemaining} días`,
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
