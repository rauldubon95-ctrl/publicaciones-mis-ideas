import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd } from "@/lib/seo";
import { unstable_cache } from "next/cache";

const POR_PAGINA = 8;

// Datos de la categoría cacheados. Devuelve null si la categoría no existe
// (el componente llama notFound()). Revalida cada 5 min o por tag.
const getCategoriaData = unstable_cache(
  async (slug: string, pagina: number) => {
    const categoria = await prisma.categoria.findUnique({ where: { slug } });
    if (!categoria) return null;
    const [publicaciones, total] = await Promise.all([
      prisma.publicacion.findMany({
        where: { publicado: true, categoriaId: categoria.id },
        orderBy: { publicadoAt: "desc" },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        include: {
          categoria: true,
          etiquetas: { include: { etiqueta: true } },
          _count: { select: { comentarios: true, reacciones: true } },
        },
      }),
      prisma.publicacion.count({
        where: { publicado: true, categoriaId: categoria.id },
      }),
    ]);
    return { categoria, publicaciones, total };
  },
  ["categoria-data"],
  { revalidate: 300, tags: ["publicaciones", "categorias"] }
);

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1") || 1);
  const cat = await prisma.categoria.findUnique({ where: { slug } });
  if (!cat) return {};

  const { canonicalWithPage, SITE_NAME } = await import("@/lib/seo");
  const url = canonicalWithPage(`/categorias/${slug}`, pagina);
  const descripcion = cat.descripcion ?? `Publicaciones sobre ${cat.nombre} en ${SITE_NAME}`;

  return {
    title: pagina > 1 ? `${cat.nombre} — página ${pagina}` : cat.nombre,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      title: cat.nombre,
      description: descripcion,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "es_ES",
    },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1") || 1);

  const data = await getCategoriaData(slug, pagina);
  if (!data) notFound();
  const { categoria, publicaciones, total } = data;

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Publicaciones", path: "/publicaciones" },
    { name: categoria.nombre, path: `/categorias/${slug}` },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <JsonLd data={breadcrumb} />
      <nav className="text-xs text-zinc-400 mb-6 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/publicaciones" className="hover:text-zinc-600 transition-colors">Publicaciones</Link>
        <span>/</span>
        <span className="text-zinc-600">{categoria.nombre}</span>
      </nav>

      <header className="mb-10 lg:mb-12 border-b border-zinc-200 pb-8 flex items-start gap-5">
        {categoria.icono && (
          <span className="text-4xl leading-none mt-1">{categoria.icono}</span>
        )}
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-2">
            Categoría
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 tracking-tight mb-3">
            {categoria.nombre}
          </h1>
          {categoria.descripcion && (
            <p className="text-zinc-500 text-sm sm:text-base leading-relaxed max-w-2xl">
              {categoria.descripcion}
            </p>
          )}
          <p className="text-zinc-400 text-xs mt-4">
            {total} {total === 1 ? "publicación" : "publicaciones"}
            {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
          </p>
        </div>
      </header>

      {publicaciones.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">No hay publicaciones en esta categoría.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicaciones.map((p) => (
              <PublicacionCard key={p.id} publicacion={p} />
            ))}
          </div>
          <Paginacion
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            baseUrl={`/categorias/${slug}`}
          />
        </>
      )}
    </div>
  );
}
