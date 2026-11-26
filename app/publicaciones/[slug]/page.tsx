import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { urlTransformArticulo } from "@/lib/markdownSeguro";
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
import { BASE_URL, breadcrumbJsonLd, canonicalUrl, ogImagenes, recortarDescripcion, SITE_NAME } from "@/lib/seo";
import IndiceArticulo from "@/components/IndiceArticulo";
import { serieDePublicacion, rotuloCapitulo } from "@/lib/series";
import { caracteresLegibles, formatoMinutos, minutosDeTexto } from "@/lib/lectura";
import slugify from "slugify";
import { Children, isValidElement, type ReactNode } from "react";

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
      images: ogImagenes(),
    },
    twitter: {
      card: "summary_large_image",
      title: p.titulo,
      description: descripcion,
      images: ogImagenes().map((i) => i.url),
    },
  };
}

// Texto plano de los hijos de un nodo de React (para generar ids de sección).
function textoPlano(nodo: ReactNode): string {
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoPlano).join("");
  if (isValidElement<{ children?: ReactNode }>(nodo)) return textoPlano(nodo.props.children);
  return "";
}

// Encabezados del Markdown: se bajan un nivel (el # del documento pasa a <h2>)
// para que el título del artículo sea el único <h1> de la página, y cada uno
// recibe un id estable para el índice lateral (IndiceArticulo).
function crearEncabezados() {
  const usados = new Map<string, number>();
  const idPara = (children: ReactNode) => {
    const base = slugify(textoPlano(children), { lower: true, strict: true, locale: "es" }).slice(0, 60) || "seccion";
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
  const crear = (Tag: "h2" | "h3" | "h4" | "h5" | "h6") =>
    function Encabezado({ children }: { children?: ReactNode }) {
      return (
        <Tag id={idPara(children)} tabIndex={-1}>
          {Children.toArray(children)}
        </Tag>
      );
    };
  return { h1: crear("h2"), h2: crear("h3"), h3: crear("h4"), h4: crear("h5"), h5: crear("h6"), h6: crear("h6") };
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

  const enSerie = serieDePublicacion(slug);
  const slugsSerie = enSerie ? enSerie.serie.capitulos.map((c) => c.slug) : [];
  const vecinos = enSerie
    ? await prisma.publicacion.findMany({
        where: {
          publicado: true,
          slug: { in: [enSerie.anterior?.slug, enSerie.siguiente?.slug].filter((x): x is string => !!x) },
        },
        select: { slug: true, titulo: true },
      })
    : [];
  const tituloVecino = Object.fromEntries(vecinos.map((v) => [v.slug, v.titulo]));
  const anterior = enSerie?.anterior && tituloVecino[enSerie.anterior.slug] ? enSerie.anterior : null;
  const siguiente = enSerie?.siguiente && tituloVecino[enSerie.siguiente.slug] ? enSerie.siguiente : null;
  const minutos = minutosDeTexto(caracteresLegibles(publicacion.contenido));
  // La etiqueta que repite el nombre de la categoría ("Reflexión" / "reflexión") sobra.
  const etiquetas = publicacion.etiquetas.filter(
    ({ etiqueta }) => etiqueta.nombre.toLowerCase() !== publicacion.categoria?.nombre.toLowerCase(),
  );

  const relacionados = publicacion.categoriaId
    ? await prisma.publicacion.findMany({
        where: {
          publicado: true,
          categoriaId: publicacion.categoriaId,
          NOT: [{ id: publicacion.id }, { slug: { in: slugsSerie } }],
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

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Publicaciones", path: "/publicaciones" },
    { name: publicacion.titulo, path: `/publicaciones/${slug}` },
  ]);

  const encabezados = crearEncabezados();
  const enlaceTexto = "font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-4 hover:decoration-zinc-900";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
      <JsonLd data={[articleJsonLd, breadcrumb]} />
      {!publicacion.publicado && adminOk && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-amber-200 bg-amber-50 rounded-sm px-4 py-3">
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
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded-sm px-4 py-3">
          <p className="text-sm text-amber-800">
            El enlace de acceso a este artículo ha caducado. Si lo compraste y
            necesitas volver a leerlo, escríbeme y te reactivo el acceso.
          </p>
        </div>
      )}
      {publicacion.esPremium && adminOk && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 rounded-sm px-4 py-3">
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

      <nav aria-label="Ruta de navegación" className="mb-8 text-sm text-zinc-600">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="hover:text-zinc-900">Inicio</Link></li>
          <li aria-hidden="true">/</li>
          {enSerie ? (
            <>
              <li><Link href="/series" className="hover:text-zinc-900">Series</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={`/series/${enSerie.serie.slug}`} className="hover:text-zinc-900">{enSerie.serie.titulo}</Link></li>
            </>
          ) : (
            <li><Link href="/publicaciones" className="hover:text-zinc-900">Publicaciones</Link></li>
          )}
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
        <article className="min-w-0 max-w-[44rem]">
          <header className="mb-10">
            {enSerie ? (
              <p className="mb-4 text-sm text-amber-800">
                <Link href={`/series/${enSerie.serie.slug}`} className="font-medium underline-offset-4 hover:underline">
                  {enSerie.serie.titulo}
                </Link>{" "}
                <span aria-hidden="true">·</span> {enSerie.rotulo}
              </p>
            ) : publicacion.categoria ? (
              <p className="mb-4 text-sm">
                <Link href={`/categorias/${publicacion.categoria.slug}`} className="font-medium text-amber-800 underline-offset-4 hover:underline">
                  {publicacion.categoria.nombre}
                </Link>
              </p>
            ) : null}

            <h1 className="font-serif font-semibold text-zinc-900 text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.12] tracking-tight text-balance">
              {publicacion.titulo}
            </h1>
            {publicacion.resumen && (
              <p className="mt-5 font-serif text-xl leading-relaxed text-zinc-700 text-pretty">{publicacion.resumen}</p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-zinc-200 py-3 text-sm text-zinc-600">
              <span>
                Por <Link href="/sobre-mi" className={enlaceTexto}>{SITE_NAME}</Link>
              </span>
              {publicacion.publicadoAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={publicacion.publicadoAt.toISOString()}>{formatFecha(publicacion.publicadoAt)}</time>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{formatoMinutos(minutos)} de lectura</span>
              <Link
                href={`/publicaciones/${slug}/pdf`}
                target="_blank"
                className="ml-auto inline-flex items-center gap-1.5 text-zinc-700 hover:text-zinc-900"
              >
                <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </Link>
            </div>
            {etiquetas.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Etiquetas">
                {etiquetas.map(({ etiqueta }) => (
                  <li key={etiqueta.slug} className="rounded-full border border-zinc-300 px-3 py-0.5 text-xs text-zinc-700">
                    {etiqueta.nombre}
                  </li>
                ))}
              </ul>
            )}
          </header>

          <IndiceArticulo variante="movil" />

          <div
            id="cuerpo-articulo"
            className="prose prose-zinc prose-lg font-serif max-w-none mb-12 prose-headings:font-semibold prose-a:text-brand-700 prose-p:text-zinc-800 prose-li:text-zinc-800"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={urlTransformArticulo}
              components={{
                ...encabezados,
                img: ({ src, alt }) =>
                  src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="mx-auto my-6 h-auto max-w-full rounded border border-zinc-200" />
                  ) : null,
                // La tabla puede desplazarse de lado: el contenedor recibe foco
                // para que también se recorra con el teclado (axe:
                // scrollable-region-focusable).
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-6" tabIndex={0} role="region" aria-label="Tabla (se desplaza horizontalmente)">
                    <table className="w-full font-sans text-sm border-collapse" {...props} />
                  </div>
                ),
                thead: ({ ...props }) => <thead className="bg-zinc-100" {...props} />,
                th: ({ ...props }) => <th className="text-left px-4 py-2.5 font-semibold border border-zinc-200 text-zinc-700 text-xs" {...props} />,
                td: ({ ...props }) => <td className="px-4 py-2 border border-zinc-200 text-zinc-700 align-top" {...props} />,
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
              {enSerie && (anterior || siguiente) && (
                <nav aria-label={`Serie: ${enSerie.serie.titulo}`} className="mb-12 border-t-2 border-zinc-900 pt-6">
                  <p className="text-sm text-zinc-600">
                    Estás leyendo{" "}
                    <Link href={`/series/${enSerie.serie.slug}`} className={enlaceTexto}>
                      {enSerie.serie.titulo}
                    </Link>{" "}
                    · {enSerie.rotulo}
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {anterior && (
                      <Link href={`/publicaciones/${anterior.slug}`} rel="prev" className="group rounded-lg border border-zinc-300 p-4 hover:border-zinc-900 transition-colors">
                        <span className="text-sm text-zinc-600">
                          <span aria-hidden="true">← </span>Anterior · {rotuloCapitulo(enSerie.serie, enSerie.indice - 1)}
                        </span>
                        <span className="mt-1 block font-serif text-lg leading-snug text-zinc-900 group-hover:underline underline-offset-4 decoration-1 text-balance">
                          {tituloVecino[anterior.slug]}
                        </span>
                      </Link>
                    )}
                    {siguiente && (
                      <Link href={`/publicaciones/${siguiente.slug}`} rel="next" className="group rounded-lg border border-zinc-300 p-4 text-right hover:border-zinc-900 transition-colors sm:col-start-2">
                        <span className="text-sm text-zinc-600">
                          Siguiente · {rotuloCapitulo(enSerie.serie, enSerie.indice + 1)}<span aria-hidden="true"> →</span>
                        </span>
                        <span className="mt-1 block font-serif text-lg leading-snug text-zinc-900 group-hover:underline underline-offset-4 decoration-1 text-balance">
                          {tituloVecino[siguiente.slug]}
                        </span>
                      </Link>
                    )}
                  </div>
                </nav>
              )}

              <div className="mb-10">
                <BotonesCompartir titulo={publicacion.titulo} path={`/publicaciones/${slug}`} />
              </div>

              <section className="mb-10" aria-labelledby="titulo-reacciones">
                <h2 id="titulo-reacciones" className="text-sm font-medium text-zinc-700 mb-4">
                  ¿Qué te pareció?
                </h2>
                <ReaccionButtons publicacionId={publicacion.id} conteos={conteos} />
              </section>

              <TarjetaAutor />

              {relacionados.length > 0 && (
                <section className="mt-12 border-t border-zinc-200 pt-10" aria-labelledby="titulo-relacionados">
                  <h2 id="titulo-relacionados" className="font-serif text-2xl font-semibold text-zinc-900 mb-6">
                    Sigue leyendo
                  </h2>
                  <ul className="space-y-6">
                    {relacionados.map((r) => (
                      <li key={r.slug}>
                        <Link href={`/publicaciones/${r.slug}`} className="block group">
                          <h3 className="font-serif text-xl text-zinc-900 group-hover:underline underline-offset-4 decoration-1 leading-snug text-balance">
                            {r.titulo}
                          </h3>
                          {r.resumen && (
                            <p className="text-zinc-600 mt-1 line-clamp-2 text-pretty">{r.resumen}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <hr className="border-zinc-200 my-12" />

              <SeccionComentarios
                comentariosIniciales={comentariosArbol}
                publicacionId={publicacion.id}
                esAdmin={adminOk}
              />
            </>
          )}
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <IndiceArticulo variante="escritorio" />
          </div>
        </aside>
      </div>
    </div>
  );
}
