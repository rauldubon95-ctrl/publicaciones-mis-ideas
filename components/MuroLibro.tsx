"use client";
import { useState } from "react";

interface Props {
  libroId: string;
  titulo: string;
  precioCentavos: number;
}

export default function MuroLibro({ libroId, titulo, precioCentavos }: Props) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const precio = (precioCentavos / 100).toFixed(2);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    if (formData.get("website")) return; // honeypot

    setCargando(true);
    try {
      const res = await fetch("/api/libros/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libroId,
          email: email.trim(),
          nombre: nombre.trim() || undefined,
          website: "",
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Error inesperado. Intenta de nuevo.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de red. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mt-6 border border-amber-200 bg-linear-to-br from-amber-50 to-white rounded-2xl p-8 shadow-xs">
      <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-amber-100">
        <svg
          className="w-7 h-7 text-amber-700"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>

      <h2 className="text-center text-xl font-serif font-semibold text-zinc-900 mb-2">
        Comprar por ${precio} USD
      </h2>
      <p className="text-center text-sm text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
        Acceso permanente al PDF de{" "}
        <span className="text-zinc-700 font-medium">«{titulo}»</span>. El enlace de descarga
        te llega por correo para que puedas acceder desde cualquier dispositivo.
      </p>

      <form onSubmit={handleSubmit} className="max-w-sm mx-auto space-y-3">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            maxLength={200}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Nombre (opcional)
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={100}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all bg-white"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2"
        >
          {cargando ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Preparando el pago…
            </>
          ) : (
            <>Comprar por ${precio} USD</>
          )}
        </button>

        <p className="text-center text-xs text-zinc-400 pt-2">
          Pago seguro vía PayPal · Tarjeta o cuenta PayPal
        </p>
      </form>
    </div>
  );
}
