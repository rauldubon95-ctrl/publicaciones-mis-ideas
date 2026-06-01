import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { tieneAccesoLibro } from "@/lib/accesoLibro";
import { isAdminAuthorized } from "@/lib/adminAuth";
import Image from "next/image";
import Link from "next/link";
import MuroLibro from "@/components/MuroLibro";
import type { Metadata } from "next";
import { canonicalUrl, recortarDescripcion, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await prisma.libro.findUnique({ where: { slug, publicado: true } });
  if (!l) return {};
  const descripcion = recortarDescripcion(l.descripcion);
  const url = canonicalUrl(`/libros/${slug}`);
  return {
    title: l.titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "book",
      title: l.titulo,
      description: descripcion,
      url,
      siteName: SITE_NAME,
      locale: "es_ES",
      images: l.imagenPortada ? [l.imagenPortada] : undefined,
    },
    twitter: {
      card: l.imagenPortada ? "summary_large_image" : "summary",
      title: l.titulo,
      description: descripcion,
      images: l.imagenPortada ? [l.imagenPortada] : undefined,
    },
  };
}

export default async function LibroPage({ params }: Props) {
  const { slug } = await params;
  const libro = await prisma.libro.findUnique({
    where: { slug, publicado: true },
    include: { _count: { select: { descargas: true } } },
  });
  if (!libro) notFound();

  const esDePago = libro.precioCentavos != null && libro.precioCentavos > 0;

  const [adminOk, tieneAcceso] = await Promise.all([
    isAdminAuthorized(),
    esDePago ? tieneAccesoLibro(libro.id) : Promise.resolve(true),
  ]);

  const puedeDescargar = !esDePago || adminOk || tieneAcceso;

  const precio =
    libro.precioCentavos != null && libro.precioCentavos > 0
      ? `$${(libro.precioCentavos / 100).toFixed(2)} USD`
      : libro.precioCentavos === 0
      ? "Gratis"
      : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      <nav className="text-xs text-zinc-400 mb-10 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/libros" className="hover:text-zinc-600 transition-colors">Libros</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{libro.titulo}</span>
      </nav>

      {esDePago && adminOk && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 rounded px-4 py-3">
          <p className="text-sm text-blue-800 font-medium">
            Libro de pago — estás viendo el contenido completo porque eres admin. Los visitantes deben comprarlo para descargar.
          </p>
          <Link href={`/admin/libros/editar/${libro.id}`} className="shrink-0 text-xs font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700">
            Editar precio
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-[auto_1fr] gap-10 items-start">
        {/* Portada */}
        <div className="mx-auto sm:mx-0">
          <div
            className="rounded-2xl overflow-hidden shadow-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center"
            style={{ width: 220, minHeight: 300 }}
          >
            {libro.imagenPortada ? (
              <Image
                src={libro.imagenPortada}
                alt={libro.titulo}
                width={220}
                height={330}
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-zinc-100" style={{ height: 330 }}>
                <svg className="w-20 h-20 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Detalles */}
        <div className="flex flex-col gap-5">
          <h1 className="text-3xl font-serif font-semibold text-zinc-900 leading-tight">
            {libro.titulo}
          </h1>

          <p className="text-zinc-600 leading-relaxed text-base">
            {libro.descripcion}
          </p>

          {/* Metadatos */}
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500 border-t border-zinc-100 pt-4">
            {libro.paginas && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{libro.paginas} páginas</span>
              </div>
            )}
            {precio && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-zinc-700">{precio}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{libro._count.descargas} descargas</span>
            </div>
          </div>

          {/* Botón o muro de pago */}
          {puedeDescargar ? (
            <>
              <a
                href={`/api/libros/${libro.slug}/descargar`}
                className="inline-flex items-center justify-center gap-2.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-base shadow-sm w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar PDF
              </a>
              <p className="text-xs text-zinc-400">
                Al descargar aceptas el uso personal del documento.
              </p>
            </>
          ) : (
            <MuroLibro
              libroId={libro.id}
              titulo={libro.titulo}
              precioCentavos={libro.precioCentavos!}
            />
          )}
        </div>
      </div>
    </main>
  );
}
