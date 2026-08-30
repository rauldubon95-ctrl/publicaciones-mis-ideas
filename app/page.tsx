import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Paginacion from "@/components/Paginacion";
import SubscriptionForm from "@/components/SubscriptionForm";
import NovedadesSidebar from "@/components/NovedadesSidebar";
import HeroIlustracion from "@/components/HeroIlustracion";
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

const POR_PAGINA_HOME = 4;

const getHomeData = unstable_cache(
  async (pagina: number) =>
    Promise.all([
      prisma.publicacion.findMany({
        where: { publicado: true },
        orderBy: { publicadoAt: "desc" },
        skip: (pagina - 1) * POR_PAGINA_HOME,
        take: POR_PAGINA_HOME,
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
  ["home-data-v2"],
  { revalidate: 300, tags: ["publicaciones", "categorias"] }
);

async function getNovedades() {
  return prisma.novedad.findMany({
    where: {
      activo: true,
      OR: [{ expiraAt: null }, { expiraAt: { gt: new Date() } }],
    },
    orderBy: [{ orden: "asc" }, { creadoAt: "desc" }],
    take: 5,
    select: { id: true, titulo: true, textoCorto: true, url: true, tipo: true },
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1") || 1);

  const [publicaciones, total, categorias] = await getHomeData(pagina);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_HOME));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const novedades = paginaSegura === 1 ? await getNovedades() : [];
  const categoriasActivas = categorias.filter((c) => c._count.publicaciones > 0);

  // Páginas > 1: vista simple sólo con paginación de publicaciones
  if (paginaSegura > 1) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif font-semibold text-zinc-900">
              Publicaciones — página {paginaSegura}
            </h2>
            <Link href="/publicaciones" className="text-sm text-amber-700 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicaciones.map((p) => (
              <PublicacionCard key={p.id} publicacion={p} />
            ))}
          </div>
          <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} baseUrl="/" />
        </section>
      </div>
    );
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HERO editorial — split 2 columnas con ilustración                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#f5efe1]/60 border-b border-zinc-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-5">
              Reflexiones, proyectos e ideas
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-zinc-900 leading-[1.05] tracking-tight mb-6">
              Pensar lo social <br className="hidden sm:block" />
              para transformar <br className="hidden sm:block" />
              la realidad.
            </h1>
            <p className="text-zinc-600 text-base sm:text-lg leading-relaxed max-w-md mb-8">
              Un espacio para divulgar reflexiones, proyectos e ideas que vale la pena compartir.
            </p>
            <div id="suscribirme" className="scroll-mt-20">
              <SubscriptionForm variant="hero" />
            </div>
          </div>

          <div className="hidden lg:block">
            <HeroIlustracion />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Contenedor principal con novedades laterales opcional              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        {novedades.length > 0 && (
          <aside className="lg:hidden mb-10 border border-zinc-200 rounded-xl p-4 bg-white/60">
            <NovedadesSidebar novedades={novedades} />
          </aside>
        )}

        <div className={novedades.length > 0 ? "lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12" : ""}>
          <div className="min-w-0">
            {/* ─────────────────────────────────────────────────────────── */}
            {/* Categorías — chips horizontales                              */}
            {/* ─────────────────────────────────────────────────────────── */}
            {categoriasActivas.length > 0 && (
              <section className="mb-14">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-2xl font-serif font-semibold text-zinc-900">
                    Explora por categorías
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoriasActivas.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categorias/${cat.slug}`}
                      className="inline-flex items-center gap-2 border border-zinc-200 hover:border-amber-500 hover:bg-amber-50/40 rounded-full px-4 py-2 text-sm text-zinc-700 hover:text-amber-900 transition-colors"
                    >
                      <span>{cat.nombre}</span>
                      <span className="text-xs text-zinc-400">{cat._count.publicaciones}</span>
                    </Link>
                  ))}
                  <Link
                    href="/publicaciones"
                    className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-amber-700 px-3 py-2 transition-colors"
                  >
                    Ver todas <span aria-hidden>→</span>
                  </Link>
                </div>
              </section>
            )}

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Publicaciones destacadas — grid magazine                     */}
            {/* ─────────────────────────────────────────────────────────── */}
            <section className="mb-16">
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold text-zinc-900">
                  Publicaciones destacadas
                </h2>
                <Link
                  href="/publicaciones"
                  className="text-sm text-zinc-500 hover:text-amber-700 transition-colors"
                >
                  Ver todas las publicaciones →
                </Link>
              </div>

              {publicaciones.length === 0 ? (
                <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                  <p className="text-sm">Aún no hay publicaciones.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                  {publicaciones.map((p) => (
                    <PublicacionCard key={p.id} publicacion={p} />
                  ))}
                </div>
              )}

              {totalPaginas > 1 && (
                <div className="mt-6">
                  <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} baseUrl="/" />
                </div>
              )}
            </section>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* Libros y recursos para seguir aprendiendo                    */}
            {/* ─────────────────────────────────────────────────────────── */}
            <section className="mb-16 bg-[#f8f5ee] rounded-2xl p-8 lg:p-10 border border-zinc-200/50">
              <div className="lg:grid lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-10 items-start">
                <div className="mb-8 lg:mb-0">
                  <h2 className="text-2xl lg:text-3xl font-serif font-semibold text-zinc-900 leading-tight mb-4">
                    Libros y recursos<br />para seguir aprendiendo
                  </h2>
                  <p className="text-sm text-zinc-600 leading-relaxed mb-5">
                    Materiales que he elaborado en proyectos de investigación, docencia y consultoría. Disponibles para leer o descargar.
                  </p>
                  <Link
                    href="/recursos"
                    className="inline-flex items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
                  >
                    Explorar recursos
                  </Link>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Libros */}
                  <Link
                    href="/libros"
                    className="group bg-white rounded-xl border border-zinc-200/60 p-5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all flex flex-col"
                  >
                    <div className="w-11 h-11 rounded-full bg-amber-100/70 flex items-center justify-center mb-4 text-amber-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 mb-1">Libros</p>
                    <p className="font-serif font-semibold text-zinc-900 text-lg leading-tight mb-1">
                      Publicaciones<br />y ensayos
                    </p>
                    <span className="text-sm text-amber-700 group-hover:text-amber-900 mt-auto inline-flex items-center gap-1 pt-3">
                      Leer más <span aria-hidden>→</span>
                    </span>
                  </Link>

                  {/* Recursos */}
                  <Link
                    href="/recursos"
                    className="group bg-white rounded-xl border border-zinc-200/60 p-5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all flex flex-col"
                  >
                    <div className="w-11 h-11 rounded-full bg-amber-100/70 flex items-center justify-center mb-4 text-amber-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 mb-1">Recursos</p>
                    <p className="font-serif font-semibold text-zinc-900 text-lg leading-tight mb-1">
                      Guías, métodos<br />y datasets
                    </p>
                    <span className="text-sm text-amber-700 group-hover:text-amber-900 mt-auto inline-flex items-center gap-1 pt-3">
                      Leer más <span aria-hidden>→</span>
                    </span>
                  </Link>

                  {/* Cómics */}
                  <Link
                    href="/comics"
                    className="group bg-white rounded-xl border border-zinc-200/60 p-5 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all flex flex-col"
                  >
                    <div className="w-11 h-11 rounded-full bg-amber-100/70 flex items-center justify-center mb-4 text-amber-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-800 mb-1">Cómics</p>
                    <p className="font-serif font-semibold text-zinc-900 text-lg leading-tight mb-1">
                      Ideas contadas<br />de otra forma
                    </p>
                    <span className="text-sm text-amber-700 group-hover:text-amber-900 mt-auto inline-flex items-center gap-1 pt-3">
                      Leer más <span aria-hidden>→</span>
                    </span>
                  </Link>
                </div>
              </div>
            </section>

            {/* ─────────────────────────────────────────────────────────── */}
            {/* CTA suscripción — cierre                                    */}
            {/* ─────────────────────────────────────────────────────────── */}
            <section className="border-t border-zinc-200 pt-14 pb-4">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-3">
                  Recibe nuevas publicaciones
                </p>
                <h2 className="text-2xl lg:text-3xl font-serif font-semibold text-zinc-900 leading-tight mb-3">
                  Suscríbete al boletín
                </h2>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6 max-w-md">
                  Recibe nuevas publicaciones, recursos y reflexiones directamente en tu correo. Sin spam, cancelación inmediata.
                </p>
                <SubscriptionForm variant="hero" />
              </div>
            </section>
          </div>

          {novedades.length > 0 && (
            <aside className="hidden lg:block">
              <NovedadesSidebar novedades={novedades} />
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
