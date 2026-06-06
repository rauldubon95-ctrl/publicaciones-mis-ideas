"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFecha } from "@/lib/utils";

interface Donacion {
  id: string;
  monto: number;
  moneda: string;
  nombre: string | null;
  correo: string | null;
  estado: string;
  stripeId: string | null;
  creadoAt: string;
}

interface DatosAPI {
  donaciones: Donacion[];
  total: number;
  totalRecaudado: number;
}

const ESTADOS = ["PENDIENTE", "COMPLETADO", "FALLIDO", "CANCELADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_ESTILOS: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  COMPLETADO: "bg-emerald-50 text-emerald-700",
  FALLIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-zinc-100 text-zinc-500",
};

export default function AdminDonacionesPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosAPI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<string>("");

  const cargar = useCallback(() => {
    setCargando(true);
    const params = filtro ? `?estado=${filtro}` : "";
    fetch(`/api/admin/donaciones${params}`)
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
  }, [router, filtro]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando…</p>
      </div>
    );
  }

  if (!datos) return null;

  const totalDolares = (datos.totalRecaudado / 100).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">
            Donaciones
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {datos.total} registro{datos.total !== 1 ? "s" : ""}
            {filtro && ` · filtro: ${filtro}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="btn-secondary text-sm"
        >
          ← Admin
        </button>
      </div>

      {/* Stat: Total recaudado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="col-span-2 sm:col-span-1 bg-white border border-zinc-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-700">
            ${totalDolares}
          </p>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wide">
            Recaudado
          </p>
        </div>
        {ESTADOS.map((e) => {
          const count = datos.donaciones.filter((d) => d.estado === e).length;
          const colores: Record<Estado, string> = {
            PENDIENTE: "text-amber-700",
            COMPLETADO: "text-emerald-700",
            FALLIDO: "text-red-600",
            CANCELADO: "text-zinc-400",
          };
          return (
            <div
              key={e}
              className="bg-white border border-zinc-200 rounded-xl p-4 text-center"
            >
              <p className={`text-2xl font-bold tabular-nums ${colores[e]}`}>
                {count}
              </p>
              <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wide">
                {e === "PENDIENTE"
                  ? "Pendientes"
                  : e === "COMPLETADO"
                  ? "Completadas"
                  : e === "FALLIDO"
                  ? "Fallidas"
                  : "Canceladas"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFiltro("")}
          className={`badge py-1.5 px-3 text-xs cursor-pointer border transition-colors ${
            filtro === ""
              ? "bg-brand-700 text-white border-brand-700"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
          }`}
        >
          Todas
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e === filtro ? "" : e)}
            className={`badge py-1.5 px-3 text-xs cursor-pointer border transition-colors ${
              filtro === e
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Tabla de donaciones */}
      {datos.donaciones.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-sm">
          <p className="text-sm">
            No hay donaciones{filtro ? ` con estado ${filtro}` : ""}.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Nombre / Correo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    PayPal Order ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {datos.donaciones.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                      {formatFecha(d.creadoAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-800 whitespace-nowrap">
                      ${(d.monto / 100).toFixed(2)}{" "}
                      <span className="text-xs font-normal text-zinc-400">
                        {d.moneda}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {d.nombre && (
                        <span className="font-medium">{d.nombre}</span>
                      )}
                      {d.nombre && d.correo && " · "}
                      {d.correo && (
                        <a
                          href={`mailto:${d.correo}`}
                          className="text-zinc-500 hover:text-brand-700 transition-colors"
                        >
                          {d.correo}
                        </a>
                      )}
                      {!d.nombre && !d.correo && (
                        <span className="text-zinc-300 text-xs">Anónimo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge text-xs uppercase tracking-wider ${
                          ESTADO_ESTILOS[d.estado as Estado] ??
                          "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {d.stripeId ? (
                        <code className="text-xs text-zinc-400 font-mono truncate max-w-[140px] block">
                          {d.stripeId}
                        </code>
                      ) : (
                        <span className="text-zinc-200 text-xs">—</span>
                      )}
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
