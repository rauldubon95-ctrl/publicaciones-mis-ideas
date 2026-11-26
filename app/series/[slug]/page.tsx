import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { serieDeSlug, rotuloCapitulo } from "@/lib/series";
import { formatoMinutos, minutosPorSlug } from "@/lib/lectura";
import { breadcrumbJsonLd, canonicalUrl } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const serie = serieDeSlug((await params).slug);
  if (!serie) return {};
  return {
    title: serie.titulo,
    description: serie.descripcion,
    alternates: { canonical: canonicalUrl(`/series/${serie.slug}`) },
  };
}

export default async function SeriePage({ params }: Props) {
  const serie = serieDeSlug((await params).slug);
  if (!serie) notFound();

  const slugs = serie.capitulos.map((c) => c.slug);
  const [publicadas, minutos] = await Promise.all([
    prisma.publicacion.findMany({
      where: { publicado: true, slug: { in: slugs } },
      select: { slug: true, titulo: true, resumen: true },
    }),
    minutosPorSlug(slugs),
  ]);
  const porSlug = Object.fromEntries(publicadas.map((p) => [p.slug, p]));
  const capitulos = serie.capitulos
    .map((c, indice) => ({ ...c, indice, pub: porSlug[c.slug] }))
    .filter((c) => c.pub);
  if (capitulos.length === 0) notFound();

  const total = capitulos.reduce((acc, c) => acc + (minutos[c.slug] ?? 0), 0);
  const primero = capitulos[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: serie.titulo,
    description: serie.descripcion,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: capitulos.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: canonicalUrl(`/publicaciones/${c.slug}`),
      name: c.pub.titulo,
    })),
  };
  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Series", path: "/series" },
    { name: serie.titulo, path: `/series/${serie.slug}` },
  ]);

  let seccionAnterior: string | undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <JsonLd data={[jsonLd, breadcrumb]} />
      <nav aria-label="Ruta de navegación" className="mb-8 text-sm text-zinc-600">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link href="/" className="hover:text-zinc-900">Inicio</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/series" className="hover:text-zinc-900">Series</Link></li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <div className="min-w-0 max-w-[44rem]">
          <header className="mb-10">
            <h1 className="font-serif font-semibold text-zinc-900 text-[clamp(2.25rem,1.6rem+2.2vw,3.25rem)] leading-[1.1] tracking-tight text-balance">
              {serie.titulo}
            </h1>
            <p className="mt-5 text-xl leading-relaxed text-zinc-700 font-serif text-pretty">{serie.descripcion}</p>
          </header>

          <ol className="border-t border-zinc-300">
            {capitulos.map((c) => {
              const cabecera = c.seccion && c.seccion !== seccionAnterior ? c.seccion : null;
              seccionAnterior = c.seccion;
              return (
                <li key={c.slug}>
                  {cabecera && (
                    <p className="pt-8 pb-2 text-sm font-medium text-amber-800">{cabecera}</p>
                  )}
                  <Link href={`/publicaciones/${c.slug}`} className="group grid gap-1 border-b border-zinc-200 py-6 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
                    <span className="text-sm text-zinc-600 sm:pt-1">{rotuloCapitulo(serie, c.indice).replace(/ de \d+$/, "")}</span>
                    <span className="min-w-0">
                      <span className="block font-serif text-xl sm:text-2xl font-semibold leading-snug text-zinc-900 group-hover:underline underline-offset-4 decoration-1 text-balance">
                        {c.pub.titulo}
                      </span>
                      {c.pub.resumen && (
                        <span className="mt-2 block text-zinc-600 leading-relaxed line-clamp-2 text-pretty">{c.pub.resumen}</span>
                      )}
                      {minutos[c.slug] ? (
                        <span className="mt-2 block text-sm text-zinc-500">{formatoMinutos(minutos[c.slug])} de lectura</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="lg:pt-2">
          <div className="lg:sticky lg:top-24 rounded-lg border border-zinc-300 bg-white p-6">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <div className="flex flex-col-reverse">
                <dt className="text-sm text-zinc-600">{serie.unidad === "Capítulo" ? "capítulos" : serie.unidad === "Parte" ? "partes" : "artículos"} publicados</dt>
                <dd className="font-serif text-3xl font-semibold text-zinc-900">{capitulos.length}</dd>
              </div>
              {total > 0 && (
                <div className="flex flex-col-reverse">
                  <dt className="text-sm text-zinc-600">de lectura en total</dt>
                  <dd className="font-serif text-3xl font-semibold text-zinc-900">{formatoMinutos(total)}</dd>
                </div>
              )}
            </dl>
            <Link
              href={`/publicaciones/${primero.slug}`}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Empezar a leer
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
