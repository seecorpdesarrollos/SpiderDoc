import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 inline-block">
        <Wordmark />
      </Link>

      <p className="heading-meta text-brand">Acceso</p>

      <h1 className="mt-4 font-heading text-2xl font-medium tracking-tight text-foreground">
        Entrá con tu email
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-fg-light">
        Te mandamos un enlace de acceso. Sin contraseñas que recordar.
      </p>

      {params.error && (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          El enlace no era válido o ya caducó. Pedí uno nuevo.
        </p>
      )}

      <LoginForm nextPath={params.next ?? "/dashboard"} />

      <p className="mt-10 text-xs leading-relaxed text-fg-lighter">
        Al continuar aceptás que guardemos los documentos que subas para
        avisarte de su caducidad. Podés borrarlos cuando quieras.
      </p>
    </main>
  );
}
