import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const POR_PAGINA = 8;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.categoria.findUnique({ where: { slug } });
  if (!cat) return {};

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org";

  return {
    title: cat.nombre,
    description: cat.descripcion ?? `Publicaciones sobre ${cat.nombre} en Raúl Dubón`,
    alternates: {
      canonical: `/categorias/${slug}`,
    },
    openGraph: {
      title: `${cat.nombre} | Raúl Dubón`,
      description: cat.descripcion ?? `Publicaciones sobre ${cat.nombre}`,
      url: `${BASE_URL}/categorias/${slug}`,
      type: "website",
    },
  };
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const pagina = Math.max(1, parseInt(sp.pagina ?? "1") || 1);

  const categoria = await prisma.categoria.findUnique({ where: { slug } });
  if (!categoria) notFound();

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

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-zinc-400 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/publicaciones" className="hover:text-zinc-600 transition-colors">Publicaciones</Link>
        <span>/</span>
        <span className="text-zinc-600">{categoria.nombre}</span>
      </nav>

      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-start gap-4">
        {categoria.icono && (
          <span className="text-3xl leading-none mt-1">{categoria.icono}</span>
        )}
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">{categoria.nombre}</h1>
          {categoria.descripcion && (
            <p className="text-zinc-500 text-sm mt-1 leading-relaxed">{categoria.descripcion}</p>
          )}
          <p className="text-zinc-400 text-xs mt-2">
            {total} {total === 1 ? "publicación" : "publicaciones"}
            {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
          </p>
        </div>
      </div>

      {publicaciones.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded">
          <p className="text-sm">No hay publicaciones en esta categoría.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
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
