import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
import CentroCategoriasGrid from "@/components/CentroCategoriasGrid";
import SubscriptionForm from "@/components/SubscriptionForm";
import type { Metadata } from "next";
import { canonicalWithPage } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1") || 1);
  return {
    alternates: { canonical: canonicalWithPage("/", pagina) },
  };
}

const POR_PAGINA = 4;

// Datos de la home cacheados (ISR a nivel de datos). Se revalida cada 5 min o
// vía revalidateTag("publicaciones"/"categorias"). formatFecha hace new Date()
// sobre el valor serializado, así que las fechas siguen funcionando.
const getHomeData = unstable_cache(
  async (pagina: number) =>
    Promise.all([
      prisma.publicacion.findMany({
        where: { publicado: true },
        orderBy: { publicadoAt: "desc" },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        include: {
          categoria: true,
          etiquetas: { include: { etiqueta: true } },
          _count: { select: { comentarios: true, reacciones: true } },
        },
      }),
      prisma.publicacion.count({ where: { publicado: true } }),
      prisma.categoria.findMany({
        orderBy: { nombre: "asc" },
        include: {
          _count: { select: { publicaciones: { where: { publicado: true } } } },
        },
      }),
    ]),
  ["home-data"],
  { revalidate: 300, tags: ["publicaciones", "categorias"] }
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1") || 1);

  const [publicaciones, total, categorias] = await getHomeData(pagina);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      {/* Hero — solo en la primera página */}
      {paginaSegura === 1 && (
        <section className="mb-16 border-b border-zinc-200 pb-12">
          <h1 className="text-5xl font-serif font-semibold text-zinc-900 mb-4 leading-tight">
            Raúl Dubón
          </h1>
          <p className="text-base text-zinc-500 max-w-xl leading-relaxed">
            Un espacio para divulgar reflexiones, proyectos e ideas que vale la pena compartir.
          </p>
        </section>
      )}

      {/* Categorías — solo en la primera página */}
      {paginaSegura === 1 && categorias.length > 0 && (
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

      {/* Publicaciones */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            {paginaSegura === 1 ? "Publicaciones recientes" : `Publicaciones — página ${paginaSegura}`}
          </h2>
          <Link
            href="/publicaciones"
            className="text-xs text-brand-600 hover:underline tracking-wide"
          >
            Ver todas →
          </Link>
        </div>

        {publicaciones.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded">
            <p className="text-sm">Aún no hay publicaciones.</p>
            <p className="text-xs mt-1 text-zinc-300">
              Crea la primera desde el panel de administración.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              {publicaciones.map((p) => (
                <PublicacionCard key={p.id} publicacion={p} />
              ))}
            </div>

            <Paginacion
              paginaActual={paginaSegura}
              totalPaginas={totalPaginas}
              baseUrl="/"
            />

            <p className="text-center text-xs text-zinc-400 mt-4">
              {total} {total === 1 ? "publicación" : "publicaciones"} · página {paginaSegura} de{" "}
              {totalPaginas}
            </p>
          </>
        )}
      </section>

      {/* Centro de categorías — debajo de la paginación, solo página 1 */}
      {paginaSegura === 1 && (
        <CentroCategoriasGrid categorias={categorias} />
      )}

      {/* Suscripción por correo */}
      {paginaSegura === 1 && (
        <section className="mt-16 border-t border-zinc-100 pt-12">
          <div className="max-w-md">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Recibe nuevas publicaciones
            </h2>
            <p className="text-sm text-zinc-500 mb-5 leading-relaxed">
              Suscríbete para recibir un correo cuando publique algo nuevo. Sin spam, cancelación inmediata.
            </p>
            <SubscriptionForm />
          </div>
        </section>
      )}
    </div>
  );
}
