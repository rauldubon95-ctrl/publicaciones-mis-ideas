import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

// Devuelve la fecha más reciente de una lista (o un fallback). Sirve para que
// las páginas de listado declaren un lastModified REAL (la fecha del contenido
// más nuevo de esa sección) en vez de `new Date()` siempre, que le decía a
// Google "todo cambió hoy" en cada generación y erosionaba la señal de frescura.
function maxFecha(fechas: (Date | null | undefined)[], fallback: Date): Date {
  const validas = fechas.filter((f): f is Date => f instanceof Date);
  if (validas.length === 0) return fallback;
  return validas.reduce((a, b) => (a > b ? a : b));
}

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
        // Fecha del artículo publicado más reciente de la categoría (para el
        // lastModified real de la página de categoría).
        publicaciones: {
          where: { publicado: true },
          select: { actualizadoAt: true },
          orderBy: { actualizadoAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const ahora = new Date();
  const fechaPub = maxFecha(publicaciones.map((p) => p.actualizadoAt), ahora);
  const fechaLib = maxFecha(libros.map((l) => l.actualizadoAt), ahora);
  const fechaCom = maxFecha(comics.map((c) => c.actualizadoAt), ahora);
  const fechaRec = maxFecha(recursos.map((r) => r.actualizadoAt), ahora);
  // "Frescura" global del sitio para las páginas sin contenido propio fechado.
  const fechaSitio = maxFecha([fechaPub, fechaLib, fechaCom, fechaRec], ahora);

  const categoriasConContenido = categorias.filter((c) => c._count.publicaciones > 0);

  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: fechaSitio, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/publicaciones`, lastModified: fechaPub, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/libros`, lastModified: fechaLib, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/recursos`, lastModified: fechaRec, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/comics`, lastModified: fechaCom, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/servicios`, lastModified: fechaSitio, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/donar`, lastModified: fechaSitio, changeFrequency: "monthly", priority: 0.5 },
  ];

  const paginasPublicaciones: MetadataRoute.Sitemap = publicaciones.map((p) => ({
    url: `${BASE_URL}/publicaciones/${p.slug}`,
    lastModified: p.actualizadoAt ?? ahora,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const paginasLibros: MetadataRoute.Sitemap = libros.map((l) => ({
    url: `${BASE_URL}/libros/${l.slug}`,
    lastModified: l.actualizadoAt ?? ahora,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const paginasComics: MetadataRoute.Sitemap = comics.map((c) => ({
    url: `${BASE_URL}/comics/${c.slug}`,
    lastModified: c.actualizadoAt ?? ahora,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const paginasRecursos: MetadataRoute.Sitemap = recursos.map((r) => ({
    url: `${BASE_URL}/recursos/${r.slug}`,
    lastModified: r.actualizadoAt ?? ahora,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Categorías con contenido — generadas automáticamente, con la fecha real del
  // artículo más reciente de cada una.
  const paginasCategorias: MetadataRoute.Sitemap = categoriasConContenido.map((c) => ({
    url: `${BASE_URL}/categorias/${c.slug}`,
    lastModified: c.publicaciones[0]?.actualizadoAt ?? fechaPub,
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
