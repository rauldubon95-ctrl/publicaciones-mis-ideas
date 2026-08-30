import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
import type { Metadata } from "next";
import { canonicalWithPage } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; q?: string; categoria?: string }>;
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

const POR_PAGINA = 9;

// Consulta cacheable de categorías (siempre se pide, cambia poco)
const getCategorias = unstable_cache(
  async () =>
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { publicaciones: { where: { publicado: true } } } } },
    }),
  ["categorias-listado"],
  { revalidate: 300, tags: ["categorias"] }
);

export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; q?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1") || 1);
  const q = (params.q ?? "").trim();
  const catSlug = (params.categoria ?? "").trim();

  // Filtro de la consulta (usamos objeto literal — Prisma infiere el tipo).
  const where = {
    publicado: true,
    ...(q && {
      OR: [
        { titulo: { contains: q, mode: "insensitive" as const } },
        { resumen: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(catSlug && { categoria: { slug: catSlug } }),
  };

  // No cacheamos las búsquedas dinámicas (q/categoria), solo el listado base
  const [publicaciones, total, categorias] =
    !q && !catSlug
      ? await Promise.all([
          getListadoBase(pagina),
          getTotalBase(),
          getCategorias(),
        ])
      : await Promise.all([
          prisma.publicacion.findMany({
            where,
            orderBy: { publicadoAt: "desc" },
            skip: (pagina - 1) * POR_PAGINA,
            take: POR_PAGINA,
            include: {
              categoria: true,
              etiquetas: { include: { etiqueta: true } },
              _count: { select: { comentarios: true, reacciones: true } },
            },
          }),
          prisma.publicacion.count({ where }),
          getCategorias(),
        ]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const categoriasActivas = categorias.filter((c) => c._count.publicaciones > 0);
  const categoriaActiva = catSlug
    ? categoriasActivas.find((c) => c.slug === catSlug)
    : null;

  // baseUrl para paginación preserva filtros
  const filtros = new URLSearchParams();
  if (q) filtros.set("q", q);
  if (catSlug) filtros.set("categoria", catSlug);
  const qs = filtros.toString();
  const baseUrl = qs ? `/publicaciones?${qs}` : "/publicaciones";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <header className="mb-10 lg:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-3">
          Archivo · escritos e investigación
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 mb-3 tracking-tight">
          {categoriaActiva ? categoriaActiva.nombre : "Publicaciones"}
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
          {categoriaActiva?.descripcion ??
            "Reflexiones, ensayos y notas sobre ciencias sociales, investigación y realidad latinoamericana."}
        </p>
      </header>

      {/* Filtros */}
      <div className="mb-10 pb-6 border-b border-zinc-200 space-y-4">
        {/* Búsqueda */}
        <form action="/publicaciones" method="get" className="flex gap-2 max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar en publicaciones…"
            className="flex-1 border border-zinc-200 rounded-full px-4 py-2 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/60 focus:border-transparent"
            aria-label="Buscar publicaciones"
          />
          {catSlug && <input type="hidden" name="categoria" value={catSlug} />}
          <button
            type="submit"
            className="shrink-0 inline-flex items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            Buscar
          </button>
        </form>

        {/* Chips de categorías */}
        {categoriasActivas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={q ? `/publicaciones?q=${encodeURIComponent(q)}` : "/publicaciones"}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !catSlug
                  ? "bg-zinc-900 text-white border border-zinc-900"
                  : "border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              Todas
            </Link>
            {categoriasActivas.map((cat) => {
              const activo = catSlug === cat.slug;
              const url = new URLSearchParams();
              if (q) url.set("q", q);
              url.set("categoria", cat.slug);
              return (
                <Link
                  key={cat.slug}
                  href={`/publicaciones?${url.toString()}`}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                    activo
                      ? "bg-zinc-900 text-white border border-zinc-900"
                      : "border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  <span>{cat.nombre}</span>
                  <span className={activo ? "text-zinc-300" : "text-zinc-400"}>
                    {cat._count.publicaciones}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Resultado */}
      <div className="flex items-baseline justify-between mb-6">
        <p className="text-sm text-zinc-500">
          {total === 0
            ? "Sin resultados"
            : `${total} ${total === 1 ? "publicación" : "publicaciones"}`}
          {q && ` para "${q}"`}
          {totalPaginas > 1 && ` · página ${pagina} de ${totalPaginas}`}
        </p>
        {(q || catSlug) && (
          <Link
            href="/publicaciones"
            className="text-xs text-zinc-500 hover:text-amber-700 transition-colors"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      {publicaciones.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm mb-1">No hay publicaciones que coincidan.</p>
          {(q || catSlug) && (
            <Link href="/publicaciones" className="text-xs text-amber-700 hover:underline">
              Ver todas
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicaciones.map((p) => (
              <PublicacionCard key={p.id} publicacion={p} />
            ))}
          </div>
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}

// Consultas cacheables solo cuando NO hay filtros dinámicos
const getListadoBase = unstable_cache(
  async (pagina: number) =>
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
  ["publicaciones-listado-base"],
  { revalidate: 300, tags: ["publicaciones"] }
);

const getTotalBase = unstable_cache(
  async () => prisma.publicacion.count({ where: { publicado: true } }),
  ["publicaciones-total-base"],
  { revalidate: 300, tags: ["publicaciones"] }
);
