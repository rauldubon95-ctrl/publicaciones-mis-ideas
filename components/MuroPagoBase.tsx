"use client";
import { useState } from "react";

// Base compartida de los muros de pago (artículos, libros, recursos, dashboards).
// Antes eran 4 componentes ~95% idénticos copiados (MuroPago/MuroLibro/
// MuroRecurso/MuroDashboard). Ahora la lógica y el markup viven aquí una sola
// vez; cada Muro es un envoltorio delgado que pasa su configuración. Cambiar el
// muro de pago (texto, campos, estilos) se hace en un único lugar.

export interface MuroPagoBaseProps {
  /** id de la entidad a comprar (publicación, libro, recurso o tablero) */
  id: string;
  /** clave con la que viaja el id en el body del POST (publicacionId, libroId, …) */
  idField: string;
  /** endpoint de compra que crea el pedido + la orden PayPal */
  endpoint: string;
  titulo: string;
  /** encabezado, ya con el precio formateado */
  heading: string;
  /** texto antes del «título» en la descripción */
  descripcionAntes: string;
  /** texto después del «título» en la descripción */
  descripcionDespues: string;
  /** etiqueta del botón en estado normal (ya con precio) */
  botonLabel: string;
  /** MuroPago añade un envoltorio con degradado que sugiere contenido oculto encima */
  conDegradado?: boolean;
}

const CARD_CLASS =
  "border border-amber-200 bg-linear-to-br from-amber-50 to-white rounded-2xl p-8 shadow-xs";

export default function MuroPagoBase({
  id,
  idField,
  endpoint,
  titulo,
  heading,
  descripcionAntes,
  descripcionDespues,
  botonLabel,
  conDegradado = false,
}: MuroPagoBaseProps) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    if (formData.get("website")) return; // honeypot

    setCargando(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [idField]: id,
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

  const tarjeta = (
    <div className={conDegradado ? CARD_CLASS : `mt-6 ${CARD_CLASS}`}>
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
        {heading}
      </h2>
      <p className="text-center text-sm text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
        {descripcionAntes}
        <span className="text-zinc-700 font-medium">«{titulo}»</span>
        {descripcionDespues}
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
            <>{botonLabel}</>
          )}
        </button>

        <p className="text-center text-xs text-zinc-400 pt-2">
          Pago seguro vía PayPal · Tarjeta o cuenta PayPal
        </p>
      </form>
    </div>
  );

  if (conDegradado) {
    return (
      <div className="relative mt-8 mb-12">
        {/* Degradado encima del resumen para sugerir contenido oculto */}
        <div className="absolute -top-32 left-0 right-0 h-32 bg-linear-to-b from-transparent to-white pointer-events-none" />
        {tarjeta}
      </div>
    );
  }

  return tarjeta;
}
