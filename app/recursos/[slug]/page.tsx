import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import Link from "next/link";
import TrackView from "@/components/TrackView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await prisma.recursoHtml.findUnique({ where: { slug } });
  return r ? { title: r.titulo } : {};
}

export default async function RecursoPage({ params }: Props) {
  const { slug } = await params;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
  });

  if (!recurso) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <TrackView tipo="recurso" contenidoId={recurso.id} />
      {/* Navegación */}
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/recursos" className="hover:text-zinc-600 transition-colors">Recursos</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{recurso.titulo}</span>
      </nav>

      {/* Encabezado */}
      <header className="mb-8 border-b border-zinc-200 pb-6">
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-2">{recurso.titulo}</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-4">{recurso.descripcion}</p>
        <div className="flex items-center justify-between">
          <time className="text-xs text-zinc-400">{formatFecha(recurso.creadoAt)}</time>
          <a
            href={`/api/recursos/${slug}/descargar`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-brand-700 border border-zinc-200 hover:border-brand-300 px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar HTML
          </a>
        </div>
      </header>

      {/* Visor HTML — iframe con scripts habilitados (HTML propio del autor) */}
      <div className="border border-zinc-200 bg-white overflow-hidden" style={{ height: "75vh" }}>
        <iframe
          src={`/api/recursos/${slug}/html`}
          sandbox="allow-same-origin allow-scripts allow-forms"
          className="w-full h-full border-0"
          title={recurso.titulo}
        />
      </div>

      <p className="text-xs text-zinc-300 mt-2 text-center">
        Contenido interactivo · Solo lectura
      </p>
    </div>
  );
}
