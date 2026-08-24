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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

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
      <div className="card-surface mt-8 p-5">
        <p className="heading-meta text-brand">Revisá tu correo</p>
        <p className="mt-3 text-sm leading-relaxed text-fg-light">
          Mandamos un enlace de acceso a{" "}
          <span className="text-foreground">{email}</span>. Abrilo desde este
          mismo dispositivo. Caduca en una hora.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="focus-ring mt-4 rounded-md text-sm text-brand-600 underline underline-offset-4"
        >
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block">
        <span className="heading-meta text-fg-lighter">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vos@ejemplo.com"
          className="input-field mt-2"
        />
      </label>

      {status === "error" && message && (
        <p className="text-sm text-destructive">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full px-4 py-2.5 text-sm"
      >
        {status === "sending" ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
