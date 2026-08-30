import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Recursos",
  description: "Documentos, guías y materiales metodológicos publicados por Raúl Dubón.",
  alternates: { canonical: canonicalUrl("/recursos") },
};

const getRecursos = unstable_cache(
  async () =>
    prisma.recursoHtml.findMany({
      where: { publicado: true },
      orderBy: { creadoAt: "desc" },
      select: {
        id: true, titulo: true, slug: true, descripcion: true,
        creadoAt: true, esPremium: true, precioCentavos: true,
      },
    }),
  ["recursos-publicados-v2"],
  { revalidate: 300, tags: ["recursos"] }
);

export default async function RecursosPage() {
  const recursos = await getRecursos();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <header className="mb-12 lg:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-3">
          Insumos metodológicos
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 tracking-tight mb-4">
          Recursos
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
          Guías, instrumentos, metodologías, bases conceptuales y materiales técnicos disponibles para consulta y descarga.
        </p>
      </header>

      {recursos.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">No hay recursos publicados aún.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map((r) => (
            <article
              key={r.id}
              className="group flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all"
            >
              {/* Portada abstracta: papel tipografiado */}
              <Link href={`/recursos/${r.slug}`} className="block relative aspect-[16/10] bg-linear-to-br from-stone-50 to-amber-50 border-b border-zinc-100 overflow-hidden">
                {/* Simulación de páginas apiladas */}
                <div className="absolute inset-4 bg-white border border-zinc-200 rounded-sm shadow-sm p-3 flex flex-col gap-1 rotate-[-1deg]">
                  <div className="h-1 bg-zinc-200 rounded-full w-3/4"></div>
                  <div className="h-1 bg-zinc-200 rounded-full w-full"></div>
                  <div className="h-1 bg-zinc-200 rounded-full w-4/5"></div>
                  <div className="h-1 bg-zinc-200 rounded-full w-2/3"></div>
                </div>
                <div className="absolute inset-4 bg-white border border-zinc-200 rounded-sm shadow-sm p-3 flex flex-col gap-1 rotate-[1.5deg]">
                  <div className="h-1 bg-zinc-300 rounded-full w-3/5"></div>
                  <div className="h-1 bg-zinc-200 rounded-full w-full"></div>
                  <div className="h-1 bg-zinc-200 rounded-full w-4/5"></div>
                </div>
                {r.esPremium && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber-600 text-white text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3 6 6 1-4.5 4.5 1 6.5L12 17l-5.5 3 1-6.5L3 9l6-1z" />
                    </svg>
                    Premium
                  </span>
                )}
              </Link>

              <div className="flex-1 flex flex-col p-5 gap-2">
                <Link href={`/recursos/${r.slug}`}>
                  <h2 className="font-serif font-semibold text-zinc-900 text-lg leading-snug group-hover:text-amber-700 transition-colors">
                    {r.titulo}
                  </h2>
                </Link>
                <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 flex-1">
                  {r.descripcion}
                </p>
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-100">
                  <time className="text-xs text-zinc-400">{formatFecha(r.creadoAt)}</time>
                  <div className="flex items-center gap-2">
                    {r.esPremium && r.precioCentavos != null && r.precioCentavos > 0 && (
                      <span className="text-xs font-semibold text-zinc-700">
                        ${(r.precioCentavos / 100).toFixed(2)}
                      </span>
                    )}
                    <Link
                      href={`/recursos/${r.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      Consultar <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
