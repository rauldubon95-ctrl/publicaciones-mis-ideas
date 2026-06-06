"use client";
import { useState } from "react";

type Estado = "idle" | "enviando" | "ok" | "error";

export default function SubscriptionForm() {
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
        const data = await res.json() as { error?: string };
        setMensajeError(data.error ?? "Error al procesar la solicitud.");
        setEstado("error");
      }
    } catch {
      setMensajeError("Error de conexión. Intenta de nuevo.");
      setEstado("error");
    }
  }

  if (estado === "ok") {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-medium text-zinc-800 text-sm mb-1">Revisa tu correo</p>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Te enviamos un enlace de confirmación. Haz clic en él para activar tu suscripción.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      {/* Honeypot — oculto para usuarios reales */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <input
        type="text"
        placeholder="Tu nombre (opcional)"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={100}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
      />

      <div className="flex gap-2">
        <input
          type="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={estado === "enviando" || !email.trim()}
          className="btn-primary shrink-0 disabled:opacity-50 text-sm"
        >
          {estado === "enviando" ? "Enviando…" : "Suscribirse"}
        </button>
      </div>

      {estado === "error" && (
        <p className="text-xs text-red-600">{mensajeError}</p>
      )}

      <p className="text-xs text-zinc-400 leading-relaxed">
        Recibirás un correo de confirmación. Sin spam. Puedes cancelar cuando quieras.
      </p>
    </form>
  );
}
