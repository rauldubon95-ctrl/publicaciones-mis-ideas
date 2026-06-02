import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/utils";
import { checkRateLimitDb, getIp } from "@/lib/security";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(req: NextRequest) {
  const ip = getIp(req);
  const rl = await checkRateLimitDb(ip, "/api/publicaciones", {
    maxIntentos: 30,
    ventanaMs: 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 }
    );
  }

  const params = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
  const skip = (page - 1) * limit;

  const publicaciones = await prisma.publicacion.findMany({
    where: { publicado: true },
    orderBy: { publicadoAt: "desc" },
    take: limit,
    skip,
    include: {
      categoria: true,
      etiquetas: { include: { etiqueta: true } },
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });
  return NextResponse.json(publicaciones);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const {
    titulo,
    slug,
    resumen,
    contenido,
    publicado,
    categoriaId,
    etiquetas,
    esPremium,
    precioCentavos,
    resumenPublico,
  } = body;

  if (!titulo || !resumen || !contenido) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const finalSlug = toSlug(slug || titulo);

  const existente = await prisma.publicacion.findUnique({ where: { slug: finalSlug } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe una publicación con ese slug" }, { status: 409 });
  }

  // Validación de premium
  const esPremiumBool = !!esPremium;
  let precioValidado: number | null = null;
  if (esPremiumBool) {
    if (typeof precioCentavos !== "number" || precioCentavos < 100 || precioCentavos > 1_000_000) {
      return NextResponse.json(
        { error: "El precio debe estar entre $1.00 y $10,000.00." },
        { status: 422 }
      );
    }
    precioValidado = Math.round(precioCentavos);
  }

  const publicacion = await prisma.publicacion.create({
    data: {
      titulo,
      slug: finalSlug,
      resumen,
      contenido,
      publicado: !!publicado,
      publicadoAt: publicado ? new Date() : null,
      categoriaId: categoriaId || null,
      esPremium: esPremiumBool,
      precioCentavos: precioValidado,
      resumenPublico: esPremiumBool && typeof resumenPublico === "string"
        ? resumenPublico.slice(0, 1500)
        : null,
      etiquetas: etiquetas?.length
        ? {
            create: await Promise.all(
              (etiquetas as string[]).map(async (nombre: string) => {
                const etSlug = toSlug(nombre);
                const etiqueta = await prisma.etiqueta.upsert({
                  where: { slug: etSlug },
                  update: {},
                  create: { nombre, slug: etSlug },
                });
                return { etiquetaId: etiqueta.id };
              })
            ),
          }
        : undefined,
    },
  });

  return NextResponse.json(publicacion, { status: 201 });
}
