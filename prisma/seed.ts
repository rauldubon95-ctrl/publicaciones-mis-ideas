import { PrismaClient } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

async function main() {
  const toSlug = (text: string) =>
    slugify(text, { lower: true, strict: true, locale: "es" });

  const reflexion = await prisma.categoria.upsert({
    where: { slug: "reflexion" },
    update: {},
    create: { nombre: "Reflexión", slug: "reflexion", descripcion: "Pensamientos y reflexiones personales" },
  });

  const ideas = await prisma.categoria.upsert({
    where: { slug: "ideas" },
    update: {},
    create: { nombre: "Ideas", slug: "ideas", descripcion: "Proyectos e ideas en desarrollo" },
  });

  const titulo = "Bienvenido a Mis Ideas";
  await prisma.publicacion.upsert({
    where: { slug: toSlug(titulo) },
    update: {},
    create: {
      titulo,
      slug: toSlug(titulo),
      resumen: "Este es el primer post del sistema. Aquí compartiré reflexiones, proyectos e ideas.",
      contenido: `# Bienvenido a Mis Ideas\n\nEste espacio nació para **divulgar reflexiones** y dar vida a ideas que merecen ser compartidas.\n\n## ¿Qué encontrarás aquí?\n\n- Reflexiones personales sobre tecnología y vida\n- Ideas en desarrollo y proyectos\n- Análisis y observaciones del mundo\n\n¡Gracias por estar aquí!`,
      publicado: true,
      publicadoAt: new Date(),
      categoriaId: reflexion.id,
    },
  });

  console.log("Seed completado");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
