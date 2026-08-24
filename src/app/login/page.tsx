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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 inline-block">
        <Wordmark />
      </Link>

      <p className="label-track text-rust">Acceso</p>
      <div className="rule-accent mt-3 mb-7 w-12" />

      <h1 className="text-3xl font-bold tracking-tight">Entrá con tu email</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Te mandamos un enlace de acceso. Sin contraseñas que recordar.
      </p>

      {params.error && (
        <p className="mt-6 rounded-card border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          El enlace no era válido o ya caducó. Pedí uno nuevo.
        </p>
      )}

      <LoginForm nextPath={params.next ?? "/dashboard"} />

      <p className="mt-10 text-xs leading-relaxed text-muted">
        Al continuar aceptás que guardemos los documentos que subas para
        avisarte de su caducidad. Podés borrarlos cuando quieras.
      </p>
    </main>
  );
}
