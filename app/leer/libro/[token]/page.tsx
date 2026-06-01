import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setearCookieAccesoLibro } from "@/lib/accesoLibro";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function LeerLibroPage({ params }: Props) {
  const { token } = await params;

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { tokenAcceso: token },
    select: {
      estado: true,
      libroId: true,
      libro: { select: { slug: true } },
    },
  });

  if (pedido && pedido.estado === "COMPLETADO") {
    await setearCookieAccesoLibro(pedido.libroId, token);
    redirect(`/libros/${pedido.libro.slug}`);
  }

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
        Enlace no válido
      </h1>
      <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
        Este enlace no es válido o la compra todavía no se ha confirmado. Si
        acabas de pagar, espera unos segundos y vuelve a hacer click en el
        enlace de tu correo. Si el problema persiste, contáctame.
      </p>
      <Link href="/libros" className="btn-primary">
        Ver libros
      </Link>
    </div>
  );
}
