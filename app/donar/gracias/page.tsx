import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { capturarOrdenPayPal } from "@/lib/paypal";
import { enviarNotificacionDonacion } from "@/lib/resend";

export const metadata: Metadata = {
  title: "Gracias por tu apoyo",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ donacion_id?: string; token?: string }>;
}

export default async function GraciasPage({ searchParams }: Props) {
  const { donacion_id, token: paypalOrderId } = await searchParams;

  let pagado = false;
  let monto = 0;
  let nombre = "";

  // PayPal devuelve ?token={orderId} al redirigir de vuelta
  if (donacion_id && paypalOrderId) {
    try {
      const captura = await capturarOrdenPayPal(paypalOrderId);
      if (captura.completado) {
        const montoCentavos = Math.round(parseFloat(captura.monto) * 100);
        const actualizada = await prisma.donacion.updateMany({
          where: { id: donacion_id, estado: "PENDIENTE" },
          data: { estado: "COMPLETADO" },
        });
        pagado = true;
        monto = montoCentavos;
        nombre = captura.nombre;

        // Notificar al admin solo si esta solicitud fue la que cerró la donación
        // (evita doble correo si el usuario refresca la página de gracias)
        if (actualizada.count > 0) {
          const datos = await prisma.donacion.findUnique({
            where: { id: donacion_id },
            select: { correo: true, nombre: true },
          });
          const nombreDonante = captura.nombre || datos?.nombre || "Anónimo";
          // Fire-and-forget — no bloquear la respuesta al donante si el correo falla
          enviarNotificacionDonacion(
            captura.monto,
            nombreDonante,
            datos?.correo ?? null,
            donacion_id
          ).catch(() => {});
        }
      }
    } catch {
      // Error de captura — mostrar pantalla de error
    }
  }

  if (!pagado) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-3">
          Pago no completado
        </h1>
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
          No encontramos un pago exitoso asociado a este enlace. Si realizaste
          una donación y crees que esto es un error, el cargo puede demorar
          unos minutos en confirmarse.
        </p>
        <Link href="/donar" className="btn-primary">
          Volver a donar
        </Link>
      </div>
    );
  }

  const montoDolares = (monto / 100).toFixed(2);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      {/* Icono de éxito */}
      <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-emerald-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-3">
        {nombre ? `¡Gracias, ${nombre}!` : "¡Gracias por tu apoyo!"}
      </h1>

      <p className="text-zinc-500 leading-relaxed mb-2">
        Tu donación de{" "}
        <span className="font-semibold text-zinc-800">${montoDolares} USD</span>{" "}
        ha sido procesada con éxito vía PayPal.
      </p>
      <p className="text-zinc-500 text-sm leading-relaxed mb-10">
        Tu contribución ayuda a mantener este espacio independiente y de
        acceso libre. Significa mucho.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/publicaciones" className="btn-primary">
          Leer publicaciones
        </Link>
        <Link href="/" className="btn-secondary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
