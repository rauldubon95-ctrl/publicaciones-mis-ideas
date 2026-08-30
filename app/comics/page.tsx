import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cómics",
  description: "Cómics, presentaciones y materiales de divulgación visual publicados por Raúl Dubón.",
  alternates: { canonical: canonicalUrl("/comics") },
};

const getComics = unstable_cache(
  async () =>
    prisma.comic.findMany({
      where: { publicado: true },
      orderBy: { creadoAt: "desc" },
      include: {
        _count: { select: { paginas: true } },
        paginas: { take: 1, orderBy: { orden: "asc" }, select: { imageUrl: true, caption: true } },
      },
    }),
  ["comics-publicados-v2"],
  { revalidate: 300, tags: ["comics"] }
);

function esPdf(url: string, caption: string | null): boolean {
  const limpio = url.split("?")[0].split("#")[0].toLowerCase();
  return limpio.endsWith(".pdf") || caption === "__pdf__";
}

export default async function ComicsPage() {
  const comics = await getComics();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <header className="mb-12 lg:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-3">
          Divulgación visual
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 tracking-tight mb-4">
          Cómics y materiales visuales
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
          Cómics, presentaciones y materiales educativos para explicar conceptos, problemas sociales e ideas complejas de forma accesible.
        </p>
      </header>

      {comics.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">No hay materiales publicados aún.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {comics.map((c) => {
            const primera = c.paginas[0];
            const pdf = primera ? esPdf(primera.imageUrl, primera.caption) : false;
            const tienePortadaImg = primera && !pdf;

            return (
              <Link
                key={c.id}
                href={`/comics/${c.slug}`}
                className="group flex flex-col bg-white rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all"
              >
                {/* Portada */}
                <div className="aspect-[4/3] bg-zinc-100 overflow-hidden relative">
                  {tienePortadaImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={primera.imageUrl}
                      alt={c.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    // Placeholder editorial para PDFs sin portada generada aún
                    <div className="w-full h-full bg-linear-to-br from-stone-100 via-amber-50 to-rose-50 flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-14 h-14 rounded-full bg-white/60 border border-amber-200/60 flex items-center justify-center mb-3 text-amber-800">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-amber-800/80">Documento</p>
                    </div>
                  )}
                  {pdf && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 text-zinc-800 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded shadow-sm">
                      PDF
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col gap-2 flex-1">
                  <h2 className="font-serif font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors text-lg leading-snug">
                    {c.titulo}
                  </h2>
                  <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2 flex-1">
                    {c.descripcion}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-100 text-xs text-zinc-400">
                    <time>{formatFecha(c.creadoAt)}</time>
                    {!pdf && <span>{c._count.paginas} páginas</span>}
                    {pdf && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        Leer <span aria-hidden>→</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
