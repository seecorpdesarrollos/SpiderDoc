"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-6">
        <p className="label-track text-rust">Revisá tu correo</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Mandamos un enlace de acceso a{" "}
          <span className="text-bone">{email}</span>. Abrilo desde este mismo
          dispositivo. Caduca en una hora.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-5 text-sm text-rust-soft underline underline-offset-4"
        >
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="label-track text-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vos@ejemplo.com"
          className="mt-2 w-full rounded-card border border-line bg-surface px-4 py-3.5 text-bone outline-none transition placeholder:text-muted/60 focus:border-rust"
        />
      </label>

      {status === "error" && message && (
        <p className="text-sm text-red-300">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="label-track w-full rounded-full bg-rust px-6 py-4 text-bone transition hover:bg-rust-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
