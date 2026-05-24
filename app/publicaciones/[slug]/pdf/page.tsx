import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await prisma.publicacion.findUnique({ where: { slug: params.slug } });
  return p ? { title: p.titulo } : {};
}

export default async function PdfPage({ params }: Props) {
  const publicacion = await prisma.publicacion.findUnique({
    where: { slug: params.slug, publicado: true },
    include: { categoria: true, etiquetas: { include: { etiqueta: true } } },
  });

  if (!publicacion) notFound();

  return (
    <>
      {/* Barra de acción — solo visible en pantalla, no en impresión */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-brand-800 text-white px-6 py-3 flex items-center justify-between text-sm">
        <span className="font-serif italic text-brand-200">Vista previa de impresión</span>
        <div className="flex items-center gap-3">
          <a href={`/publicaciones/${params.slug}`} className="text-brand-300 hover:text-white transition-colors">
            ← Volver al artículo
          </a>
          <PrintButton publicacionId={publicacion.id} />
        </div>
      </div>

      {/* Documento */}
      <div className="pdf-page">
        {/* Encabezado del documento */}
        <header className="pdf-header">
          <div className="pdf-site-name">Mis Ideas</div>
          {publicacion.categoria && (
            <div className="pdf-category">{publicacion.categoria.nombre.toUpperCase()}</div>
          )}
          <h1 className="pdf-title">{publicacion.titulo}</h1>
          <p className="pdf-resumen">{publicacion.resumen}</p>
          <div className="pdf-meta">
            {publicacion.publicadoAt && (
              <span>{formatFecha(publicacion.publicadoAt)}</span>
            )}
            {publicacion.etiquetas.length > 0 && (
              <span className="pdf-tags">
                {publicacion.etiquetas.map(({ etiqueta }) => etiqueta.nombre).join(" · ")}
              </span>
            )}
          </div>
          <div className="pdf-divider" />
        </header>

        {/* Cuerpo del artículo */}
        <main className="pdf-body prose-pdf">
          <ReactMarkdown>{publicacion.contenido}</ReactMarkdown>
        </main>

        {/* Pie de página */}
        <footer className="pdf-footer">
          <span>Mis Ideas</span>
          <span>{publicacion.publicadoAt ? formatFecha(publicacion.publicadoAt) : ""}</span>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #e8e8e8;
          font-family: 'Inter', sans-serif;
        }

        .pdf-page {
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 72px auto 48px;
          padding: 28mm 24mm 24mm;
          box-shadow: 0 4px 32px rgba(0,0,0,0.18);
          position: relative;
        }

        .pdf-site-name {
          font-family: 'Lora', serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .pdf-category {
          font-size: 9px;
          letter-spacing: 0.25em;
          color: #9ca3af;
          margin-bottom: 12px;
        }

        .pdf-title {
          font-family: 'Lora', serif;
          font-size: 28px;
          font-weight: 600;
          line-height: 1.25;
          color: #111827;
          margin-bottom: 14px;
        }

        .pdf-resumen {
          font-family: 'Lora', serif;
          font-style: italic;
          font-size: 14px;
          line-height: 1.65;
          color: #4b5563;
          margin-bottom: 14px;
          max-width: 90%;
        }

        .pdf-meta {
          display: flex;
          gap: 20px;
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
        }

        .pdf-divider {
          border-top: 2px solid #111827;
          margin-bottom: 28px;
        }

        .pdf-body {
          font-family: 'Inter', sans-serif;
          font-size: 11.5px;
          line-height: 1.75;
          color: #1f2937;
        }

        .prose-pdf h1, .prose-pdf h2, .prose-pdf h3, .prose-pdf h4 {
          font-family: 'Lora', serif;
          color: #111827;
          margin-top: 2em;
          margin-bottom: 0.6em;
          line-height: 1.3;
        }
        .prose-pdf h1 { font-size: 20px; font-weight: 600; }
        .prose-pdf h2 { font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .prose-pdf h3 { font-size: 13px; font-weight: 600; }
        .prose-pdf p { margin-bottom: 1em; }
        .prose-pdf ul, .prose-pdf ol { margin: 0.75em 0 0.75em 1.5em; }
        .prose-pdf li { margin-bottom: 0.3em; }
        .prose-pdf strong { font-weight: 600; color: #111827; }
        .prose-pdf em { font-style: italic; }
        .prose-pdf blockquote {
          border-left: 3px solid #d1d5db;
          padding: 8px 16px;
          margin: 1.5em 0;
          color: #6b7280;
          font-style: italic;
        }
        .prose-pdf code {
          background: #f3f4f6;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 10px;
          font-family: 'Courier New', monospace;
        }
        .prose-pdf pre {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 12px 16px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 1em 0;
          font-size: 10px;
          line-height: 1.6;
        }
        .prose-pdf table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin: 1.5em 0;
        }
        .prose-pdf th {
          background: #f3f4f6;
          font-weight: 600;
          text-align: left;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
        }
        .prose-pdf td {
          padding: 5px 10px;
          border: 1px solid #e5e7eb;
        }
        .prose-pdf img { max-width: 100%; height: auto; margin: 1em auto; display: block; }
        .prose-pdf a { color: #1e2f52; text-decoration: underline; }

        .pdf-footer {
          position: absolute;
          bottom: 16mm;
          left: 24mm;
          right: 24mm;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
          letter-spacing: 0.05em;
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .pdf-page {
            width: 100%;
            margin: 0;
            padding: 20mm 18mm 22mm;
            box-shadow: none;
            min-height: unset;
          }
          .pdf-footer { position: fixed; bottom: 0; }
        }

        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </>
  );
}
