"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFecha } from "@/lib/utils";

interface Venta {
  id: string;
  emailComprador: string;
  nombreComprador: string | null;
  montoCentavos: number;
  moneda: string;
  estado: string;
  paypalOrderId: string | null;
  creadoAt: string;
  completadoAt: string | null;
  libro: { titulo: string; slug: string };
}

interface DatosAPI {
  ventas: Venta[];
  totalRecaudado: number;
  totalCompletadas: number;
}

const ESTADOS = ["PENDIENTE", "COMPLETADO", "FALLIDO", "CANCELADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_ESTILOS: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  COMPLETADO: "bg-emerald-50 text-emerald-700",
  FALLIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-zinc-100 text-zinc-500",
};

export default function AdminVentasLibrosPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosAPI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<string>("");

  const cargar = useCallback(() => {
    setCargando(true);
    const params = filtro ? `?estado=${filtro}` : "";
    fetch(`/api/admin/ventas-libros${params}`)
      .then((r) => {
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json() as Promise<DatosAPI>;
      })
      .then((d) => {
        if (d) setDatos(d);
      })
      .finally(() => setCargando(false));
  }, [filtro, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm text-zinc-400 mb-6 flex items-center gap-1">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <span className="text-zinc-600">Ventas de libros</span>
      </nav>

      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-zinc-900">
            Ventas de libros
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Pedidos de compra de libros vía PayPal.
          </p>
        </div>
        {datos && (
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Recaudado</p>
            <p className="text-2xl font-semibold text-emerald-700 tabular-nums">
              ${(datos.totalRecaudado / 100).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {datos.totalCompletadas} ventas completadas
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFiltro("")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filtro === ""
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Todas
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filtro === e
                ? "bg-zinc-900 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-zinc-400 text-sm">Cargando…</p>
      ) : !datos || datos.ventas.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-400 text-sm">
            No hay ventas todavía{filtro ? ` con estado ${filtro}` : ""}.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Libro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Comprador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {datos.ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                      {formatFecha(v.creadoAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-800 whitespace-nowrap">
                      ${(v.montoCentavos / 100).toFixed(2)}{" "}
                      <span className="text-xs font-normal text-zinc-400">{v.moneda}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/libros/${v.libro.slug}`}
                        className="text-brand-700 hover:underline text-sm"
                        target="_blank"
                      >
                        {v.libro.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {v.nombreComprador && (
                        <span className="font-medium">{v.nombreComprador}</span>
                      )}
                      {v.nombreComprador && " · "}
                      <a
                        href={`mailto:${v.emailComprador}`}
                        className="text-zinc-500 hover:text-brand-700 transition-colors text-sm"
                      >
                        {v.emailComprador}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge text-xs uppercase tracking-wider ${
                          ESTADO_ESTILOS[v.estado as Estado] ?? "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
