import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicaciones = await prisma.publicacion.findMany({
    where: { publicado: true },
    select: { slug: true, actualizadoAt: true },
    orderBy: { publicadoAt: "desc" },
  });

  const comics = await prisma.comic.findMany({
    where: { publicado: true },
    select: { slug: true, actualizadoAt: true },
  });

  const recursos = await prisma.recurso.findMany({
    where: { publicado: true },
    select: { slug: true, actualizadoAt: true },
  });

  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/publicaciones`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/recursos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/comics`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/servicios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  const paginasPublicaciones: MetadataRoute.Sitemap = publicaciones.map((p) => ({
    url: `${BASE_URL}/publicaciones/${p.slug}`,
    lastModified: p.actualizadoAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
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

  return [...paginasEstaticas, ...paginasPublicaciones, ...paginasComics, ...paginasRecursos];
}
