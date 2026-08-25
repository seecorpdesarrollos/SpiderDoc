import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="marketing relative min-h-dvh overflow-hidden">
      <div className="hero-glow" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn-default px-3 py-2 text-sm">
              Entrar
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20">
          <p className="heading-meta text-brand-600">Control de caducidades</p>

          <h1 className="mt-6 max-w-3xl font-heading text-4xl leading-[1.1] font-medium tracking-tight text-foreground sm:text-6xl">
            Tus documentos,
            <br />
            <span className="text-brand-600">siempre en vigor.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-fg-light">
            Sacá una foto del DNI, el pasaporte o el carnet. Leemos la fecha de
            caducidad automáticamente y te avisamos antes de que sea un problema.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/login" className="btn-primary px-4 py-2 text-sm">
              Empezar gratis
            </Link>
            <span className="text-sm text-fg-lighter">
              5 documentos gratis. Sin tarjeta.
            </span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Subís la foto",
              body: "Imagen o PDF del documento. Se guarda privado, en un bucket cifrado que solo vos podés abrir.",
            },
            {
              n: "02",
              title: "Leemos la fecha",
              body: "El OCR extrae la fecha de caducidad. Si algo no queda claro, la corregís antes de guardar.",
            },
            {
              n: "03",
              title: "Te avisamos",
              body: "Semáforo por documento y aviso antes de que caduque. Sin sustos en la ventanilla.",
            },
          ].map((step) => (
            <div key={step.n} className="card-surface p-5">
              <p className="heading-meta text-brand-600">{step.n}</p>
              <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-light">
                {step.body}
              </p>
            </div>
          ))}
        </section>

        <footer className="hairline-t mt-12 flex flex-wrap items-center justify-between gap-3 pt-6">
          <Wordmark compact />
          <p className="text-xs text-fg-lighter">
            Un producto de Spiderjad SL · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </main>
  );
}
