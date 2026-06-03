// Página a la que PayPal redirige tras aprobar el pago de un artículo premium.
// Captura la orden, marca el pedido como COMPLETADO si aún no lo está, setea
// la cookie de acceso para que el comprador pueda leer el artículo de inmediato
// en este navegador, y muestra el enlace al artículo.
//
// El webhook PayPal hace lo mismo en paralelo y envía el correo con el enlace
// mágico. La idempotencia del PedidoContenido (updateMany WHERE estado=PENDIENTE)
// garantiza que ninguno duplique trabajo.

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { capturarOrdenPayPal } from "@/lib/paypal";
import { enviarEnlaceAccesoContenido } from "@/lib/resend";

export const metadata: Metadata = {
  title: "Compra confirmada",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ pedido_id?: string; token?: string }>;
}

export default async function ComprarExitoPage({ searchParams }: Props) {
  const { pedido_id, token: paypalOrderId } = await searchParams;

  let exito = false;
  let titulo = "";
  let token = "";
  let email = "";

  if (pedido_id && paypalOrderId) {
    const pedido = await prisma.pedidoContenido.findUnique({
      where: { id: pedido_id },
      select: {
        id: true,
        estado: true,
        tokenAcceso: true,
        publicacionId: true,
        emailComprador: true,
        nombreComprador: true,
        publicacion: { select: { titulo: true, slug: true } },
      },
    });

    if (pedido) {
      titulo = pedido.publicacion.titulo;
      token = pedido.tokenAcceso;
      email = pedido.emailComprador;

      // La cookie NO se setea aquí (lanza error en render de página en Next 15).
      // El botón pasa por /leer/<token> (Route Handler) que setea la cookie.
      if (pedido.estado === "COMPLETADO") {
        exito = true;
      } else {
        try {
          const captura = await capturarOrdenPayPal(paypalOrderId);
          if (captura.completado) {
            const r = await prisma.pedidoContenido.updateMany({
              where: { id: pedido.id, estado: "PENDIENTE" },
              data: { estado: "COMPLETADO", completadoAt: new Date() },
            });
            if (r.count > 0) {
              exito = true;
              // Enviar el correo con el enlace mágico desde aquí (camino fiable).
              // El webhook es respaldo; el guard updateMany(estado:PENDIENTE)
              // garantiza un único envío.
              await enviarEnlaceAccesoContenido(
                pedido.emailComprador,
                pedido.publicacion.titulo,
                pedido.publicacion.slug,
                pedido.tokenAcceso,
                pedido.nombreComprador
              ).catch(() => {});
            }
          }
        } catch {
          // Captura falló; el webhook seguirá intentándolo. Mostramos pendiente.
        }
      }
    }
  }

  if (!exito) {
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
          Procesando tu compra
        </h1>
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
          Tu pago está siendo confirmado. En cuanto se complete recibirás un
          correo con el enlace para acceder al artículo. Si pagaste hace más de
          un minuto y no recibes el correo, escríbeme.
        </p>
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
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
        ¡Gracias por tu compra!
      </h1>

      <p className="text-zinc-500 leading-relaxed mb-2">
        Ya tienes acceso al artículo{" "}
        <strong className="text-zinc-800">{titulo}</strong>.
      </p>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        También enviamos el enlace de acceso a{" "}
        <span className="font-mono text-zinc-700">{email}</span> para que puedas
        volver a leerlo desde cualquier dispositivo.
      </p>

      <Link href={`/leer/${token}`} className="btn-primary">
        Leer el artículo →
      </Link>
    </div>
  );
}
