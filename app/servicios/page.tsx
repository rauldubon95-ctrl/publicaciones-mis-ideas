import { prisma } from "@/lib/prisma";
import ServiciosConFormulario from "@/components/ServiciosConFormulario";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: "Servicios de Consultoría",
  description:
    "Servicios profesionales de consultoría en evaluación, investigación social, análisis de datos y apoyo metodológico para proyectos académicos e institucionales.",
  alternates: { canonical: canonicalUrl("/servicios") },
};

export const dynamic = "force-dynamic";

const getServicios = unstable_cache(
  async () =>
    prisma.servicio.findMany({
      where: { activo: true },
      orderBy: [{ orden: "asc" }, { categoria: "asc" }, { titulo: "asc" }],
      select: {
        id: true,
        titulo: true,
        slug: true,
        descripcion: true,
        categoria: true,
        icono: true,
      },
    }),
  ["servicios-activos"],
  { revalidate: 300, tags: ["servicios"] }
);

export default async function ServiciosPage() {
  const servicios = await getServicios();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      {/* Hero */}
      <section className="mb-16 border-b border-zinc-200 pb-12">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
          Consultoría profesional
        </p>
        <h1 className="text-4xl font-serif font-semibold text-zinc-900 mb-4 leading-tight">
          Servicios de Consultoría
        </h1>
        <p className="text-zinc-500 max-w-2xl leading-relaxed text-base">
          Apoyo especializado en evaluación de programas, investigación social cuantitativa y
          cualitativa, sistemas de datos y diseño metodológico para organizaciones, instituciones
          académicas y equipos de desarrollo.
        </p>
      </section>

      {servicios.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-2xl mb-3">🔧</p>
          <p className="text-sm font-medium">Catálogo en preparación.</p>
          <p className="text-xs mt-1 text-zinc-300">
            Los servicios estarán disponibles próximamente.
          </p>
        </div>
      ) : (
        <ServiciosConFormulario servicios={servicios} />
      )}
    </div>
  );
}
