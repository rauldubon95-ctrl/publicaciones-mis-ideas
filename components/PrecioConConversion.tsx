import {
  MONEDA_DEFAULT,
  convertirDesdeCentavosUSD,
  formatearMoneda,
} from "@/lib/monedas";
import { getMonedaSeleccionada, obtenerTiposCambio } from "@/lib/monedas-server";

interface Props {
  /** Precio en CENTAVOS USD (el mismo campo `precioCentavos` de la DB). */
  centavosUSD: number;
  /** Tamaño visual: 'sm' = tarjeta lista, 'md' = detalle, 'lg' = hero muro. */
  tamano?: "sm" | "md" | "lg";
  /** Muestra "≈ MX$XX referencial" o solo la conversión sin texto. Default true. */
  mostrarNotaReferencial?: boolean;
  /** Modo compacto: precio USD arriba, conversión debajo en una línea pequeña. */
  className?: string;
}

// Componente reutilizable para mostrar un precio en USD + su conversión
// referencial a la moneda que el visitante eligió.
//
// FILOSOFÍA:
//   • El PRECIO OFICIAL es siempre USD y aparece grande.
//   • La conversión es pequeña, en gris, con "≈" para dejar claro que es
//     aproximada.
//   • Si el visitante no ha elegido moneda (default USD), solo se muestra
//     "US$X.XX" — sin línea extra, sin ruido.
//
// Es un SERVER COMPONENT: lee la cookie y las tasas server-side, sin JS
// en el cliente. La conversión se calcula en el render — cero fetches
// desde el navegador.
export default async function PrecioConConversion({
  centavosUSD,
  tamano = "md",
  mostrarNotaReferencial = true,
  className = "",
}: Props) {
  const monedaSeleccionada = await getMonedaSeleccionada();

  // Formato del precio USD (siempre visible como precio oficial)
  const usdFormateado = formatearMoneda(centavosUSD / 100, "USD");

  // Tamaños tipográficos
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

  // Si la moneda seleccionada es USD (default), solo mostramos el precio USD
  // sin línea de conversión — evita ruido visual innecesario.
  if (monedaSeleccionada === MONEDA_DEFAULT) {
    return (
      <div className={className}>
        <span className={clsUSD}>{usdFormateado}</span>
      </div>
    );
  }

  // Para cualquier otra moneda, cargamos tasas y mostramos conversión.
  const { tasas } = await obtenerTiposCambio();
  const montoConvertido = convertirDesdeCentavosUSD(
    centavosUSD,
    monedaSeleccionada,
    tasas
  );
  const convertidoFormateado = formatearMoneda(montoConvertido, monedaSeleccionada);

  return (
    <div className={className}>
      <span className={clsUSD}>{usdFormateado}</span>
      <p className={clsConversion}>
        <span aria-hidden>≈ </span>
        <span className="font-medium text-zinc-600">{convertidoFormateado}</span>
        {mostrarNotaReferencial && (
          <span className="text-zinc-400">
            {" "}
            · referencial
          </span>
        )}
      </p>
    </div>
  );
}
