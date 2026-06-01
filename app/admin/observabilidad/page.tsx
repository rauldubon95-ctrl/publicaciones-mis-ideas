"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Resumen {
  totalConsultas: number;
  totalErrores: number;
  totalBloqueados: number;
  latenciaPromedio: number;
  confianzaPromedio: number;
  confianza: { alta: number; media: number; baja: number };
  porRetrieval: Record<string, number>;
  porDia: Record<string, number>;
}

interface Evento {
  traceId: string;
  tipo: string;
  timestamp: number;
  duracionMs?: number;
  docsRecuperados?: number;
  scoreConfianza?: number;
  viaRetrieval?: string;
  errorMsg?: string;
}

interface TelemetriaData {
  resumen: Resumen;
  recientes: Evento[];
  periodo: string;
}

const COLORES_CONFIANZA = { alta: "#22c55e", media: "#f59e0b", baja: "#ef4444" };
const COLORES_RETRIEVAL = { fts: "#6366f1", like: "#8b5cf6", vector: "#3b82f6", sin_docs: "#9ca3af" };

function Tarjeta({ titulo, valor, sub, color }: { titulo: string; valor: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{titulo}</p>
      <p className={`text-3xl font-bold ${color ?? "text-gray-900"}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ObservabilidadPage() {
  const [data, setData] = useState<TelemetriaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/telemetria")
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error ?? "Error desconocido"); });
        return r.json();
      })
      .then((d: TelemetriaData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Cargando telemetría...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Link href="/admin" className="text-blue-600 text-sm hover:underline">← Volver al admin</Link>
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-medium">No se pudo cargar la telemetría</p>
          <p className="text-sm mt-1">{error ?? "Sin datos disponibles"}</p>
          <div className="text-xs mt-3 text-red-500 space-y-1">
            <p>Si el error dice "401": el secreto <code className="bg-red-100 px-1 rounded">D1_SYNC_SECRET</code> en Vercel no coincide con el del Worker.</p>
            <p>Solución: en Cloudflare → Workers → <em>sociologia</em> → Settings → Variables → agrega <code className="bg-red-100 px-1 rounded">D1_SYNC_SECRET</code> como secret con el mismo valor que tienes en Vercel.</p>
          </div>
        </div>
      </div>
    );
  }

  const { resumen, recientes } = data;

  // Datos para el gráfico de días (ordenados)
  const dataDias = Object.entries(resumen.porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, total]) => ({ dia: dia.slice(5), total })); // MM-DD

  // Datos de retrieval
  const dataRetrieval = Object.entries(resumen.porRetrieval)
    .filter(([, v]) => v > 0)
    .map(([method, count]) => ({ method, count }));

  // Datos de confianza
  const dataConfianza = [
    { nivel: "Alta", count: resumen.confianza.alta },
    { nivel: "Media", count: resumen.confianza.media },
    { nivel: "Baja", count: resumen.confianza.baja },
  ].filter((d) => d.count > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-blue-600 text-sm hover:underline">← Volver al admin</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Observabilidad IA</h1>
            <p className="text-sm text-gray-500">Últimos 7 días · Asistente académico</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Actualizar
          </button>
        </div>

        {/* Tarjetas resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Tarjeta
            titulo="Consultas totales"
            valor={resumen.totalConsultas}
            sub="últimos 7 días"
            color="text-indigo-700"
          />
          <Tarjeta
            titulo="Latencia promedio"
            valor={`${resumen.latenciaPromedio} ms`}
            sub="tiempo de respuesta"
            color={resumen.latenciaPromedio > 5000 ? "text-amber-600" : "text-gray-900"}
          />
          <Tarjeta
            titulo="Confianza promedio"
            valor={`${Math.round(resumen.confianzaPromedio * 100)}%`}
            sub="grounding ratio"
            color={resumen.confianzaPromedio >= 0.6 ? "text-green-700" : "text-amber-600"}
          />
          <Tarjeta
            titulo="Bloqueados / Errores"
            valor={`${resumen.totalBloqueados} / ${resumen.totalErrores}`}
            sub="inyección bloqueada / fallos"
            color={resumen.totalBloqueados > 5 ? "text-red-600" : "text-gray-900"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Consultas por día */}
          {dataDias.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Consultas por día</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dataDias} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Consultas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribución de confianza */}
          {dataConfianza.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución de confianza</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dataConfianza} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="nivel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Respuestas">
                    {dataConfianza.map((entry) => (
                      <Cell
                        key={entry.nivel}
                        fill={COLORES_CONFIANZA[entry.nivel.toLowerCase() as keyof typeof COLORES_CONFIANZA] ?? "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Método de retrieval + skills */}
        {dataRetrieval.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Método de recuperación de documentos</h2>
            <div className="flex flex-wrap gap-4">
              {dataRetrieval.map(({ method, count }) => (
                <div key={method} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORES_RETRIEVAL[method as keyof typeof COLORES_RETRIEVAL] ?? "#6b7280" }}
                  />
                  <span className="text-sm font-medium text-gray-700">{method.toUpperCase()}</span>
                  <span className="text-sm text-gray-500">{count}</span>
                  <span className="text-xs text-gray-400">
                    ({resumen.totalConsultas > 0 ? Math.round((count / resumen.totalConsultas) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              FTS = búsqueda de texto completo (BM25) · LIKE = búsqueda por palabras · sin_docs = sin documentos encontrados
            </p>
          </div>
        )}

        {/* Eventos recientes */}
        {recientes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Eventos recientes (últimos 30)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-600">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Tipo</th>
                    <th className="pb-2 pr-4">Hora</th>
                    <th className="pb-2 pr-4">Latencia</th>
                    <th className="pb-2 pr-4">Docs</th>
                    <th className="pb-2 pr-4">Confianza</th>
                    <th className="pb-2">Via</th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((e, i) => (
                    <tr key={e.traceId ?? i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          e.tipo === "query_complete" ? "bg-indigo-50 text-indigo-700"
                          : e.tipo === "injection_blocked" ? "bg-red-50 text-red-700"
                          : e.tipo === "error" ? "bg-orange-50 text-orange-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                          {e.tipo.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-400">
                        {new Date(e.timestamp).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2 pr-4">
                        {e.duracionMs ? `${e.duracionMs} ms` : "—"}
                      </td>
                      <td className="py-2 pr-4">{e.docsRecuperados ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {e.scoreConfianza !== undefined
                          ? <span className={`font-medium ${e.scoreConfianza >= 0.7 ? "text-green-600" : e.scoreConfianza >= 0.4 ? "text-amber-600" : "text-red-500"}`}>
                              {Math.round(e.scoreConfianza * 100)}%
                            </span>
                          : "—"}
                      </td>
                      <td className="py-2 text-gray-400">{e.viaRetrieval ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {resumen.totalConsultas === 0 && recientes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Sin datos de telemetría aún</p>
            <p className="text-sm mt-2">Los datos aparecen después de las primeras consultas al asistente IA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
