import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vista unificada de monetización: agrega los 5 flujos de ingreso (artículos,
// libros, recursos, dashboards y donaciones) en un solo lugar. Reúne totales
// por tipo + global y un feed reciente de transacciones. Reutiliza los mismos
// modelos que los paneles individuales; estos siguen existiendo para el detalle.

type Tipo = "articulo" | "libro" | "recurso" | "dashboard" | "donacion";

interface Transaccion {
  tipo: Tipo;
  titulo: string;
  email: string | null;
  montoCentavos: number;
  moneda: string;
  estado: string;
  creadoAt: string;
}

const COMPLETADO = { estado: "COMPLETADO" };
const RECIENTES = { orderBy: { creadoAt: "desc" as const }, take: 15 };

export async function GET(_req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const [
    artItems, artSum,
    libItems, libSum,
    recItems, recSum,
    dashItems, dashSum,
    donItems, donSum,
  ] = await Promise.all([
    prisma.pedidoContenido.findMany({
      ...RECIENTES,
      select: { emailComprador: true, montoCentavos: true, moneda: true, estado: true, creadoAt: true, publicacion: { select: { titulo: true } } },
    }),
    prisma.pedidoContenido.aggregate({ where: COMPLETADO, _sum: { montoCentavos: true }, _count: true }),
    prisma.pedidoLibro.findMany({
      ...RECIENTES,
      select: { emailComprador: true, montoCentavos: true, moneda: true, estado: true, creadoAt: true, libro: { select: { titulo: true } } },
    }),
    prisma.pedidoLibro.aggregate({ where: COMPLETADO, _sum: { montoCentavos: true }, _count: true }),
    prisma.pedidoRecurso.findMany({
      ...RECIENTES,
      select: { emailComprador: true, montoCentavos: true, moneda: true, estado: true, creadoAt: true, recurso: { select: { titulo: true } } },
    }),
    prisma.pedidoRecurso.aggregate({ where: COMPLETADO, _sum: { montoCentavos: true }, _count: true }),
    prisma.pedidoDashboard.findMany({
      ...RECIENTES,
      select: { emailComprador: true, montoCentavos: true, moneda: true, estado: true, creadoAt: true, tablero: { select: { titulo: true } } },
    }),
    prisma.pedidoDashboard.aggregate({ where: COMPLETADO, _sum: { montoCentavos: true }, _count: true }),
    prisma.donacion.findMany({
      ...RECIENTES,
      select: { correo: true, monto: true, moneda: true, estado: true, creadoAt: true },
    }),
    prisma.donacion.aggregate({ where: COMPLETADO, _sum: { monto: true }, _count: true }),
  ]);

  const transacciones: Transaccion[] = [
    ...artItems.map((p) => ({ tipo: "articulo" as const, titulo: p.publicacion?.titulo ?? "Artículo", email: p.emailComprador, montoCentavos: p.montoCentavos, moneda: p.moneda, estado: p.estado, creadoAt: p.creadoAt.toISOString() })),
    ...libItems.map((p) => ({ tipo: "libro" as const, titulo: p.libro?.titulo ?? "Libro", email: p.emailComprador, montoCentavos: p.montoCentavos, moneda: p.moneda, estado: p.estado, creadoAt: p.creadoAt.toISOString() })),
    ...recItems.map((p) => ({ tipo: "recurso" as const, titulo: p.recurso?.titulo ?? "Recurso", email: p.emailComprador, montoCentavos: p.montoCentavos, moneda: p.moneda, estado: p.estado, creadoAt: p.creadoAt.toISOString() })),
    ...dashItems.map((p) => ({ tipo: "dashboard" as const, titulo: p.tablero?.titulo ?? "Dashboard", email: p.emailComprador, montoCentavos: p.montoCentavos, moneda: p.moneda, estado: p.estado, creadoAt: p.creadoAt.toISOString() })),
    ...donItems.map((d) => ({ tipo: "donacion" as const, titulo: "Donación", email: d.correo, montoCentavos: d.monto, moneda: d.moneda, estado: d.estado, creadoAt: d.creadoAt.toISOString() })),
  ]
    .sort((a, b) => b.creadoAt.localeCompare(a.creadoAt))
    .slice(0, 40);

  const totales = {
    articulo: { recaudado: artSum._sum.montoCentavos ?? 0, ventas: artSum._count },
    libro: { recaudado: libSum._sum.montoCentavos ?? 0, ventas: libSum._count },
    recurso: { recaudado: recSum._sum.montoCentavos ?? 0, ventas: recSum._count },
    dashboard: { recaudado: dashSum._sum.montoCentavos ?? 0, ventas: dashSum._count },
    donacion: { recaudado: donSum._sum.monto ?? 0, ventas: donSum._count },
  };

  const totalGlobal = Object.values(totales).reduce((s, t) => s + t.recaudado, 0);
  const ventasGlobal = Object.values(totales).reduce((s, t) => s + t.ventas, 0);

  return NextResponse.json({ totales, totalGlobal, ventasGlobal, transacciones });
}
