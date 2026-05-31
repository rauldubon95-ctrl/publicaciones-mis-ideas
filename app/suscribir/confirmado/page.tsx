import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suscripción confirmada",
  robots: { index: false },
};

export default function SuscribirConfirmadoPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-3">
        ¡Suscripción confirmada!
      </h1>
      <p className="text-zinc-500 text-base leading-relaxed mb-8">
        Ya estás suscrito. Recibirás un correo cada vez que publique algo nuevo.
      </p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
