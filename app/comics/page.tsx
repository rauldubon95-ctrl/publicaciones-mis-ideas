import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cómics" };

export default async function ComicsPage() {
  const comics = await prisma.comic.findMany({
    where: { publicado: true },
    orderBy: { creadoAt: "desc" },
    include: { _count: { select: { paginas: true } }, paginas: { take: 1, orderBy: { orden: "asc" } } },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <section className="mb-12 border-b border-zinc-200 pb-10">
        <h1 className="text-5xl font-serif font-semibold text-zinc-900 mb-4">Cómics</h1>
        <p className="text-zinc-500 text-base leading-relaxed max-w-xl">
          Aprendizaje visual en formato secuencial. Historias e ideas que se entienden mejor en imágenes.
        </p>
      </section>

      {comics.length === 0 ? (
        <div className="text-center py-20 text-zinc-300 border border-dashed border-zinc-200">
          <p className="text-sm">No hay cómics publicados aún.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {comics.map((c) => (
            <Link
              key={c.id}
              href={`/comics/${c.slug}`}
              className="card block overflow-hidden group"
            >
              {/* Miniatura */}
              {c.paginas[0] ? (
                <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.paginas[0].imageUrl}
                    alt={c.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-zinc-100 flex items-center justify-center">
                  <span className="text-zinc-300 text-sm">Sin portada</span>
                </div>
              )}
              <div className="p-5">
                <h2 className="font-serif font-semibold text-zinc-900 group-hover:text-brand-700 transition-colors text-lg mb-1">
                  {c.titulo}
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2 mb-3">
                  {c.descripcion}
                </p>
                <div className="flex items-center justify-between">
                  <time className="text-xs text-zinc-400">{formatFecha(c.creadoAt)}</time>
                  <span className="text-xs text-zinc-400">{c._count.paginas} páginas</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
