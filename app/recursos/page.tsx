import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/utils";
import PrecioConConversion from "@/components/PrecioConConversion";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Recursos",
  description: "Documentos, guías y materiales metodológicos publicados por Raúl Dubón.",
  alternates: { canonical: canonicalUrl("/recursos") },
};

const getRecursos = unstable_cache(
  async () =>
    prisma.recursoHtml.findMany({
      where: { publicado: true },
      orderBy: { creadoAt: "desc" },
      select: {
        id: true, titulo: true, slug: true, descripcion: true,
        creadoAt: true, esPremium: true, precioCentavos: true,
      },
    }),
  ["recursos-publicados-v2"],
  { revalidate: 300, tags: ["recursos"] }
);

export default async function RecursosPage() {
  const recursos = await getRecursos();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
      <header className="mb-12 lg:mb-14">
        <p className="text-sm font-medium text-amber-800 mb-3">
          Insumos metodológicos
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 tracking-tight mb-4">
          Recursos
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base max-w-xl">
          Guías, instrumentos, metodologías, bases conceptuales y materiales técnicos disponibles para consulta y descarga.
        </p>
      </header>

      {recursos.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">No hay recursos publicados aún.</p>
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {/* Tarjetas tipográficas: un solo enlace por tarjeta, sin portadas de relleno. */}
          {recursos.map((r) => (
            <article key={r.id} className="group relative flex flex-col border-t border-zinc-300 pt-5">
              {r.esPremium && (
                <p className="mb-2 text-sm font-medium text-amber-800">Premium</p>
              )}
              <h2 className="font-serif text-xl font-semibold leading-snug text-zinc-900 text-balance">
                <Link
                  href={`/recursos/${r.slug}`}
                  className="after:absolute after:inset-0 decoration-1 underline-offset-4 group-hover:underline"
                >
                  {r.titulo}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-zinc-600 leading-relaxed line-clamp-3 text-pretty">{r.descripcion}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-500">
                <time dateTime={new Date(r.creadoAt).toISOString()}>{formatFecha(r.creadoAt)}</time>
                {r.esPremium && r.precioCentavos != null && r.precioCentavos > 0 && (
                  <PrecioConConversion centavosUSD={r.precioCentavos} tamano="sm" mostrarNotaReferencial={false} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
