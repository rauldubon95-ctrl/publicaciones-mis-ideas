"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatFecha } from "@/lib/utils";

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

interface Datos {
  totales: Record<Tipo, { recaudado: number; ventas: number }>;
  totalGlobal: number;
  ventasGlobal: number;
  transacciones: Transaccion[];
}

const META: Record<Tipo, { label: string; href: string; color: string }> = {
  articulo: { label: "Artículos", href: "/admin/compras", color: "bg-blue-50 text-blue-700" },
  libro: { label: "Libros", href: "/admin/ventas-libros", color: "bg-emerald-50 text-emerald-700" },
  recurso: { label: "Recursos", href: "/admin/ventas-recursos", color: "bg-violet-50 text-violet-700" },
  dashboard: { label: "Dashboards", href: "/admin/ventas-dashboards", color: "bg-amber-50 text-amber-700" },
  donacion: { label: "Donaciones", href: "/admin/donaciones", color: "bg-rose-50 text-rose-700" },
};

const TIPOS: Tipo[] = ["articulo", "libro", "recurso", "dashboard", "donacion"];

function usd(centavos: number) {
  return `$${(centavos / 100).toFixed(2)}`;
}

export default function MonetizacionPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Tipo | "todos">("todos");

  useEffect(() => {
    fetch("/api/admin/monetizacion")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setDatos(d); })
      .finally(() => setCargando(false));
  }, [router]);

  const transacciones = (datos?.transacciones ?? []).filter(
    (t) => filtro === "todos" || t.tipo === filtro
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Monetización</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Todo lo que generas, en un solo lugar
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
      </div>

      {cargando ? (
        <p className="text-zinc-400 text-sm text-center py-20">Cargando…</p>
      ) : !datos ? (
        <p className="text-zinc-400 text-sm text-center py-20">No se pudieron cargar los datos.</p>
      ) : (
        <>
          {/* Total global */}
          <div className="mb-8 rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Total recaudado (completado)
            </p>
            <p className="text-4xl font-serif font-semibold text-brand-900 mt-1">
              {usd(datos.totalGlobal)} <span className="text-base font-sans text-brand-500">USD</span>
            </p>
            <p className="text-sm text-brand-600 mt-1">
              {datos.ventasGlobal} {datos.ventasGlobal === 1 ? "transacción" : "transacciones"} en total
            </p>
          </div>

          {/* Tarjetas por tipo */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
            {TIPOS.map((tipo) => {
              const t = datos.totales[tipo];
              return (
                <Link
                  key={tipo}
                  href={META[tipo].href}
                  className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-brand-300 hover:shadow-xs transition-all"
                >
                  <span className={`badge text-xs uppercase tracking-wider ${META[tipo].color}`}>
                    {META[tipo].label}
                  </span>
                  <p className="text-xl font-semibold text-zinc-900 mt-2">{usd(t.recaudado)}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t.ventas} {t.ventas === 1 ? "venta" : "ventas"}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Feed unificado */}
          <div className="border-t border-zinc-100 pt-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Transacciones recientes
              </h2>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value as Tipo | "todos")}
                className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-600 bg-white outline-hidden focus:border-brand-400"
              >
                <option value="todos">Todos los tipos</option>
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>{META[tipo].label}</option>
                ))}
              </select>
            </div>

            {transacciones.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                <p className="text-sm">Sin transacciones todavía.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {transacciones.map((t, i) => (
                  <div key={i} className="py-3 flex items-center gap-3">
                    <span className={`badge text-xs uppercase tracking-wider shrink-0 ${META[t.tipo].color}`}>
                      {META[t.tipo].label.slice(0, -1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-800 truncate">{t.titulo}</p>
                      <p className="text-xs text-zinc-400 truncate">
                        {t.email ?? "—"} · {formatFecha(t.creadoAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-zinc-900">{usd(t.montoCentavos)}</p>
                      <p className={`text-xs ${t.estado === "COMPLETADO" ? "text-emerald-600" : "text-zinc-400"}`}>
                        {t.estado.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
