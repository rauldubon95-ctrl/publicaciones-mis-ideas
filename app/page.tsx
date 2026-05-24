import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [publicaciones, categorias] = await Promise.all([
    prisma.publicacion.findMany({
      where: { publicado: true },
      orderBy: { publicadoAt: "desc" },
      take: 6,
      include: {
        categoria: true,
        etiquetas: { include: { etiqueta: true } },
        _count: { select: { comentarios: true, reacciones: true } },
      },
    }),
    prisma.categoria.findMany({
      include: { _count: { select: { publicaciones: { where: { publicado: true } } } } },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      {/* Hero */}
      <section className="mb-16 border-b border-zinc-200 pb-12">
        <h1 className="text-5xl font-serif font-semibold text-zinc-900 mb-4 leading-tight">
          Mis Ideas
        </h1>
        <p className="text-base text-zinc-500 max-w-xl leading-relaxed">
          Un espacio para divulgar reflexiones, proyectos e ideas que vale la pena compartir.
        </p>
      </section>

      {/* Categorías */}
      {categorias.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Categorías
          </h2>
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorias/${cat.slug}`}
                className="badge bg-white border border-zinc-200 text-zinc-600 hover:border-brand-600 hover:text-brand-700 transition-colors py-1 px-3 text-xs uppercase tracking-wider"
              >
                {cat.nombre}
                <span className="ml-1.5 text-zinc-400">{cat._count.publicaciones}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Publicaciones recientes */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Publicaciones recientes
          </h2>
          <Link href="/publicaciones" className="text-xs text-brand-600 hover:underline tracking-wide">
            Ver todas
          </Link>
        </div>

        {publicaciones.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded">
            <p className="text-sm">Aún no hay publicaciones.</p>
            <p className="text-xs mt-1 text-zinc-300">Crea la primera desde el panel de administración.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {publicaciones.map((p) => (
              <PublicacionCard key={p.id} publicacion={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
