"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { formatFecha } from "@/lib/utils";

interface Respuesta {
  id: string;
  asunto: string;
  cuerpoTexto: string;
  estadoEnvio: string;
  errorMensaje: string | null;
  creadoAt: string;
}

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
  respondidaAt: string | null;
  servicio: { titulo: string; categoria: string } | null;
  respuestas?: Respuesta[];
  _count?: { respuestas: number };
}

const ESTADOS = ["PENDIENTE", "REVISADO", "RESPONDIDA", "ARCHIVADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_ESTILOS: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  REVISADO: "bg-emerald-50 text-emerald-700",
  RESPONDIDA: "bg-blue-50 text-blue-700",
  ARCHIVADO: "bg-zinc-100 text-zinc-500",
};

const MAX_RESPUESTAS = 5;

export default function AdminCotizacionesPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [asuntoResp, setAsuntoResp] = useState("");
  const [cuerpoResp, setCuerpoResp] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorResp, setErrorResp] = useState("");
  const [detalle, setDetalle] = useState<Record<string, Respuesta[]>>({});

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

  async function cargarRespuestas(id: string) {
    if (detalle[id]) return;
    const r = await fetch(`/api/admin/cotizaciones/${id}`);
    if (!r.ok) return;
    const d = (await r.json()) as { respuestas: Respuesta[] };
    setDetalle((prev) => ({ ...prev, [id]: d.respuestas }));
  }

  function abrirRespuesta(s: Solicitud) {
    setRespondiendo(s.id);
    setAsuntoResp(`Re: tu solicitud ${s.servicio?.titulo ?? "de cotización"}`);
    setCuerpoResp("");
    setErrorResp("");
    cargarRespuestas(s.id);
  }

  function cerrarRespuesta() {
    setRespondiendo(null);
    setAsuntoResp("");
    setCuerpoResp("");
    setErrorResp("");
  }

  async function enviarRespuesta(id: string) {
    setEnviando(true);
    setErrorResp("");
    try {
      const r = await fetch(`/api/admin/cotizaciones/${id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asunto: asuntoResp, cuerpo: cuerpoResp }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setErrorResp(data.error ?? "Error inesperado.");
        return;
      }
      setDetalle((prev) => ({ ...prev, [id]: [] }));
      cerrarRespuesta();
      cargar();
      await cargarRespuestas(id);
    } catch {
      setErrorResp("Error de red. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
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

                  <div className="flex items-center gap-3 mt-1">
                    <button
                      onClick={() => setExpandida(expandida === s.id ? null : s.id)}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      {expandida === s.id ? "Colapsar" : "Ver descripción completa"}
                    </button>
                    {(s._count?.respuestas ?? 0) > 0 && (
                      <button
                        onClick={() => {
                          const yaAbierto = detalle[s.id] !== undefined;
                          if (yaAbierto) {
                            setDetalle((p) => {
                              const c = { ...p };
                              delete c[s.id];
                              return c;
                            });
                          } else {
                            cargarRespuestas(s.id);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-brand-700 hover:underline"
                      >
                        {detalle[s.id] !== undefined ? "Ocultar" : "Ver"} historial ({s._count?.respuestas}/{MAX_RESPUESTAS})
                      </button>
                    )}
                  </div>

                  {/* Historial de respuestas */}
                  {detalle[s.id] && detalle[s.id].length > 0 && (
                    <div className="mt-3 border border-zinc-200 rounded-lg bg-white divide-y divide-zinc-100">
                      {detalle[s.id].map((r) => (
                        <div key={r.id} className="p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-700 truncate">{r.asunto}</span>
                            <span className={`badge text-[10px] ${r.estadoEnvio === "ENVIADO" ? "bg-emerald-50 text-emerald-700" : r.estadoEnvio === "FALLIDO" ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-500"}`}>
                              {r.estadoEnvio}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mb-1.5">{formatFecha(r.creadoAt)}</p>
                          <p className="text-xs text-zinc-600 whitespace-pre-wrap line-clamp-4">{r.cuerpoTexto}</p>
                          {r.errorMensaje && (
                            <p className="text-xs text-red-600 mt-1">Error: {r.errorMensaje}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form de respuesta inline */}
                  {respondiendo === s.id && (
                    <div className="mt-4 border border-brand-200 bg-brand-50/30 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">Asunto</label>
                        <input
                          type="text"
                          value={asuntoResp}
                          onChange={(e) => setAsuntoResp(e.target.value)}
                          maxLength={200}
                          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-200 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                          Cuerpo (texto plano; los saltos de línea se preservan)
                        </label>
                        <textarea
                          value={cuerpoResp}
                          onChange={(e) => setCuerpoResp(e.target.value)}
                          maxLength={8000}
                          rows={8}
                          placeholder={`Hola ${s.nombre},\n\nGracias por tu interés. …`}
                          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-200 outline-none bg-white font-sans"
                        />
                        <p className="text-[10px] text-zinc-400 mt-1">
                          {cuerpoResp.length}/8000 caracteres
                        </p>
                      </div>
                      {errorResp && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                          {errorResp}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => enviarRespuesta(s.id)}
                          disabled={enviando || !asuntoResp.trim() || cuerpoResp.trim().length < 10}
                          className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {enviando ? "Enviando…" : "Enviar respuesta"}
                        </button>
                        <button
                          onClick={cerrarRespuesta}
                          disabled={enviando}
                          className="btn-secondary text-xs disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {(s._count?.respuestas ?? 0) < MAX_RESPUESTAS && respondiendo !== s.id && (
                    <button
                      onClick={() => abrirRespuesta(s)}
                      className="btn-primary py-1 text-xs"
                    >
                      Responder
                    </button>
                  )}
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
