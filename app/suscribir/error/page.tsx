import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enlace inválido",
  robots: { index: false },
};

export default function SuscribirErrorPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-3">
        Enlace inválido o expirado
      </h1>
      <p className="text-zinc-500 text-base leading-relaxed mb-8">
        El enlace de confirmación no es válido o ya fue utilizado.
        Si quieres suscribirte, vuelve a ingresar tu correo.
      </p>
      <Link href="/" className="btn-secondary">
        Volver al inicio
      </Link>
    </div>
  );
}
