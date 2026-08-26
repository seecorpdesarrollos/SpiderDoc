"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FORMATOS,
  guardarFormato,
  type FormatoCaducidad,
} from "@/lib/preferencias";
import { CompartirApp } from "@/components/CompartirApp";
import { AppShell } from "@/components/AppShell";
import { ComoInstalar } from "@/components/ComoInstalar";
import { ProbarAviso } from "@/components/ProbarAviso";
import { BorrarCuenta } from "@/components/BorrarCuenta";

/** Opciones de antelación. Ver el porqué de cada una en el texto de ayuda. */
const ANTELACIONES = [
  { meses: 3, etiqueta: "3 meses" },
  { meses: 6, etiqueta: "6 meses" },
  { meses: 9, etiqueta: "9 meses" },
  { meses: 12, etiqueta: "1 año" },
];

export function AjustesClient({
  email,
  antelacionInicial,
  formatoInicial,
}: {
  email: string;
  antelacionInicial: number;
  formatoInicial: FormatoCaducidad;
}) {
  const router = useRouter();
  const [antelacion, setAntelacion] = useState(antelacionInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [formato, setFormato] = useState<FormatoCaducidad>(formatoInicial);

  async function cambiarAntelacion(meses: number) {
    const anterior = antelacion;
    setAntelacion(meses);
    setGuardando(true);
    setError(null);
    setGuardado(false);

    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_time_months: meses }),
    });

    setGuardando(false);

    if (!res.ok) {
      const cuerpo = await res.json().catch(() => ({}));
      setAntelacion(anterior);
      setError(cuerpo.error ?? "No se pudo guardar.");
      return;
    }

    setGuardado(true);
    setTimeout(() => setGuardado(false), 2200);
  }

  function cambiarFormato(nuevo: FormatoCaducidad) {
    setFormato(nuevo);
    guardarFormato(nuevo);
    // El panel se pinta en el servidor leyendo esa cookie, así que hay que
    // pedirle que se vuelva a generar para que el cambio se vea allí.
    router.refresh();
  }

  return (
    <AppShell email={email}>
    <div className="mx-auto w-full max-w-5xl px-6 py-8 pb-28">
      <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground">
        Ajustes
      </h1>
      <p className="mt-1 text-sm text-fg-light">{email}</p>

      {/* Dos columnas en pantalla ancha. Las secciones son independientes
          entre sí, así que no importa el orden de lectura: cada una se
          entiende sola. items-start evita que una sección alta estire a la de
          al lado. */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:items-start">

      {/* ---- Antelación de los avisos ---- */}
      <section className="card-surface p-5">
        <p className="heading-meta text-brand-600">Avisos</p>
        <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
          Con cuánta antelación querés que te avisemos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-light">
          Recibirás un correo al llegar a esta antelación, otro a la mitad, y un
          último aviso a un mes.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {ANTELACIONES.map((opcion) => {
            const activa = antelacion === opcion.meses;
            return (
              <button
                key={opcion.meses}
                type="button"
                disabled={guardando}
                onClick={() => cambiarAntelacion(opcion.meses)}
                aria-pressed={activa}
                className={
                  activa
                    ? "focus-ring rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-medium text-brand-600"
                    : "btn-default px-4 py-2.5 text-sm"
                }
              >
                {opcion.etiqueta}
              </button>
            );
          })}
        </div>

        <p className="mt-4 border-l-2 border-border pl-3 text-xs leading-relaxed text-fg-lighter">
          Seis meses es lo razonable si tenés documentación de otro país: el
          consulado italiano no acepta renovar el pasaporte antes de esa fecha,
          el argentino tarda unos noventa días en entregarlo, y la cita de la
          TIE puede irse a tres o seis meses. Si todos tus documentos son
          españoles y los renovás aquí, con tres te sobra.
        </p>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {guardado && !error && (
          <p className="mt-3 text-sm text-brand-600">Guardado.</p>
        )}

        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-3 text-sm leading-relaxed text-fg-light">
            ¿Querés ver cómo se ve un aviso antes de necesitarlo?
          </p>
          <ProbarAviso />
        </div>
      </section>

      {/* ---- Formato de las fechas ---- */}
      <section className="card-surface p-5">
        <p className="heading-meta text-brand-600">Visualización</p>
        <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
          Cómo querés ver las caducidades
        </h2>

        <div className="mt-4 space-y-2">
          {FORMATOS.map((opcion) => {
            const activa = formato === opcion.valor;
            return (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => cambiarFormato(opcion.valor)}
                aria-pressed={activa}
                className={`focus-ring flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  activa
                    ? "border-brand/40 bg-brand/5"
                    : "border-border hover:bg-surface-200"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    activa ? "border-brand bg-brand" : "border-border"
                  }`}
                  aria-hidden
                >
                  {activa && (
                    <span className="h-1.5 w-1.5 rounded-full bg-background" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {opcion.etiqueta}
                  </span>
                  <span className="mt-0.5 block text-xs text-fg-lighter">
                    {opcion.ejemplo}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-fg-lighter">
          Esta preferencia se guarda en este dispositivo. La antelación de los
          avisos, en cambio, viaja con tu cuenta.
        </p>
      </section>

      {/* ---- Instalar ---- */}
      <section className="card-surface p-5">
        <p className="heading-meta text-brand-600">Instalar</p>
        <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
          Tenela como una app más
        </h2>
        <p className="mt-2 mb-4 text-sm leading-relaxed text-fg-light">
          Se abre desde su icono, a pantalla completa y sin barra de navegador.
        </p>
        <ComoInstalar />
      </section>

      {/* ---- Compartir ---- */}
      <section className="card-surface p-5">
        <p className="heading-meta text-brand-600">Compartir</p>
        <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
          Pasale la app a alguien
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-light">
          Si conocés a alguien con documentación de más de un país, esto le
          ahorra un disgusto.
        </p>
        <div className="mt-4">
          <CompartirApp />
        </div>
      </section>

      {/* ---- Cuenta ---- */}
      <section className="card-surface p-5">
        <p className="heading-meta text-brand-600">Cuenta</p>
        <form action="/auth/signout" method="post" className="mt-4 md:hidden">
          <button type="submit" className="btn-default px-4 py-2.5 text-sm">
            Cerrar sesión
          </button>
        </form>
        <div className="mt-5 border-t border-border pt-5">
          <BorrarCuenta />
        </div>
      </section>
      </div>
    </div>
    </AppShell>
  );
}
