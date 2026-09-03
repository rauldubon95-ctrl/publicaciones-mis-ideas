"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MONEDAS, MONEDA_DEFAULT, NOMBRE_COOKIE_MONEDA, esMonedaValida } from "@/lib/monedas";

// Selector de moneda REFERENCIAL para la interfaz.
//
// Persistencia:
//   • Cookie NO-httpOnly (path=/, SameSite=Lax, 1 año). Necesitamos que el
//     browser la lea al hydratear, y que los Server Components la lean al
//     renderizar (via `cookies()`).
//   • Sin datos personales — solo el código de moneda.
//
// UX:
//   • Botón compacto: bandera + código (ej. 🇺🇸 USD).
//   • Dropdown al hacer clic.
//   • Al cambiar, refrescamos la ruta con router.refresh() para que los
//     Server Components (que leen la cookie server-side) re-rendericen los
//     precios con la nueva conversión.
//
// SEGURIDAD:
//   • esMonedaValida() protege contra valores manipulados en la cookie.
//   • El precio de cobro NUNCA depende de esta elección — solo la visualización.
export default function SelectorMoneda() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [moneda, setMoneda] = useState<string>(MONEDA_DEFAULT);
  const menuRef = useRef<HTMLDivElement>(null);

  // Al montar, lee la cookie ya existente (si la hay).
  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${NOMBRE_COOKIE_MONEDA}=`));
    if (cookie) {
      const valor = decodeURIComponent(cookie.split("=")[1] ?? "");
      if (esMonedaValida(valor)) setMoneda(valor);
    }
  }, []);

  // Cerrar el dropdown al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!abierto) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  function seleccionar(codigo: string) {
    if (!esMonedaValida(codigo)) return;
    if (codigo === moneda) {
      setAbierto(false);
      return;
    }
    setMoneda(codigo);
    // Cookie 1 año, path=/, SameSite=Lax, sin httpOnly (necesita ser legible
    // desde el cliente). Secure automático si la página se sirve por HTTPS.
    const seguro = typeof window !== "undefined" && window.location.protocol === "https:";
    const attrs = [
      `${NOMBRE_COOKIE_MONEDA}=${encodeURIComponent(codigo)}`,
      "Path=/",
      "Max-Age=31536000",
      "SameSite=Lax",
      seguro ? "Secure" : "",
    ].filter(Boolean).join("; ");
    document.cookie = attrs;
    setAbierto(false);
    // Refresca los Server Components (leen la cookie via next/headers).
    router.refresh();
  }

  const actual = MONEDAS[moneda] ?? MONEDAS[MONEDA_DEFAULT];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        aria-label={`Cambiar moneda referencial (actual: ${actual.nombre})`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <span aria-hidden className="text-sm leading-none">{actual.bandera}</span>
        <span className="tabular-nums">{actual.codigo}</span>
        <svg className={`w-3 h-3 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg shadow-zinc-200/60 py-1.5 z-50 max-h-[70vh] overflow-y-auto"
          role="listbox"
          aria-label="Monedas disponibles"
        >
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Moneda referencial
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              El cobro real es en USD via PayPal.
            </p>
          </div>
          {Object.values(MONEDAS).map((m) => {
            const activo = m.codigo === moneda;
            return (
              <button
                key={m.codigo}
                type="button"
                role="option"
                aria-selected={activo}
                onClick={() => seleccionar(m.codigo)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  activo
                    ? "bg-amber-50 text-amber-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <span aria-hidden className="text-base leading-none shrink-0">{m.bandera}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.nombre}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{m.paisPrincipal}</p>
                </div>
                <span className="text-xs font-semibold text-zinc-500 tabular-nums shrink-0">{m.codigo}</span>
                {activo && (
                  <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
