"use client";
import { useState } from "react";

type Estado = "idle" | "enviando" | "ok" | "error";
type Variant = "default" | "dark" | "hero";

export default function SubscriptionForm({ variant = "default" }: { variant?: Variant } = {}) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensajeError, setMensajeError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setMensajeError("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          website: "", // honeypot — siempre vacío en envíos humanos
        }),
      });

      if (res.ok) {
        setEstado("ok");
      } else {
        const data = (await res.json()) as { error?: string };
        setMensajeError(data.error ?? "Error al procesar la solicitud.");
        setEstado("error");
      }
    } catch {
      setMensajeError("Error de conexión. Intenta de nuevo.");
      setEstado("error");
    }
  }

  const esDark = variant === "dark";
  const esHero = variant === "hero";

  if (estado === "ok") {
    return (
      <div className={esDark ? "text-zinc-300" : "text-zinc-700"}>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${esDark ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
            <svg className={`w-4 h-4 ${esDark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-sm">
            <p className={`font-medium ${esDark ? "text-white" : "text-zinc-900"} mb-0.5`}>
              Revisa tu correo
            </p>
            <p className={`text-xs leading-relaxed ${esDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Te enviamos un enlace de confirmación. Haz clic en él para activar tu suscripción.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estilos por variante
  const inputBase = "flex-1 min-w-0 rounded-full px-4 py-2.5 text-sm focus:outline-hidden focus:ring-2 transition";
  const inputStyles = esDark
    ? `${inputBase} bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:ring-amber-500/60 focus:border-transparent`
    : `${inputBase} bg-white border border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:ring-amber-500/60 focus:border-transparent`;

  const btnStyles = esDark
    ? "shrink-0 inline-flex items-center bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors disabled:opacity-50"
    : "shrink-0 inline-flex items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors disabled:opacity-50";

  const helperStyles = esDark ? "text-xs text-zinc-500 mt-2" : "text-xs text-zinc-400 mt-2";

  // Hero variant: solo email + botón en fila. Sin nombre.
  if (esHero) {
    return (
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          style={{ display: "none" }}
          aria-hidden="true"
        />
        <div className="flex gap-2 items-stretch">
          <input
            type="email"
            required
            placeholder="Tu correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className={inputStyles}
            aria-label="Correo electrónico"
          />
          <button
            type="submit"
            disabled={estado === "enviando" || !email.trim()}
            className={btnStyles}
          >
            {estado === "enviando" ? "Enviando…" : "Suscribirme"}
          </button>
        </div>

        {estado === "error" && (
          <p className={`text-xs mt-2 ${esDark ? "text-red-400" : "text-red-600"}`}>{mensajeError}</p>
        )}
        <p className={`${helperStyles} flex items-center gap-1.5`}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No enviamos spam. Puedes darte de baja cuando quieras.</span>
        </p>
      </form>
    );
  }

  // Default y dark: nombre opcional + email + botón, apilados
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <div className="flex gap-2 items-stretch">
        <input
          type="email"
          required
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className={inputStyles}
          aria-label="Correo electrónico"
        />
        <button
          type="submit"
          disabled={estado === "enviando" || !email.trim()}
          className={btnStyles}
        >
          {estado === "enviando" ? "…" : "Suscribirme"}
        </button>
      </div>

      {/* Nombre opcional — solo default (no en dark/footer para simplificar) */}
      {!esDark && (
        <input
          type="text"
          placeholder="Tu nombre (opcional)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={100}
          className="w-full border border-zinc-200 rounded-full px-4 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/60 focus:border-transparent transition"
        />
      )}

      {estado === "error" && (
        <p className={`text-xs ${esDark ? "text-red-400" : "text-red-600"}`}>{mensajeError}</p>
      )}
      <p className={helperStyles}>
        No enviamos spam. Puedes darte de baja cuando quieras.
      </p>
    </form>
  );
}
