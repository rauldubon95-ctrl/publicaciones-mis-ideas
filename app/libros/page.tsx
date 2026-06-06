import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Libros",
  description: "Libros escritos por Raúl Dubón sobre ciencias sociales y realidad latinoamericana.",
  alternates: { canonical: canonicalUrl("/libros") },
};

const getLibros = unstable_cache(
  async () =>
    prisma.libro.findMany({
      where: { publicado: true },
      orderBy: { creadoAt: "desc" },
      select: {
        id: true, titulo: true, slug: true, descripcion: true,
        paginas: true, precioCentavos: true, imagenPortada: true,
      },
    }),
  ["libros-publicados"],
  { revalidate: 300, tags: ["libros"] }
);

export default async function LibrosPage() {
  const libros = await getLibros();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-semibold text-zinc-900 mb-3">Libros</h1>
        <p className="text-zinc-500 text-lg leading-relaxed max-w-2xl">
          Publicaciones de mi autoría disponibles para descarga.
        </p>
      </header>

      {libros.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl p-16 text-center">
          <p className="text-zinc-400">Próximamente habrá libros disponibles aquí.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {libros.map((l) => (
            <Link
              key={l.id}
              href={`/libros/${l.slug}`}
              className="group flex flex-col border border-zinc-200 rounded-2xl overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all bg-white"
            >
              {/* Portada */}
              <div className="relative bg-zinc-100" style={{ aspectRatio: "2/3" }}>
                {l.imagenPortada ? (
                  <Image
                    src={l.imagenPortada}
                    alt={l.titulo}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-brand-50 to-zinc-100">
                    <svg className="w-16 h-16 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5 flex flex-col gap-2 flex-1">
                <h2 className="font-serif font-semibold text-zinc-900 leading-snug group-hover:text-brand-700 transition-colors">
                  {l.titulo}
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 flex-1">
                  {l.descripcion}
                </p>
                <div className="flex items-center justify-between pt-2 mt-auto border-t border-zinc-100">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    {l.paginas && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {l.paginas} págs.
                      </span>
                    )}
                  </div>
                  {l.precioCentavos != null && l.precioCentavos > 0 ? (
                    <span className="text-xs font-semibold text-brand-700">
                      ${(l.precioCentavos / 100).toFixed(2)} USD
                    </span>
                  ) : l.precioCentavos === 0 ? (
                    <span className="text-xs font-semibold text-emerald-600">Gratis</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
