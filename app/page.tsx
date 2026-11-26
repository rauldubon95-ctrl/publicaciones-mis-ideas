import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import SubscriptionForm from "@/components/SubscriptionForm";
import NovedadesSidebar from "@/components/NovedadesSidebar";
import AutorDestacado from "@/components/AutorDestacado";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";
import { SERIES } from "@/lib/series";
import { formatoMinutos, minutosPorSlug } from "@/lib/lectura";
import { AUTOR } from "@/lib/autor";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

const RECIENTES = 7; // 1 destacado + 6 en el índice
const SERIES_EN_PORTADA = 3;

const unidadPlural = { Capítulo: "capítulos", Parte: "partes", Artículo: "artículos" } as const;

const getHomeData = unstable_cache(
  async () => {
    const slugsSeries = SERIES.flatMap((s) => s.capitulos.map((c) => c.slug));
    const [recientes, total, categorias, capitulos] = await Promise.all([
      prisma.publicacion.findMany({
        where: { publicado: true },
        orderBy: { publicadoAt: "desc" },
        take: RECIENTES,
        select: {
          slug: true,
          titulo: true,
          resumen: true,
          publicadoAt: true,
          categoria: { select: { nombre: true, slug: true } },
        },
      }),
      prisma.publicacion.count({ where: { publicado: true } }),
      prisma.categoria.findMany({
        orderBy: { nombre: "asc" },
        select: {
          nombre: true,
          slug: true,
          descripcion: true,
          _count: { select: { publicaciones: { where: { publicado: true } } } },
        },
      }),
      prisma.publicacion.findMany({
        where: { publicado: true, slug: { in: slugsSeries } },
        select: { slug: true, titulo: true },
      }),
    ]);
    const minutos = await minutosPorSlug([...recientes.map((p) => p.slug), ...slugsSeries]);
    return { recientes, total, categorias, capitulos, minutos };
  },
  ["home-data-v4"],
  { revalidate: 300, tags: ["publicaciones", "categorias"] },
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

const MAS_PARA_ESTUDIAR = [
  { href: "/libros", nombre: "Libros", texto: "Obras completas para leer o descargar." },
  { href: "/recursos", nombre: "Recursos", texto: "Guías, materiales interactivos y métodos de investigación." },
  { href: "/comics", nombre: "Cómics", texto: "Ideas de las ciencias sociales en formato visual." },
  { href: "/dashboard", nombre: "Dashboard", texto: "Tableros y plantillas de datos." },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  // La portada ya no se pagina: las páginas viejas (/?pagina=N, 4 por página)
  // llevan a la página equivalente del archivo (/publicaciones, 8 por página).
  const pagina = parseInt((await searchParams).pagina ?? "1") || 1;
  if (pagina > 1) redirect(`/publicaciones?pagina=${Math.ceil(pagina / 2)}`);

  const [{ recientes, total, categorias, capitulos, minutos }, novedades] = await Promise.all([
    getHomeData(),
    getNovedades(),
  ]);

  const tituloPorSlug = Object.fromEntries(capitulos.map((c) => [c.slug, c.titulo]));
  const series = SERIES.map((s) => {
    const publicados = s.capitulos.filter((c) => tituloPorSlug[c.slug]);
    return {
      ...s,
      publicados,
      minutosTotales: publicados.reduce((acc, c) => acc + (minutos[c.slug] ?? 0), 0),
      primero: publicados[0] ? { slug: publicados[0].slug, titulo: tituloPorSlug[publicados[0].slug] } : null,
    };
  }).filter((s) => s.publicados.length > 1);

  const categoriasActivas = categorias.filter((c) => c._count.publicaciones > 0);
  const [destacada, ...resto] = recientes;

  return (
    <>
      {/* Presentación + lo último */}
      <section className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 lg:pt-20 lg:pb-20 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0">
            <h1 className="font-serif font-semibold text-zinc-900 text-[clamp(2.25rem,1.5rem+2.8vw,3.75rem)] leading-[1.08] tracking-tight text-balance">
              Pensar lo social para transformar la realidad.
            </h1>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-zinc-700 max-w-xl text-pretty">
              Ensayos, investigaciones y libros por capítulos sobre ideología, clases sociales, Estado y
              desigualdad en América Latina y El Salvador.
            </p>

            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [total, "textos publicados"],
                [series.length, "series para leer en orden"],
                [categoriasActivas.length, "temas"],
              ].map(([n, etiqueta]) => (
                <div key={etiqueta} className="flex flex-col-reverse">
                  <dt className="text-sm text-zinc-600">{etiqueta}</dt>
                  <dd className="font-serif text-3xl font-semibold text-zinc-900">{n}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="#series"
                className="inline-flex items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Empezar por una serie
              </Link>
              <Link
                href="/publicaciones"
                className="inline-flex items-center rounded-full border border-zinc-400 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900 transition-colors"
              >
                Ver todas las publicaciones
              </Link>
            </div>

            <p className="mt-8 text-sm text-zinc-600">
              Por{" "}
              <Link href="/sobre-mi" className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-900">
                {AUTOR.nombre}
              </Link>{" "}
              · {AUTOR.titulo}
            </p>
          </div>

          {destacada && (
            <div className="min-w-0 lg:border-l lg:border-zinc-200 lg:pl-12">
              <h2 className="text-sm font-medium text-zinc-600 mb-5">Lo último</h2>
              <PublicacionCard publicacion={destacada} minutos={minutos[destacada.slug]} variante="destacado" />
            </div>
          )}
        </div>
      </section>

      {/* Series */}
      {series.length > 0 && (
        <section id="series" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-semibold text-zinc-900">Series para leer en orden</h2>
              <p className="mt-3 text-zinc-700 leading-relaxed text-pretty">
                Libros por capítulos e investigaciones encadenadas. Cada texto indica en qué parte de la serie
                estás y cuál es el siguiente.
              </p>
            </div>
            <Link href="/series" className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-900">
              Todas las series ({series.length})
            </Link>
          </div>

          <ul className="grid gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {series.slice(0, SERIES_EN_PORTADA).map((s) => (
              <li key={s.slug} className="group relative border-t-2 border-zinc-900 pt-5">
                <p className="text-sm text-zinc-600">
                  {s.publicados.length} {unidadPlural[s.unidad]}
                  {s.minutosTotales > 0 && <> · {formatoMinutos(s.minutosTotales)} de lectura</>}
                </p>
                <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-zinc-900 text-balance">
                  <Link href={`/series/${s.slug}`} className="after:absolute after:inset-0 decoration-1 underline-offset-4 group-hover:underline">
                    {s.titulo}
                  </Link>
                </h3>
                <p className="mt-3 text-zinc-700 leading-relaxed text-pretty">{s.descripcion}</p>
                {s.primero && (
                  <p className="mt-4 text-sm text-zinc-600">
                    Empieza por: <span className="text-zinc-900">{s.primero.titulo}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Publicado recientemente */}
      {resto.length > 0 && (
        <section className="bg-white border-y border-zinc-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <h2 className="font-serif text-3xl font-semibold text-zinc-900">Publicado recientemente</h2>
              <Link href="/publicaciones" className="text-sm font-medium text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-900">
                Archivo completo ({total})
              </Link>
            </div>
            <div className="border-b border-zinc-200">
              {resto.map((p) => (
                <PublicacionCard key={p.slug} publicacion={p} minutos={minutos[p.slug]} variante="lista" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Temas + autor */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20 grid gap-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0 grid gap-14 md:grid-cols-2 md:gap-12">
          {categoriasActivas.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-zinc-900">Temas</h2>
              <ul className="mt-5 border-t border-zinc-200">
                {categoriasActivas.map((c) => (
                  <li key={c.slug} className="border-b border-zinc-200">
                    <Link href={`/categorias/${c.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
                      <span className="font-serif text-lg text-zinc-900 group-hover:underline underline-offset-4 decoration-1">
                        {c.nombre}
                      </span>
                      <span className="shrink-0 text-sm text-zinc-600">{c._count.publicaciones} textos</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-900">Más para estudiar</h2>
            <ul className="mt-5 border-t border-zinc-200">
              {MAS_PARA_ESTUDIAR.map((m) => (
                <li key={m.href} className="border-b border-zinc-200">
                  <Link href={m.href} className="group block py-4">
                    <span className="font-serif text-lg text-zinc-900 group-hover:underline underline-offset-4 decoration-1">
                      {m.nombre}
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-600">{m.texto}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-8">
          <AutorDestacado />
          {novedades.length > 0 && <NovedadesSidebar novedades={novedades} />}
        </aside>
      </section>

      {/* Boletín: una sola vez, al final */}
      <section id="suscribirme" className="scroll-mt-24 border-t border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-900">Boletín</h2>
            <p className="mt-2 text-zinc-700 leading-relaxed max-w-md text-pretty">
              Un correo cuando publico un texto o un capítulo nuevo.
            </p>
          </div>
          <SubscriptionForm variant="hero" />
        </div>
      </section>
    </>
  );
}
