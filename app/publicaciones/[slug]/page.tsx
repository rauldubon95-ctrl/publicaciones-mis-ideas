import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ReaccionButtons from "@/components/ReaccionButtons";
import TrackView from "@/components/TrackView";
import TarjetaAutor from "@/components/TarjetaAutor";
import SeccionComentarios from "@/components/SeccionComentarios";
import Link from "next/link";
import type { Metadata } from "next";
import type { ComentarioArbol } from "@/app/api/comentarios/route";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { tieneAccesoComprado } from "@/lib/accesoContenido";
import MuroPago from "@/components/MuroPago";
import BotonesCompartir from "@/components/BotonesCompartir";
import JsonLd from "@/components/JsonLd";
import { BASE_URL, canonicalUrl, recortarDescripcion, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ acceso?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.publicacion.findUnique({ where: { slug } });
  if (!p) return {};
  const descripcion = recortarDescripcion(p.resumen || p.contenido);
  const url = canonicalUrl(`/publicaciones/${slug}`);
  return {
    title: p.titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: p.titulo,
      description: descripcion,
      url,
      siteName: SITE_NAME,
      locale: "es_ES",
      publishedTime: p.publicadoAt?.toISOString(),
      modifiedTime: p.actualizadoAt?.toISOString(),
      authors: [SITE_NAME],
    },
    twitter: {
      card: "summary_large_image",
      title: p.titulo,
      description: descripcion,
    },
  };
}

// Construye árbol de comentarios desde los datos planos de la DB
function construirArbol(comentarios: {
  id: string; contenido: string; autorNombre: string; esAdmin: boolean;
  estado: string; parentId: string | null; profundidad: number;
  creadoAt: Date; actualizadoAt: Date;
}[]): ComentarioArbol[] {
  const mapa = new Map<string, ComentarioArbol>();
  const raices: ComentarioArbol[] = [];

  for (const c of comentarios) {
    mapa.set(c.id, {
      ...c,
      respuestas: [],
      creadoAt: c.creadoAt.toISOString(),
      actualizadoAt: c.actualizadoAt.toISOString(),
    });
  }

  mapa.forEach((nodo) => {
    if (nodo.parentId && mapa.has(nodo.parentId)) {
      mapa.get(nodo.parentId)!.respuestas.push(nodo);
    } else {
      raices.push(nodo);
    }
  });

  return raices;
}

export default async function PublicacionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const acceso = (await searchParams)?.acceso;
  const adminOk = await isAdminAuthorized();

  const publicacion = await prisma.publicacion.findUnique({
    where: { slug },
    include: {
      categoria: true,
      etiquetas: { include: { etiqueta: true } },
      comentarios: {
        where: { estado: "VISIBLE" },
        orderBy: { creadoAt: "asc" },
        select: {
          id: true, contenido: true, autorNombre: true, esAdmin: true,
          estado: true, parentId: true, profundidad: true,
          creadoAt: true, actualizadoAt: true,
        },
      },
      reacciones: true,
    },
  });

  // Artículo no existe
  if (!publicacion) notFound();
  // Borrador: solo el admin puede verlo
  if (!publicacion.publicado && !adminOk) notFound();

  const relacionados = publicacion.categoriaId
    ? await prisma.publicacion.findMany({
        where: {
          publicado: true,
          categoriaId: publicacion.categoriaId,
          NOT: { id: publicacion.id },
        },
        orderBy: { publicadoAt: "desc" },
        take: 3,
        select: { slug: true, titulo: true, resumen: true },
      })
    : [];

  const conteos = publicacion.reacciones.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo] = (acc[r.tipo] ?? 0) + 1;
    return acc;
  }, {});

  const comentariosArbol = construirArbol(publicacion.comentarios);

  // Premium: el admin siempre ve el contenido completo. Los demás necesitan
  // un PedidoContenido COMPLETADO para esta publicación (cookie).
  const requierePago =
    publicacion.esPremium &&
    (publicacion.precioCentavos ?? 0) > 0 &&
    !adminOk &&
    !(await tieneAccesoComprado(publicacion.id));
  const contenidoParaMostrar = requierePago
    ? publicacion.resumenPublico?.trim() ||
      publicacion.contenido.slice(0, 800) + "…"
    : publicacion.contenido;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: publicacion.titulo,
    description: recortarDescripcion(publicacion.resumen || publicacion.contenido),
    url: canonicalUrl(`/publicaciones/${slug}`),
    datePublished: publicacion.publicadoAt?.toISOString(),
    dateModified: publicacion.actualizadoAt?.toISOString(),
    inLanguage: "es",
    author: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
    publisher: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl(`/publicaciones/${slug}`),
    },
    ...(publicacion.categoria && { articleSection: publicacion.categoria.nombre }),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <JsonLd data={articleJsonLd} />
      {!publicacion.publicado && adminOk && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-amber-200 bg-amber-50 rounded px-4 py-3">
          <p className="text-sm text-amber-800 font-medium">
            Borrador — solo visible para el admin. Publica el artículo para que aparezca en el sitio.
          </p>
          <Link
            href={`/admin/editar/${publicacion.id}`}
            className="shrink-0 text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
          >
            Editar y publicar
          </Link>
        </div>
      )}
      {requierePago && acceso === "caducado" && (
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded px-4 py-3">
          <p className="text-sm text-amber-800">
            El enlace de acceso a este artículo ha caducado. Si lo compraste y
            necesitas volver a leerlo, escríbeme y te reactivo el acceso.
          </p>
        </div>
      )}
      {publicacion.esPremium && adminOk && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 rounded px-4 py-3">
          <p className="text-sm text-blue-800 font-medium">
            Artículo premium — estás viendo el contenido completo porque eres admin. Los visitantes ven solo el resumen y el muro de pago.
          </p>
          <Link
            href={`/admin/editar/${publicacion.id}`}
            className="shrink-0 text-xs font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700"
          >
            Editar precio
          </Link>
        </div>
      )}
      <TrackView publicacionId={publicacion.id} />

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
            href={`/publicaciones/${slug}/pdf`}
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

      <BotonesCompartir titulo={publicacion.titulo} path={`/publicaciones/${slug}`} />

      {/* Contenido */}
      <div className="prose prose-zinc prose-headings:font-serif prose-headings:font-semibold prose-a:text-brand-700 max-w-none mb-12">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ ...props }) => (
              <div className="overflow-x-auto my-6">
                <table className="w-full text-sm border-collapse" {...props} />
              </div>
            ),
            thead: ({ ...props }) => <thead className="bg-zinc-100" {...props} />,
            th: ({ ...props }) => <th className="text-left px-4 py-2.5 font-semibold border border-zinc-200 text-zinc-700 text-xs uppercase tracking-wider" {...props} />,
            td: ({ ...props }) => <td className="px-4 py-2 border border-zinc-200 text-zinc-600 align-top" {...props} />,
            tr: ({ ...props }) => <tr className="even:bg-zinc-50" {...props} />,
          }}
        >
          {contenidoParaMostrar}
        </ReactMarkdown>
      </div>

      {requierePago && publicacion.precioCentavos ? (
        <MuroPago
          publicacionId={publicacion.id}
          titulo={publicacion.titulo}
          precioCentavos={publicacion.precioCentavos}
        />
      ) : (
        <>
          <hr className="border-zinc-100 mb-10" />

          {/* Reacciones */}
          <section className="mb-10">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-4">
              ¿Qué te pareció?
            </p>
            <ReaccionButtons publicacionId={publicacion.id} conteos={conteos} />
          </section>

          {/* Tarjeta del autor */}
          <TarjetaAutor />

          {relacionados.length > 0 && (
            <section className="mt-10 border-t border-zinc-100 pt-10">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-5">
                Artículos relacionados
              </p>
              <ul className="space-y-4">
                {relacionados.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/publicaciones/${r.slug}`}
                      className="block group"
                    >
                      <h3 className="font-serif text-lg text-zinc-800 group-hover:text-brand-700 transition-colors leading-snug">
                        {r.titulo}
                      </h3>
                      {r.resumen && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                          {r.resumen}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <hr className="border-zinc-100 my-10" />

          {/* Comentarios anidados */}
          <SeccionComentarios
            comentariosIniciales={comentariosArbol}
            publicacionId={publicacion.id}
            esAdmin={adminOk}
          />
        </>
      )}
    </div>
  );
}
