import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let publicaciones: Awaited<ReturnType<typeof prisma.publicacion.findMany>> = [];
  let categorias: Awaited<ReturnType<typeof prisma.categoria.findMany>> = [];

  try {
    [publicaciones, categorias] = await Promise.all([
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
  } catch (e) {
    console.error("[DB_QUERY_ERROR]", String(e));
    console.error("[DB_QUERY_STACK]", e instanceof Error ? e.stack : "no stack");
    console.error("[ENV_DATABASE_URL]", process.env.DATABASE_URL ? "SET (length=" + process.env.DATABASE_URL.length + ")" : "NOT SET");
    console.error("[ENV_DIRECT_URL]", process.env.DIRECT_URL ? "SET" : "NOT SET");
    throw e;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          💡 Mis Ideas
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Un espacio para divulgar reflexiones, proyectos e ideas que vale la pena compartir.
        </p>
      </section>

      {/* Categorías */}
      {categorias.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Explorar por categoría
          </h2>
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorias/${cat.slug}`}
                className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors py-1.5 px-3 text-sm"
              >
                {cat.nombre}
                <span className="ml-1.5 text-brand-400">{cat._count.publicaciones}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Publicaciones recientes */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Publicaciones recientes</h2>
          <Link href="/publicaciones" className="text-sm text-brand-600 hover:underline">
            Ver todas →
          </Link>
        </div>

        {publicaciones.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✍️</p>
            <p>Aún no hay publicaciones. ¡Crea la primera desde el panel admin!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {publicaciones.map((p) => (
              <PublicacionCard key={p.id} publicacion={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
