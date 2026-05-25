"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { formatFecha } from "@/lib/utils";

interface Solicitud {
  id: string;
  nombre: string;
  correo: string;
  organizacion: string | null;
  tipoServicio: string | null;
  descripcion: string;
  presupuesto: string | null;
  estado: string;
  creadoAt: string;
  servicio: { titulo: string; categoria: string } | null;
}

const ESTADOS = ["PENDIENTE", "REVISADO", "ARCHIVADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_ESTILOS: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  REVISADO: "bg-emerald-50 text-emerald-700",
  ARCHIVADO: "bg-zinc-100 text-zinc-500",
};

export default function AdminCotizacionesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    const params = filtroEstado ? `?estado=${filtroEstado}` : "";
    fetch(`/api/admin/cotizaciones${params}`)
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          const d = data as { solicitudes: Solicitud[]; total: number };
          setSolicitudes(d.solicitudes);
          setTotal(d.total);
        }
      })
      .finally(() => setCargando(false));
  }, [router, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarEstado(id: string, estado: Estado) {
    setActualizando(id);
    try {
      await fetch(`/api/admin/cotizaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      cargar();
    } finally {
      setActualizando(null);
    }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar solicitud de "${nombre}"?`)) return;
    await fetch(`/api/admin/cotizaciones/${id}`, { method: "DELETE" });
    cargar();
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Cotizaciones</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {total} solicitud{total !== 1 ? "es" : ""}
            {filtroEstado && ` · filtro: ${filtroEstado}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/servicios" className="btn-secondary text-xs">
            Servicios
          </Link>
          <Link href="/admin" className="btn-secondary">
            ← Volver
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFiltroEstado("")}
          className={`badge py-1.5 px-3 text-xs cursor-pointer border transition-colors ${
            filtroEstado === ""
              ? "bg-brand-700 text-white border-brand-700"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
          }`}
        >
          Todas
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e === filtroEstado ? "" : e)}
            className={`badge py-1.5 px-3 text-xs cursor-pointer border transition-colors ${
              filtroEstado === e
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded">
          <p className="text-sm">No hay solicitudes{filtroEstado ? ` con estado ${filtroEstado}` : ""}.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {solicitudes.map((s) => (
            <div key={s.id} className="py-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`badge text-xs uppercase tracking-wider ${ESTADO_ESTILOS[s.estado as Estado] ?? "bg-zinc-100 text-zinc-500"}`}
                    >
                      {s.estado}
                    </span>
                    {s.servicio && (
                      <span className="badge bg-brand-50 text-brand-600 text-xs">
                        {s.servicio.titulo}
                      </span>
                    )}
                  </div>
                  <h2 className="font-medium text-zinc-900 text-sm">{s.nombre}</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    <a
                      href={`mailto:${s.correo}`}
                      className="hover:text-brand-700 transition-colors"
                    >
                      {s.correo}
                    </a>
                    {s.organizacion && ` · ${s.organizacion}`}
                    {s.presupuesto && ` · ${s.presupuesto}`}
                    {" · "}
                    {formatFecha(s.creadoAt)}
                  </p>
                  {s.tipoServicio && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Servicio solicitado: {s.tipoServicio}
                    </p>
                  )}

                  {/* Descripción expandible */}
                  {expandida === s.id ? (
                    <div className="mt-3 p-3 bg-zinc-50 rounded border border-zinc-100 text-sm text-zinc-700 whitespace-pre-wrap">
                      {s.descripcion}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{s.descripcion}</p>
                  )}

                  <button
                    onClick={() => setExpandida(expandida === s.id ? null : s.id)}
                    className="text-xs text-brand-600 hover:underline mt-1"
                  >
                    {expandida === s.id ? "Colapsar" : "Ver descripción completa"}
                  </button>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {ESTADOS.filter((e) => e !== s.estado).map((e) => (
                    <button
                      key={e}
                      onClick={() => cambiarEstado(s.id, e)}
                      disabled={actualizando === s.id}
                      className="btn-secondary py-1 text-xs disabled:opacity-50"
                    >
                      → {e}
                    </button>
                  ))}
                  <button
                    onClick={() => eliminar(s.id, s.nombre)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors py-1"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
