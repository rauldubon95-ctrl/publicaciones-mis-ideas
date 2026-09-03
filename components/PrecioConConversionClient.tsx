"use client";
import { useEffect, useState } from "react";
import {
  MONEDA_DEFAULT,
  NOMBRE_COOKIE_MONEDA,
  convertirDesdeCentavosUSD,
  esMonedaValida,
  formatearMoneda,
  TASAS_FALLBACK,
  type TiposCambio,
} from "@/lib/monedas";

interface Props {
  centavosUSD: number;
  tamano?: "sm" | "md" | "lg";
  mostrarNotaReferencial?: boolean;
  className?: string;
  /** Si es true, oculta el precio USD (útil cuando otro elemento ya lo muestra)
   *  y renderiza solo la línea "≈ MX$X referencial". */
  soloConversion?: boolean;
}

// Versión CLIENT de PrecioConConversion, para usar dentro de client
// components (los 4 Muros de pago). Fetch a /api/tipos-cambio al montar
// (respuesta cacheada 1h en CDN, 24h en server) — costo despreciable.
// Lee la cookie desde document.cookie.
//
// SEGURIDAD idéntica al server:
//   • Precio USD siempre visible (no depende de nada del cliente).
//   • Conversión referencial no altera el pago real.
//   • Valida moneda con esMonedaValida antes de renderizar.
//   • Si el fetch falla, cae a TASAS_FALLBACK — nunca "roto".
export default function PrecioConConversionClient({
  centavosUSD,
  tamano = "md",
  mostrarNotaReferencial = true,
  className = "",
  soloConversion = false,
}: Props) {
  const [moneda, setMoneda] = useState<string>(MONEDA_DEFAULT);
  const [tasas, setTasas] = useState<Record<string, number>>(TASAS_FALLBACK);
  const [cargado, setCargado] = useState(false);

  // Al montar: lee cookie + fetch tasas
  useEffect(() => {
    // Cookie
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${NOMBRE_COOKIE_MONEDA}=`));
    if (cookie) {
      const valor = decodeURIComponent(cookie.split("=")[1] ?? "");
      if (esMonedaValida(valor)) setMoneda(valor);
    }

    // Tasas — sin cancelar si el componente se desmonta antes: solo
    // ignoramos el resultado.
    let cancelado = false;
    fetch("/api/tipos-cambio", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: TiposCambio) => {
        if (!cancelado && data?.tasas) setTasas(data.tasas);
      })
      .catch(() => {
        // fallback ya está en state por default
      })
      .finally(() => {
        if (!cancelado) setCargado(true);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Formato USD siempre visible
  const usdFormateado = formatearMoneda(centavosUSD / 100, "USD");

  const clsUSD =
    tamano === "lg"
      ? "text-3xl sm:text-4xl font-serif font-semibold text-zinc-900"
      : tamano === "md"
      ? "text-lg font-serif font-semibold text-zinc-900"
      : "text-sm font-semibold text-zinc-800";

  const clsConversion =
    tamano === "lg"
      ? "text-sm text-zinc-500 mt-1"
      : tamano === "md"
      ? "text-xs text-zinc-500 mt-0.5"
      : "text-[11px] text-zinc-500";

  // Sin conversión si es USD (no ruido)
  if (moneda === MONEDA_DEFAULT) {
    if (soloConversion) return null;
    return (
      <div className={className}>
        <span className={clsUSD}>{usdFormateado}</span>
      </div>
    );
  }

  const montoConvertido = convertirDesdeCentavosUSD(centavosUSD, moneda, tasas);
  const convertidoFormateado = formatearMoneda(montoConvertido, moneda);

  const lineaConversion = (
    <p className={clsConversion}>
      <span aria-hidden>≈ </span>
      <span className="font-medium text-zinc-600">{convertidoFormateado}</span>
      {mostrarNotaReferencial && (
        <span className="text-zinc-400"> · referencial{!cargado ? " (aprox.)" : ""}</span>
      )}
    </p>
  );

  if (soloConversion) {
    return <div className={className}>{lineaConversion}</div>;
  }

  return (
    <div className={className}>
      <span className={clsUSD}>{usdFormateado}</span>
      {lineaConversion}
    </div>
  );
}
