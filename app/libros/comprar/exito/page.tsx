import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { capturarOrdenPayPal } from "@/lib/paypal";
import {
  enviarEnlaceDescargaLibro,
  enviarNotificacionCompraLibro,
} from "@/lib/resend";

export const metadata: Metadata = {
  title: "Compra confirmada",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ pedido_id?: string; token?: string }>;
}

export default async function ComprarLibroExitoPage({ searchParams }: Props) {
  const { pedido_id, token: paypalOrderId } = await searchParams;

  let exito = false;
  let titulo = "";
  let token = "";
  let email = "";

  if (pedido_id && paypalOrderId) {
    const pedido = await prisma.pedidoLibro.findUnique({
      where: { id: pedido_id },
      select: {
        id: true, estado: true, tokenAcceso: true, libroId: true,
        emailComprador: true, nombreComprador: true, montoCentavos: true,
        libro: { select: { titulo: true, slug: true } },
      },
    });

    if (pedido) {
      titulo = pedido.libro.titulo;
      token  = pedido.tokenAcceso;
      email  = pedido.emailComprador;

      // No seteamos la cookie aquí: hacerlo durante el render de una página lanza
      // "Cookies can only be modified in a Server Action or Route Handler" en
      // Next.js 15. El botón "Descargar ahora" pasa por /leer/libro/<token>
      // (Route Handler) que sí puede setear la cookie y luego redirige al libro.
      if (pedido.estado === "COMPLETADO") {
        exito = true;
      } else {
        try {
          const captura = await capturarOrdenPayPal(paypalOrderId);
          if (captura.completado) {
            const r = await prisma.pedidoLibro.updateMany({
              where: { id: pedido.id, estado: "PENDIENTE" },
              data: { estado: "COMPLETADO", completadoAt: new Date() },
            });
            if (r.count > 0) {
              exito = true;
              // Enviar el enlace de descarga por correo desde aquí. El webhook
              // de PayPal es el respaldo, pero esta página es el camino fiable
              // (el comprador siempre vuelve aquí tras pagar). El guard
              // updateMany(estado:PENDIENTE) garantiza que solo quien hace la
              // transición PENDIENTE→COMPLETADO envía el correo: nunca doble.
              await Promise.all([
                enviarEnlaceDescargaLibro(
                  pedido.emailComprador,
                  pedido.libro.titulo,
                  pedido.tokenAcceso,
                  pedido.nombreComprador ?? undefined
                ).catch(() => {}),
                enviarNotificacionCompraLibro(
                  (pedido.montoCentavos / 100).toFixed(2),
                  pedido.libro.titulo,
                  pedido.emailComprador,
                  pedido.nombreComprador
                ).catch(() => {}),
              ]);
            }
          }
        } catch {
          // El webhook seguirá procesándolo
        }
      }
    }
  }

  if (!exito) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-3">Procesando tu compra</h1>
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
          Tu pago está siendo confirmado. Recibirás el enlace de descarga por correo en unos minutos.
        </p>
        <Link href="/libros" className="btn-primary">Ver más libros</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-3">¡Gracias por tu compra!</h1>
      <p className="text-zinc-500 leading-relaxed mb-2">
        Ya tienes acceso a <strong className="text-zinc-800">{titulo}</strong>.
      </p>
      <p className="text-zinc-500 text-sm leading-relaxed mb-8">
        También enviamos el enlace de descarga a{" "}
        <span className="font-mono text-zinc-700">{email}</span> para que puedas acceder desde cualquier dispositivo.
      </p>
      <Link href={`/leer/libro/${token}`} className="btn-primary">Descargar ahora →</Link>
    </div>
  );
}
