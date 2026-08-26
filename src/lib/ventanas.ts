/**
 * Ventanas de trámite: cuánto tarda de verdad renovar cada documento.
 *
 * Es la pieza que justifica que este producto exista. Ninguna aplicación de un
 * solo país puede saber que el consulado argentino tarda noventa días o que el
 * italiano no te acepta el papeleo antes de los seis meses — y el usuario
 * tampoco tiene por qué saberlo. Esa es exactamente la parte que le toca
 * saber a la aplicación.
 */

export type Ventana = {
  document_type: string;
  country: string;
  /** Con cuánta antelación conviene empezar. Manda sobre la preferencia si es mayor. */
  meses_aviso: number;
  /** Cuánto tarda el trámite de principio a fin. Es lo que permite decir "vas tarde". */
  dias_tramite: number | null;
  nota: string | null;
  verificado: boolean;
};

/**
 * La ficha que le toca a un documento.
 *
 * El país concreto gana al comodín: si hay ficha de pasaporte argentino se usa
 * esa, y si no, la de "pasaporte de donde sea".
 */
export function ventanaDe(
  ventanas: Ventana[],
  documentType: string,
  country: string | null,
): Ventana | null {
  const delTipo = ventanas.filter((v) => v.document_type === documentType);
  const pais = country?.toUpperCase() ?? null;
  return (
    delTipo.find((v) => v.country === pais) ??
    delTipo.find((v) => v.country === "*") ??
    null
  );
}

export type Urgencia =
  /** Quedan menos días de los que tarda el trámite. Ya no llega. */
  | { tipo: "tarde"; diasTramite: number; diasRestantes: number }
  /** Se puede hacer, pero sin margen: menos del doble de lo que tarda. */
  | { tipo: "justo"; diasTramite: number; diasRestantes: number }
  | null;

/**
 * Si el margen que queda alcanza para el trámite.
 *
 * Esto es lo que un semáforo por sí solo no puede decir. "Rojo" informa de que
 * queda poco; **"el trámite tarda 90 días y te quedan 63" informa de que ya no
 * llegás**, que es una cosa distinta y mucho más útil. Con ese dato delante,
 * alguien puede pedir un justificante o adelantar un viaje. Sin él, se entera
 * en la ventanilla.
 *
 * El umbral de "justo" está en el doble del trámite y no en el trámite exacto
 * a propósito: conseguir la cita también cuesta, y esas semanas no las cuenta
 * ningún consulado en su plazo oficial.
 */
export function urgenciaTramite(
  ventana: Ventana | null,
  diasRestantes: number,
): Urgencia {
  if (!ventana?.dias_tramite || diasRestantes < 0) return null;

  const tramite = ventana.dias_tramite;

  // Trámites de un día —el DNI español se hace en el momento— no generan
  // ninguna alarma: avisar de que "vas justo" para algo inmediato es ruido.
  if (tramite <= 7) return null;

  if (diasRestantes < tramite) {
    return { tipo: "tarde", diasTramite: tramite, diasRestantes };
  }
  if (diasRestantes < tramite * 2) {
    return { tipo: "justo", diasTramite: tramite, diasRestantes };
  }
  return null;
}

/**
 * Qué hacer, dicho por la aplicación y no por el catálogo.
 *
 * Las notas del catálogo son **hechos**: "el consulado italiano no acepta
 * renovar hasta 6 meses antes". Un hecho es verdad siempre, así que se puede
 * enseñar en cualquier estado sin mirar el calendario.
 *
 * La instrucción es otra cosa. "Pedí cita en cuanto se abra la ventana" solo
 * vale mientras la ventana esté cerrada; a 28 días de caducar lleva cinco
 * meses abierta y la frase pasa a ser falsa —y encima tranquilizadora, que es
 * el peor error que puede cometer esta aplicación—. Por eso la acción se
 * calcula aquí, a partir del estado real, y nunca se guarda como texto fijo.
 */
export function accionSugerida(urgencia: Urgencia): string | null {
  if (!urgencia) return null;
  if (urgencia.tipo === "tarde") {
    return "Pedí cita hoy y contá con pasar un tiempo sin el documento en vigor.";
  }
  return "Pedí cita esta semana: el plazo no cuenta la espera hasta conseguirla.";
}
