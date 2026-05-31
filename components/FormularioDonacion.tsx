"use client";
import { useState } from "react";

const MONTOS_PREDEFINIDOS = [
  { etiqueta: "$3", centavos: 300 },
  { etiqueta: "$5", centavos: 500 },
  { etiqueta: "$10", centavos: 1000 },
  { etiqueta: "$25", centavos: 2500 },
];

export default function FormularioDonacion() {
  const [montoSeleccionado, setMontoSeleccionado] = useState<number | null>(500);
  const [montoPersonalizado, setMontoPersonalizado] = useState("");
  const [usarPersonalizado, setUsarPersonalizado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  function montoCentavos(): number {
    if (usarPersonalizado) {
      const val = parseFloat(montoPersonalizado.replace(",", "."));
      return isNaN(val) ? 0 : Math.round(val * 100);
    }
    return montoSeleccionado ?? 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const monto = montoCentavos();
    if (monto < 100) {
      setError("El monto mínimo es $1.00.");
      return;
    }
    if (monto > 1_000_000) {
      setError("El monto máximo es $10,000.00.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    if (formData.get("website")) return; // honeypot silencioso

    setCargando(true);
    try {
      const res = await fetch("/api/donaciones/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto,
          nombre: nombre.trim() || undefined,
          correo: correo.trim() || undefined,
          website: "", // honeypot explícito (siempre vacío desde humanos)
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot oculto */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      {/* Selector de monto */}
      <div>
        <p className="text-sm font-medium text-zinc-700 mb-3">
          Elige un monto
        </p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {MONTOS_PREDEFINIDOS.map(({ etiqueta, centavos }) => (
            <button
              key={centavos}
              type="button"
              onClick={() => {
                setMontoSeleccionado(centavos);
                setUsarPersonalizado(false);
                setError("");
              }}
              className={`py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                !usarPersonalizado && montoSeleccionado === centavos
                  ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {/* Monto personalizado */}
        <div>
          <button
            type="button"
            onClick={() => {
              setUsarPersonalizado(true);
              setMontoSeleccionado(null);
              setError("");
            }}
            className={`w-full py-2.5 rounded-lg border text-sm transition-all text-left px-3 ${
              usarPersonalizado
                ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                : "border-zinc-200 bg-white text-zinc-400 hover:border-amber-300"
            }`}
          >
            {usarPersonalizado ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium">$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={montoPersonalizado}
                  onChange={(e) => {
                    setMontoPersonalizado(e.target.value);
                    setError("");
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-zinc-800 font-semibold outline-none placeholder:text-zinc-300"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-zinc-400 text-xs">USD</span>
              </div>
            ) : (
              <span>Otro monto…</span>
            )}
          </button>
        </div>
      </div>

      {/* Campos opcionales */}
      <div className="space-y-3">
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
            className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Correo electrónico (opcional)
          </label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            maxLength={200}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-300 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          />
          <p className="text-xs text-zinc-400 mt-1">
            Solo para que Stripe pueda enviarte el recibo.
          </p>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}

      {/* Botón de envío */}
      <button
        type="submit"
        disabled={cargando || montoCentavos() < 100}
        className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {cargando ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Preparando el pago…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.824l-1.108 7.01h3.237c.524 0 .968-.382 1.05-.9l.893-5.654c.082-.518.527-.9 1.05-.9h.663c4.298 0 7.664-1.748 8.647-6.797.27-1.39.106-2.56-.834-3.554z" />
            </svg>
            Donar con PayPal
          </>
        )}
      </button>

      {/* Badge de seguridad */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <svg
          className="w-3.5 h-3.5 text-zinc-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <span>Pago seguro vía PayPal · No guardamos datos de tarjeta</span>
      </div>
    </form>
  );
}
