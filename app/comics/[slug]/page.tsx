import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import Link from "next/link";
import ComicReader from "@/components/ComicReader";
import TrackView from "@/components/TrackView";
import JsonLd from "@/components/JsonLd";
import type { Metadata } from "next";
import { BASE_URL, breadcrumbJsonLd, canonicalUrl, ogImagenes, recortarDescripcion, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.comic.findUnique({ where: { slug } });
  if (!c) return {};
  const descripcion = recortarDescripcion(c.descripcion);
  const url = canonicalUrl(`/comics/${slug}`);
  return {
    title: c.titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: c.titulo,
      description: descripcion,
      url,
      siteName: SITE_NAME,
      locale: "es_ES",
      images: ogImagenes(),
    },
    twitter: {
      card: "summary_large_image",
      title: c.titulo,
      description: descripcion,
      images: ogImagenes().map((i) => i.url),
    },
  };
}

export default async function ComicPage({ params }: Props) {
  const { slug } = await params;
  const comic = await prisma.comic.findUnique({
    where: { slug, publicado: true },
    include: { paginas: { orderBy: { orden: "asc" } } },
  });

  if (!comic) notFound();

  const comicJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: comic.titulo,
    description: recortarDescripcion(comic.descripcion),
    url: canonicalUrl(`/comics/${slug}`),
    inLanguage: "es",
    author: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
    ...(comic.paginas[0]?.imageUrl && { image: comic.paginas[0].imageUrl }),
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Cómics", path: "/comics" },
    { name: comic.titulo, path: `/comics/${slug}` },
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <JsonLd data={[comicJsonLd, breadcrumb]} />
      <TrackView tipo="comic" contenidoId={comic.id} />
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/comics" className="hover:text-zinc-600 transition-colors">Cómics</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{comic.titulo}</span>
      </nav>

      <header className="mb-10 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-2">{comic.titulo}</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-3">{comic.descripcion}</p>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <time>{formatFecha(comic.creadoAt)}</time>
          <span>{comic.paginas.length} páginas</span>
        </div>
      </header>

      <ComicReader paginas={comic.paginas} />
    </div>
  );
}
