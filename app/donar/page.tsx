import type { Metadata } from "next";
import FormularioDonacion from "@/components/FormularioDonacion";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Apoya este proyecto",
  description:
    "Si el contenido de este espacio te ha resultado útil, considera apoyarlo con una donación.",
  alternates: { canonical: canonicalUrl("/donar") },
};

export default function DonarPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      {/* Encabezado */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-3">
          Apoya este proyecto
        </h1>
        <p className="text-zinc-500 leading-relaxed">
          Este espacio es independiente y de acceso libre. Si el contenido
          te ha resultado útil, puedes contribuir a mantenerlo.
        </p>
      </div>

      {/* Formulario de donación */}
      <div className="border border-zinc-200 rounded-2xl p-7 bg-white shadow-xs">
        <FormularioDonacion />
      </div>

      {/* Formas de apoyar sin dinero */}
      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {[
          {
            icono: "🔗",
            titulo: "Comparte",
            desc: "Comparte los artículos en redes o con personas que puedan beneficiarse.",
          },
          {
            icono: "✉️",
            titulo: "Suscríbete",
            desc: "Recibe notificaciones cuando se publique contenido nuevo.",
          },
          {
            icono: "💬",
            titulo: "Comenta",
            desc: "Tu retroalimentación mejora la calidad del contenido.",
          },
        ].map(({ icono, titulo, desc }) => (
          <div
            key={titulo}
            className="border border-zinc-100 rounded-xl p-5 text-center"
          >
            <span className="text-2xl mb-3 block">{icono}</span>
            <p className="text-sm font-semibold text-zinc-800 mb-1">{titulo}</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
