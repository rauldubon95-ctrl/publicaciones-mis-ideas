import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SERIES } from "@/lib/series";
import { formatoMinutos, minutosPorSlug } from "@/lib/lectura";
import { canonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Series",
  description: "Libros por capítulos e investigaciones encadenadas de Raúl Dubón, para leer en orden.",
  alternates: { canonical: canonicalUrl("/series") },
};

const unidadPlural = { Capítulo: "capítulos", Parte: "partes", Artículo: "artículos" } as const;

export default async function SeriesPage() {
  const slugs = SERIES.flatMap((s) => s.capitulos.map((c) => c.slug));
  const [publicadas, minutos] = await Promise.all([
    prisma.publicacion.findMany({ where: { publicado: true, slug: { in: slugs } }, select: { slug: true, titulo: true } }),
    minutosPorSlug(slugs),
  ]);
  const titulo = Object.fromEntries(publicadas.map((p) => [p.slug, p.titulo]));

  const series = SERIES.map((s) => {
    const caps = s.capitulos.filter((c) => titulo[c.slug]);
    return { ...s, caps, total: caps.reduce((acc, c) => acc + (minutos[c.slug] ?? 0), 0) };
  }).filter((s) => s.caps.length > 1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
      <header className="max-w-2xl mb-12">
        <h1 className="font-serif text-[clamp(2.25rem,1.6rem+2vw,3.25rem)] font-semibold leading-tight tracking-tight text-zinc-900">
          Series
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700 text-pretty">
          Libros publicados por capítulos e investigaciones encadenadas. Están pensadas para leerse en orden:
          cada texto indica en qué parte estás y cuál sigue.
        </p>
      </header>

      <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {series.map((s) => (
          <li key={s.slug} className="group relative border-t-2 border-zinc-900 pt-5">
            <p className="text-sm text-zinc-600">
              {s.caps.length} {unidadPlural[s.unidad]}
              {s.total > 0 && <> · {formatoMinutos(s.total)} de lectura</>}
            </p>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold leading-snug text-zinc-900 text-balance">
              <Link href={`/series/${s.slug}`} className="after:absolute after:inset-0 decoration-1 underline-offset-4 group-hover:underline">
                {s.titulo}
              </Link>
            </h2>
            <p className="mt-3 text-zinc-700 leading-relaxed text-pretty">{s.descripcion}</p>
            <ol className="mt-5 space-y-1 text-sm text-zinc-600">
              {s.caps.slice(0, 4).map((c, i) => (
                <li key={c.slug} className="flex gap-3">
                  <span className="w-5 shrink-0 text-right tabular-nums text-zinc-500">{i + 1}.</span>
                  <span className="text-zinc-800 line-clamp-1">{titulo[c.slug]}</span>
                </li>
              ))}
              {s.caps.length > 4 && <li className="pl-8 text-zinc-500">y {s.caps.length - 4} más</li>}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}
