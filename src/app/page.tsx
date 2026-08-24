import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Wordmark";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Wordmark />
        <Link
          href="/login"
          className="label-track rounded-full border border-line px-5 py-2.5 text-bone transition hover:border-rust hover:text-rust-soft"
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="label-track text-rust">Control de caducidades</p>
        <div className="rule-accent mt-3 mb-8 w-16" />

        <h1 className="max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight sm:text-7xl">
          Tus documentos,
          <br />
          <span className="text-rust">siempre en vigor.</span>
        </h1>

        <p className="mt-8 max-w-xl text-lg text-muted">
          Sacá una foto del DNI, el pasaporte o el carnet. Leemos la fecha de
          caducidad automáticamente y te avisamos antes de que sea un problema.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="label-track rounded-full bg-rust px-8 py-4 text-bone transition hover:bg-rust-soft"
          >
            Empezar gratis
          </Link>
          <span className="text-sm text-muted">
            5 documentos gratis. Sin tarjeta.
          </span>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        {[
          {
            n: "01",
            title: "Subís la foto",
            body: "Imagen o PDF del documento. Se guarda cifrado y privado, solo vos lo ves.",
          },
          {
            n: "02",
            title: "Leemos la fecha",
            body: "El OCR extrae la fecha de caducidad. Si algo no queda claro, la corregís vos.",
          },
          {
            n: "03",
            title: "Te avisamos",
            body: "Semáforo por documento y aviso antes de que caduque. Sin sustos.",
          },
        ].map((step) => (
          <div key={step.n} className="bg-surface p-7">
            <p className="label-track text-rust">{step.n}</p>
            <h2 className="mt-4 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <p className="label-track text-muted">Spiderjad</p>
        <p className="text-xs text-muted">
          Un producto de Spiderjad SL · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
