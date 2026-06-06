import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TrackView from "@/components/TrackView";
import BotonesCompartir from "@/components/BotonesCompartir";
import MuroRecurso from "@/components/MuroRecurso";
import JsonLd from "@/components/JsonLd";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { tieneAccesoRecurso } from "@/lib/accesoRecurso";
import type { Metadata } from "next";
import { BASE_URL, canonicalUrl, recortarDescripcion, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ acceso?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await prisma.recursoHtml.findUnique({ where: { slug } });
  if (!r) return {};
  const descripcion = recortarDescripcion(r.descripcion);
  const url = canonicalUrl(`/recursos/${slug}`);
  return {
    title: r.titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: r.titulo,
      description: descripcion,
      url,
      siteName: SITE_NAME,
      locale: "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: r.titulo,
      description: descripcion,
    },
  };
}

export default async function RecursoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const acceso = (await searchParams)?.acceso;
  const recurso = await prisma.recursoHtml.findUnique({
    where: { slug, publicado: true },
  });

  if (!recurso) notFound();

  const esPremium = recurso.esPremium && (recurso.precioCentavos ?? 0) > 0;

  const [adminOk, tieneAcceso] = await Promise.all([
    isAdminAuthorized(),
    esPremium ? tieneAccesoRecurso(recurso.id) : Promise.resolve(true),
  ]);

  const puedeVer = !esPremium || adminOk || tieneAcceso;

  const recursoJsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: recurso.titulo,
    description: recortarDescripcion(recurso.descripcion),
    url: canonicalUrl(`/recursos/${slug}`),
    inLanguage: "es",
    author: { "@type": "Person", name: SITE_NAME, url: BASE_URL },
    datePublished: recurso.creadoAt.toISOString(),
    dateModified: recurso.actualizadoAt.toISOString(),
    ...(esPremium &&
      recurso.precioCentavos != null && {
        offers: {
          "@type": "Offer",
          price: (recurso.precioCentavos / 100).toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: canonicalUrl(`/recursos/${slug}`),
        },
      }),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <JsonLd data={recursoJsonLd} />
      <TrackView tipo="recurso" contenidoId={recurso.id} />
      {/* Navegación */}
      <nav className="text-xs text-zinc-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/recursos" className="hover:text-zinc-600 transition-colors">Recursos</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{recurso.titulo}</span>
      </nav>

      {puedeVer && !adminOk && (acceso === "caducado" || acceso === "limite") && (
        <div className="mb-3 border border-amber-200 bg-amber-50 rounded-sm px-4 py-2.5">
          <p className="text-sm text-amber-800">
            {acceso === "caducado"
              ? "El enlace para descargar el archivo de este recurso ha caducado."
              : "Has alcanzado el número máximo de descargas del archivo de este recurso."}{" "}
            Puedes seguir consultándolo en pantalla aquí abajo. Si necesitas descargarlo de nuevo, escríbeme y te reactivo el acceso.
          </p>
        </div>
      )}

      {esPremium && adminOk && (
        <div className="mb-3 flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 rounded-sm px-4 py-2.5">
          <p className="text-sm text-blue-800 font-medium">
            Recurso de pago — estás viendo el contenido completo porque eres admin. Los visitantes deben comprarlo para acceder.
          </p>
          <Link href={`/admin/recursos/editar/${recurso.id}`} className="shrink-0 text-xs font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700">
            Editar precio
          </Link>
        </div>
      )}

      {/* Encabezado compacto */}
      <header className="mb-3 border-b border-zinc-200 pb-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-serif font-semibold text-zinc-900 truncate">{recurso.titulo}</h1>
          {recurso.descripcion && (
            <p className="text-zinc-400 text-xs mt-0.5 truncate">{recurso.descripcion}</p>
          )}
        </div>
        {puedeVer && (
          <a
            href={`/api/recursos/${slug}/descargar`}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-brand-700 border border-zinc-200 hover:border-brand-300 px-3 py-1.5 rounded-sm transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar HTML
          </a>
        )}
      </header>

      <BotonesCompartir titulo={recurso.titulo} path={`/recursos/${slug}`} />

      {puedeVer ? (
        <>
          {/* Visor HTML — ocupa casi todo el viewport */}
          <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden" style={{ height: "calc(100vh - 12rem)" }}>
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
        </>
      ) : (
        <div className="max-w-2xl mx-auto py-6">
          {recurso.resumenPublico ? (
            <div className="prose prose-zinc max-w-none mb-2 whitespace-pre-wrap">
              {recurso.resumenPublico}
            </div>
          ) : (
            <p className="text-zinc-600 leading-relaxed">{recurso.descripcion}</p>
          )}
          <MuroRecurso
            recursoId={recurso.id}
            titulo={recurso.titulo}
            precioCentavos={recurso.precioCentavos!}
          />
        </div>
      )}
    </div>
  );
}
