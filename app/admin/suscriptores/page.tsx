"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatFecha } from "@/lib/utils";

interface Suscriptor {
  id: string;
  email: string;
  nombre: string | null;
  status: string;
  confirmedAt: string | null;
  creadoAt: string;
}

interface Stats {
  total: number;
  activos: number;
  pendientes: number;
  cancelados: number;
}

interface CrecimientoItem {
  mes: string;
  total: number;
}

interface DatosAPI {
  stats: Stats;
  suscriptores: Suscriptor[];
  crecimiento: CrecimientoItem[];
}

const ESTADO_LABEL: Record<string, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  UNSUBSCRIBED: "Cancelado",
};

const ESTADO_CLASE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  UNSUBSCRIBED: "bg-zinc-100 text-zinc-500",
};

export default function AdminSuscriptoresPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosAPI | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/suscriptores")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json() as Promise<DatosAPI>;
      })
      .then((d) => { if (d) setDatos(d); })
      .finally(() => setCargando(false));
  }, [router]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando…</p>
      </div>
    );
  }

  if (!datos) return null;

  const { stats, suscriptores, crecimiento } = datos;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Suscriptores</h1>
          <p className="text-zinc-400 text-sm mt-1">Sistema de notificaciones por correo</p>
        </div>
        <button onClick={() => router.push("/admin")} className="btn-secondary text-sm">
          ← Admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total", valor: stats.total, color: "text-zinc-800" },
          { label: "Activos", valor: stats.activos, color: "text-emerald-700" },
          { label: "Pendientes", valor: stats.pendientes, color: "text-amber-700" },
          { label: "Cancelados", valor: stats.cancelados, color: "text-zinc-400" },
        ].map(({ label, valor, color }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{valor}</p>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Crecimiento mensual */}
      {crecimiento.length > 0 && (
        <div className="mb-10 bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Crecimiento mensual (confirmados)
          </h2>
          <div className="flex items-end gap-2 h-20">
            {crecimiento.map((item) => {
              const max = Math.max(...crecimiento.map((i) => i.total), 1);
              const altura = Math.round((item.total / max) * 100);
              return (
                <div key={item.mes} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-500 tabular-nums">{item.total}</span>
                  <div
                    className="w-full bg-brand-200 rounded-xs"
                    style={{ height: `${Math.max(altura, 4)}%` }}
                  />
                  <span className="text-[10px] text-zinc-400 truncate w-full text-center">
                    {item.mes.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de suscriptores */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Últimos 50 registros
          </h2>
        </div>

        {suscriptores.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p className="text-sm">Aún no hay suscriptores.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {suscriptores.map((s) => (
              <div key={s.id} className="px-6 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {s.nombre ? `${s.nombre} — ` : ""}
                    <span className="font-normal text-zinc-500">{s.email}</span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Registrado: {formatFecha(s.creadoAt)}
                    {s.confirmedAt && ` · Confirmado: ${formatFecha(s.confirmedAt)}`}
                  </p>
                </div>
                <span className={`badge text-xs uppercase tracking-wider shrink-0 ${ESTADO_CLASE[s.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                  {ESTADO_LABEL[s.status] ?? s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nota sobre envío de notificaciones */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm text-blue-800 font-medium mb-1">Cómo notificar suscriptores</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          Al editar una publicación en el panel admin, encontrarás el botón
          <strong> &ldquo;Notificar suscriptores&rdquo;</strong> en la sección de publicación.
          Solo se envía a los suscriptores con estado <em>Activo</em>.
        </p>
      </div>
    </div>
  );
}
