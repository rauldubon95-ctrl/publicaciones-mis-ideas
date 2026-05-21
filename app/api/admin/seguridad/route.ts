import { NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalEventos7d,
    eventosPorTipo,
    topIps,
    ultimosEventos,
    loginsFallidos24h,
    bots24h,
    scans24h,
  ] = await Promise.all([
    prisma.eventoSeguridad.count({ where: { creadoAt: { gte: hace7dias } } }),

    prisma.eventoSeguridad.groupBy({
      by: ["tipo"],
      _count: { tipo: true },
      where: { creadoAt: { gte: hace7dias } },
      orderBy: { _count: { tipo: "desc" } },
    }),

    prisma.eventoSeguridad.groupBy({
      by: ["ip"],
      _count: { ip: true },
      where: { creadoAt: { gte: hace7dias } },
      orderBy: { _count: { ip: "desc" } },
      take: 10,
    }),

    prisma.eventoSeguridad.findMany({
      orderBy: { creadoAt: "desc" },
      take: 20,
      select: { id: true, tipo: true, ip: true, ruta: true, creadoAt: true },
    }),

    prisma.eventoSeguridad.count({
      where: { tipo: "LOGIN_FALLIDO", creadoAt: { gte: hace24h } },
    }),

    prisma.eventoSeguridad.count({
      where: { tipo: "BOT_DETECTADO", creadoAt: { gte: hace24h } },
    }),

    prisma.eventoSeguridad.count({
      where: { tipo: "SCAN_PATH", creadoAt: { gte: hace24h } },
    }),
  ]);

  return NextResponse.json({
    totalEventos7d,
    eventosPorTipo: eventosPorTipo.map((e) => ({
      tipo: e.tipo,
      count: e._count.tipo,
    })),
    topIps: topIps.map((e) => ({ ip: e.ip, count: e._count.ip })),
    ultimosEventos,
    resumen24h: {
      loginsFallidos: loginsFallidos24h,
      bots: bots24h,
      scans: scans24h,
    },
  });
}
