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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <header className="mb-12 lg:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-3">
          Biblioteca
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 tracking-tight mb-4">
          Libros
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
          Publicaciones y ensayos de mi autoría — disponibles para lectura y descarga.
        </p>
      </header>

      {libros.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-2xl p-16 text-center">
          <p className="text-zinc-400">Próximamente habrá libros disponibles aquí.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {libros.map((l) => (
            <Link
              key={l.id}
              href={`/libros/${l.slug}`}
              className="group flex flex-col"
            >
              {/* Portada — estilo estantería */}
              <div className="relative aspect-[2/3] overflow-hidden rounded-md shadow-md shadow-zinc-300/40 group-hover:shadow-xl group-hover:shadow-zinc-300/60 transition-shadow duration-300 mb-5">
                {l.imagenPortada ? (
                  <Image
                    src={l.imagenPortada}
                    alt={l.titulo}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-[#2a3d3a] via-[#1e2f2b] to-[#152420] flex flex-col p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/70 mb-3">
                      Raúl Dubón
                    </p>
                    <p className="font-serif text-amber-100 text-xl leading-tight mt-auto">
                      {l.titulo}
                    </p>
                  </div>
                )}
                {/* Sombra lateral simulando encuadernación */}
                <div className="absolute inset-y-0 left-0 w-1.5 bg-black/25" aria-hidden />
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2">
                <h2 className="font-serif font-semibold text-lg text-zinc-900 group-hover:text-amber-700 transition-colors leading-snug">
                  {l.titulo}
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">
                  {l.descripcion}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                  {l.paginas && <span>{l.paginas} páginas</span>}
                  {l.paginas != null && l.precioCentavos != null && <span aria-hidden>·</span>}
                  {l.precioCentavos != null && l.precioCentavos > 0 ? (
                    <span className="font-semibold text-zinc-700">
                      ${(l.precioCentavos / 100).toFixed(2)} USD
                    </span>
                  ) : l.precioCentavos === 0 ? (
                    <span className="font-semibold text-emerald-700">Descarga gratis</span>
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
