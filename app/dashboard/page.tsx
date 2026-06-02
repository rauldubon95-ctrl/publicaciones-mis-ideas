import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Tableros y visualizaciones interactivas de Raúl Dubón.",
  alternates: { canonical: canonicalUrl("/dashboard") },
  robots: { index: false, follow: true },
};

const getTableros = unstable_cache(
  async () =>
    prisma.tablero.findMany({
      where: { publicado: true },
      orderBy: [{ orden: "asc" }, { creadoAt: "desc" }],
      select: { id: true, titulo: true, slug: true, descripcion: true, categoria: true, archivoNombre: true, creadoAt: true },
    }),
  ["tableros-publicados"],
  { revalidate: 300, tags: ["tableros"] }
);

export default async function DashboardPage() {
  const tableros = await getTableros();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-zinc-600">Dashboard</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-2">Dashboard de datos</h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Plantillas y conjuntos de datos para consulta y descarga. Los archivos son de solo lectura — descargalos si querés trabajar con ellos.
        </p>
      </header>

      {tableros.length === 0 ? (
        <div className="text-center py-20 text-zinc-300">
          <p className="text-lg">Próximamente</p>
          <p className="text-sm mt-1">Aún no hay tableros publicados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tableros.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/${t.slug}`}
              className="group block border border-zinc-200 bg-white rounded-xl p-5 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {t.categoria && (
                    <span className="inline-block text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded mb-2">
                      {t.categoria}
                    </span>
                  )}
                  <h2 className="text-base font-semibold text-zinc-900 group-hover:text-brand-700 transition-colors truncate">
                    {t.titulo}
                  </h2>
                  {t.descripcion && (
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{t.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t.archivoNombre}
                    </span>
                    <time className="text-xs text-zinc-300">
                      {new Date(t.creadoAt).toLocaleDateString("es", { year: "numeric", month: "long" })}
                    </time>
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-300 group-hover:text-brand-500 transition-colors mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
