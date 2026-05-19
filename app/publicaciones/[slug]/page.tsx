import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import ComentarioForm from "@/components/ComentarioForm";
import ReaccionButtons from "@/components/ReaccionButtons";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await prisma.publicacion.findUnique({ where: { slug: params.slug } });
  if (!p) return {};
  return { title: p.titulo, description: p.resumen };
}

export default async function PublicacionPage({ params }: Props) {
  const publicacion = await prisma.publicacion.findUnique({
    where: { slug: params.slug, publicado: true },
    include: {
      categoria: true,
      etiquetas: { include: { etiqueta: true } },
      comentarios: { orderBy: { creadoAt: "asc" } },
      reacciones: true,
    },
  });

  if (!publicacion) notFound();

  const conteos = publicacion.reacciones.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/publicaciones" className="hover:text-zinc-600 transition-colors">Publicaciones</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{publicacion.titulo}</span>
      </nav>

      {/* Header */}
      <header className="mb-10 border-b border-zinc-200 pb-8">
        <div className="flex flex-wrap gap-2 mb-5">
          {publicacion.categoria && (
            <Link
              href={`/categorias/${publicacion.categoria.slug}`}
              className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 uppercase tracking-wider"
            >
              {publicacion.categoria.nombre}
            </Link>
          )}
          {publicacion.etiquetas.map(({ etiqueta }) => (
            <span key={etiqueta.slug} className="badge bg-zinc-100 text-zinc-500">
              {etiqueta.nombre}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-serif font-semibold text-zinc-900 mb-4 leading-tight">
          {publicacion.titulo}
        </h1>
        <p className="font-serif italic text-zinc-500 text-lg leading-relaxed mb-5">
          {publicacion.resumen}
        </p>
        <div className="flex items-center justify-between">
          {publicacion.publicadoAt && (
            <time className="text-xs text-zinc-400 tracking-wide">
              {formatFecha(publicacion.publicadoAt)}
            </time>
          )}
          <Link
            href={`/publicaciones/${params.slug}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-brand-700 border border-zinc-200 hover:border-brand-300 px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <div className="prose prose-zinc prose-headings:font-serif prose-headings:font-semibold prose-a:text-brand-700 max-w-none mb-12">
        <ReactMarkdown>{publicacion.contenido}</ReactMarkdown>
      </div>

      <hr className="border-zinc-100 mb-10" />

      {/* Reacciones */}
      <section className="mb-12">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
          ¿Qué te pareció?
        </p>
        <ReaccionButtons publicacionId={publicacion.id} conteos={conteos} />
      </section>

      {/* Comentarios */}
      <section>
        <h2 className="text-xl font-serif font-semibold text-zinc-900 mb-6">
          Comentarios
          <span className="ml-2 text-sm font-sans font-normal text-zinc-400">
            ({publicacion.comentarios.length})
          </span>
        </h2>

        {publicacion.comentarios.length > 0 && (
          <div className="space-y-4 mb-8">
            {publicacion.comentarios.map((c) => (
              <div key={c.id} className="border border-zinc-100 bg-zinc-50 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-sm text-zinc-800">{c.autorNombre}</span>
                  <span className="text-xs text-zinc-400">{formatFecha(c.creadoAt)}</span>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">{c.contenido}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-zinc-200 p-6">
          <ComentarioForm publicacionId={publicacion.id} />
        </div>
      </section>
    </div>
  );
}
