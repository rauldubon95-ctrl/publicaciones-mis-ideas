import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import ComentarioForm from "@/components/ComentarioForm";
import ReaccionButtons from "@/components/ReaccionButtons";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

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
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-gray-600">Inicio</Link>
        <span>/</span>
        <Link href="/publicaciones" className="hover:text-gray-600">Publicaciones</Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{publicacion.titulo}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {publicacion.categoria && (
            <Link
              href={`/categorias/${publicacion.categoria.slug}`}
              className="badge bg-brand-50 text-brand-700 hover:bg-brand-100"
            >
              {publicacion.categoria.nombre}
            </Link>
          )}
          {publicacion.etiquetas.map(({ etiqueta }) => (
            <span key={etiqueta.slug} className="badge bg-gray-100 text-gray-600">
              #{etiqueta.nombre}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
          {publicacion.titulo}
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed mb-4">{publicacion.resumen}</p>
        {publicacion.publicadoAt && (
          <time className="text-sm text-gray-400">{formatFecha(publicacion.publicadoAt)}</time>
        )}
      </header>

      {/* Contenido */}
      <div className="prose prose-gray max-w-none mb-10">
        <ReactMarkdown>{publicacion.contenido}</ReactMarkdown>
      </div>

      <hr className="border-gray-100 mb-8" />

      {/* Reacciones */}
      <section className="mb-10">
        <p className="text-sm font-medium text-gray-500 mb-3">¿Qué te pareció?</p>
        <ReaccionButtons publicacionId={publicacion.id} conteos={conteos} />
      </section>

      {/* Comentarios */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Comentarios ({publicacion.comentarios.length})
        </h2>

        {publicacion.comentarios.length > 0 && (
          <div className="space-y-4 mb-8">
            {publicacion.comentarios.map((c) => (
              <div key={c.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm text-gray-800">{c.autorNombre}</span>
                  <span className="text-xs text-gray-400">{formatFecha(c.creadoAt)}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{c.contenido}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <ComentarioForm publicacionId={publicacion.id} />
        </div>
      </section>
    </div>
  );
}
