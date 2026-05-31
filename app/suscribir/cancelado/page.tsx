import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suscripción cancelada",
  robots: { index: false },
};

export default function SuscribirCanceladoPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </div>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-3">
        Suscripción cancelada
      </h1>
      <p className="text-zinc-500 text-base leading-relaxed mb-8">
        Tu correo ha sido eliminado de la lista. No recibirás más notificaciones.
        Siempre puedes volver a suscribirte desde el inicio.
      </p>
      <Link href="/" className="btn-secondary">
        Volver al inicio
      </Link>
    </div>
  );
}
