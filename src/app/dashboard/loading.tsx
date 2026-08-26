/**
 * Lo que se ve mientras el servidor prepara el panel.
 *
 * No es adorno. Cada carga tiene que comprobar la sesión contra Supabase y
 * firmar una URL por cada documento, y eso son segundos. Sin esto, tocás
 * "Documentos" y no pasa NADA visible durante ese rato: no sabés si el toque
 * entró, así que volvés a tocar, y encima empeora.
 *
 * Con el esqueleto, la respuesta es inmediata aunque los datos no lo sean.
 */
export default function CargandoDashboard() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 pb-28">
      <div className="card-surface">
        <div className="hairline-b flex items-center justify-between px-4 py-3">
          <div className="esqueleto h-3 w-28" />
          <div className="esqueleto h-3 w-20" />
        </div>
        <div className="p-4">
          <div className="esqueleto h-9 w-16" />
          <div className="esqueleto mt-2 h-3 w-40" />
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="esqueleto h-2.5 w-20" />
                <div className="esqueleto mt-2.5 h-4 w-44" />
                <div className="esqueleto mt-2 h-3 w-32" />
              </div>
              <div className="esqueleto h-6 w-24 shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
