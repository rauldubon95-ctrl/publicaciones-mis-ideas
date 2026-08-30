import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import Link from "next/link";
import ComicReader from "@/components/ComicReader";
import PdfReader from "@/components/PdfReader";
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

// Detecta si la primera "página" del cómic apunta a un PDF (por extensión de URL
// o por presencia del marcador "__pdf__" en el caption). En ese caso, todo el
// cómic se renderiza con el visor PdfReader, no con el ComicReader tradicional.
function esPdf(url: string, caption: string | null): boolean {
  const limpio = url.split("?")[0].split("#")[0].toLowerCase();
  return limpio.endsWith(".pdf") || caption === "__pdf__";
}

export default async function ComicPage({ params }: Props) {
  const { slug } = await params;
  const comic = await prisma.comic.findUnique({
    where: { slug, publicado: true },
    include: { paginas: { orderBy: { orden: "asc" } } },
  });

  if (!comic) notFound();

  const primera = comic.paginas[0];
  const modoPdf = primera ? esPdf(primera.imageUrl, primera.caption) : false;

  const comicJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: comic.titulo,
    description: recortarDescripcion(comic.descripcion),
    url: canonicalUrl(`/comics/${slug}`),
    inLanguage: "es",
    author: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
    ...(comic.paginas[0]?.imageUrl && !modoPdf && { image: comic.paginas[0].imageUrl }),
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Cómics", path: "/comics" },
    { name: comic.titulo, path: `/comics/${slug}` },
  ]);

  return (
    <div className={`${modoPdf ? "max-w-5xl" : "max-w-3xl"} mx-auto px-4 sm:px-6 py-12`}>
      <JsonLd data={[comicJsonLd, breadcrumb]} />
      <TrackView tipo="comic" contenidoId={comic.id} />
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/comics" className="hover:text-zinc-600 transition-colors">Cómics</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{comic.titulo}</span>
      </nav>

      <header className="mb-8 border-b border-zinc-200 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-2">
          {modoPdf ? "Material · PDF" : "Cómic · secuencial"}
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-zinc-900 mb-3 tracking-tight">{comic.titulo}</h1>
        <p className="text-zinc-500 text-base leading-relaxed mb-4 max-w-2xl">{comic.descripcion}</p>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <time>{formatFecha(comic.creadoAt)}</time>
          {!modoPdf && <span>{comic.paginas.length} páginas</span>}
        </div>
      </header>

      {modoPdf && primera ? (
        <PdfReader
          pdfUrl={primera.imageUrl}
          titulo={comic.titulo}
          totalPaginas={null}
        />
      ) : (
        <ComicReader paginas={comic.paginas} />
      )}
    </div>
  );
}
