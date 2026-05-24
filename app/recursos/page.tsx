import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recursos" };

export default async function RecursosPage() {
  const recursos = await prisma.recursoHtml.findMany({
    where: { publicado: true },
    orderBy: { creadoAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <section className="mb-12 border-b border-zinc-200 pb-10">
        <h1 className="text-5xl font-serif font-semibold text-zinc-900 mb-4">Recursos</h1>
        <p className="text-zinc-500 text-base leading-relaxed max-w-xl">
          Documentos y herramientas interactivas para consultar y descargar.
        </p>
      </section>

      {recursos.length === 0 ? (
        <div className="text-center py-20 text-zinc-300 border border-dashed border-zinc-200">
          <p className="text-sm">No hay recursos publicados aún.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {recursos.map((r) => (
            <div key={r.id} className="py-6 flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/recursos/${r.slug}`}
                  className="text-xl font-serif font-semibold text-zinc-900 hover:text-brand-700 transition-colors block mb-1"
                >
                  {r.titulo}
                </Link>
                <p className="text-sm text-zinc-500 leading-relaxed mb-2">{r.descripcion}</p>
                <time className="text-xs text-zinc-400">{formatFecha(r.creadoAt)}</time>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <Link
                  href={`/recursos/${r.slug}`}
                  className="btn-secondary text-xs py-1.5"
                >
                  Ver
                </Link>
                <a
                  href={`/api/recursos/${r.slug}/descargar`}
                  className="btn-primary text-xs py-1.5"
                >
                  Descargar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
