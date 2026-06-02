import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
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
    title: pagina > 1 ? `Publicaciones — página ${pagina}` : "Publicaciones",
    description:
      "Todas las publicaciones académicas y de divulgación de Raúl Dubón.",
    alternates: { canonical: canonicalWithPage("/publicaciones", pagina) },
  };
}

const POR_PAGINA = 8;

const getPublicacionesData = unstable_cache(
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
    ]),
  ["publicaciones-data"],
  { revalidate: 300, tags: ["publicaciones"] }
);

export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1") || 1);

  const [publicaciones, total] = await getPublicacionesData(pagina);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-serif font-semibold text-zinc-900">Publicaciones</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {total} {total === 1 ? "publicación" : "publicaciones"}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </p>
      </div>

      {publicaciones.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded">
          <p className="text-sm">No hay publicaciones todavía.</p>
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
            baseUrl="/publicaciones"
          />
        </>
      )}
    </div>
  );
}
