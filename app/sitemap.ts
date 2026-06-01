import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publicaciones, libros, comics, recursos, categorias] = await Promise.all([
    prisma.publicacion.findMany({
      where: { publicado: true },
      select: { slug: true, actualizadoAt: true },
      orderBy: { publicadoAt: "desc" },
    }),
    prisma.libro.findMany({
      where: { publicado: true },
      select: { slug: true, actualizadoAt: true },
    }),
    prisma.comic.findMany({
      where: { publicado: true },
      select: { slug: true, actualizadoAt: true },
    }),
    prisma.recursoHtml.findMany({
      where: { publicado: true },
      select: { slug: true, actualizadoAt: true },
    }),
    prisma.categoria.findMany({
      include: {
        _count: { select: { publicaciones: { where: { publicado: true } } } },
      },
    }),
  ]);

  const categoriasConContenido = categorias.filter(
    (c) => c._count.publicaciones > 0
  );

  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/publicaciones`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/libros`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/recursos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/comics`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/servicios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/donar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const paginasPublicaciones: MetadataRoute.Sitemap = publicaciones.map((p) => ({
    url: `${BASE_URL}/publicaciones/${p.slug}`,
    lastModified: p.actualizadoAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const paginasLibros: MetadataRoute.Sitemap = libros.map((l) => ({
    url: `${BASE_URL}/libros/${l.slug}`,
    lastModified: l.actualizadoAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const paginasComics: MetadataRoute.Sitemap = comics.map((c) => ({
    url: `${BASE_URL}/comics/${c.slug}`,
    lastModified: c.actualizadoAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const paginasRecursos: MetadataRoute.Sitemap = recursos.map((r) => ({
    url: `${BASE_URL}/recursos/${r.slug}`,
    lastModified: r.actualizadoAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Categorías con contenido — generadas automáticamente
  const paginasCategorias: MetadataRoute.Sitemap = categoriasConContenido.map((c) => ({
    url: `${BASE_URL}/categorias/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...paginasEstaticas,
    ...paginasPublicaciones,
    ...paginasLibros,
    ...paginasComics,
    ...paginasRecursos,
    ...paginasCategorias,
  ];
}
