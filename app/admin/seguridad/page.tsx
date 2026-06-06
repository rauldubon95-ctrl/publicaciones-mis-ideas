"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface EventoResumen { tipo: string; count: number }
interface IpResumen    { ip: string; count: number }
interface Evento       { id: string; tipo: string; ip: string; ruta: string | null; creadoAt: string }
interface Resumen24h   { loginsFallidos: number; bots: number; scans: number }

interface DatosSeg {
  totalEventos7d: number;
  eventosPorTipo: EventoResumen[];
  topIps: IpResumen[];
  ultimosEventos: Evento[];
  resumen24h: Resumen24h;
}

const COLOR_TIPO: Record<string, string> = {
  LOGIN_FALLIDO:  "bg-red-100 text-red-700",
  RATE_LIMIT:     "bg-orange-100 text-orange-700",
  BOT_DETECTADO:  "bg-purple-100 text-purple-700",
  SCAN_PATH:      "bg-yellow-100 text-yellow-700",
  ACCESO_DENEGADO:"bg-zinc-100 text-zinc-600",
  SPAM:           "bg-pink-100 text-pink-700",
  LOGIN_EXITOSO:  "bg-emerald-100 text-emerald-700",
  INPUT_INVALIDO: "bg-blue-100 text-blue-700",
};

function BadgeTipo({ tipo }: { tipo: string }) {
  const cls = COLOR_TIPO[tipo] ?? "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {tipo}
    </span>
  );
}

export default function SeguridadPage() {
  const [datos, setDatos] = useState<DatosSeg | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/seguridad")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar datos de seguridad");
        return r.json();
      })
      .then(setDatos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <nav className="text-xs text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <span className="text-zinc-600">Seguridad</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold text-zinc-900">
          Panel de Seguridad
        </h1>
        <button
          onClick={() => { setCargando(true); setError(""); fetch("/api/admin/seguridad").then(r=>r.json()).then(setDatos).catch(e=>setError(e.message)).finally(()=>setCargando(false)); }}
          className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-sm"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm rounded-sm">
          {error}
        </div>
      )}

      {datos && (
        <>
          {/* Tarjetas de resumen 24h */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Tarjeta
              titulo="Eventos (7 días)"
              valor={datos.totalEventos7d}
              color="zinc"
            />
            <Tarjeta
              titulo="Logins fallidos (24h)"
              valor={datos.resumen24h.loginsFallidos}
              color={datos.resumen24h.loginsFallidos > 10 ? "red" : "emerald"}
              alerta={datos.resumen24h.loginsFallidos > 10}
            />
            <Tarjeta
              titulo="Bots bloqueados (24h)"
              valor={datos.resumen24h.bots}
              color={datos.resumen24h.bots > 50 ? "purple" : "zinc"}
            />
            <Tarjeta
              titulo="Path scans (24h)"
              valor={datos.resumen24h.scans}
              color={datos.resumen24h.scans > 5 ? "yellow" : "zinc"}
              alerta={datos.resumen24h.scans > 5}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Distribución por tipo */}
            <section className="border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4 uppercase tracking-wider">
                Eventos por tipo (7 días)
              </h2>
              {datos.eventosPorTipo.length === 0 ? (
                <p className="text-zinc-400 text-sm">Sin eventos registrados.</p>
              ) : (
                <ul className="space-y-2">
                  {datos.eventosPorTipo.map((e) => (
                    <li key={e.tipo} className="flex items-center justify-between">
                      <BadgeTipo tipo={e.tipo} />
                      <span className="text-sm font-mono text-zinc-700">{e.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top IPs */}
            <section className="border border-zinc-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4 uppercase tracking-wider">
                IPs más activas (7 días)
              </h2>
              {datos.topIps.length === 0 ? (
                <p className="text-zinc-400 text-sm">Sin actividad registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {datos.topIps.map((e) => (
                    <li key={e.ip} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-zinc-600">{e.ip}</span>
                      <span className="font-mono text-zinc-700">{e.count} eventos</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Log de últimos eventos */}
          <section className="border border-zinc-200 bg-white">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">
                Últimos 20 eventos
              </h2>
            </div>
            {datos.ultimosEventos.length === 0 ? (
              <p className="text-zinc-400 text-sm px-6 py-8 text-center">
                Sin eventos — tu blog está tranquilo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-4 py-2">Tipo</th>
                      <th className="text-left px-4 py-2">IP</th>
                      <th className="text-left px-4 py-2">Ruta</th>
                      <th className="text-left px-4 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {datos.ultimosEventos.map((e) => (
                      <tr key={e.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-2">
                          <BadgeTipo tipo={e.tipo} />
                        </td>
                        <td className="px-4 py-2 font-mono text-zinc-500 text-xs">{e.ip}</td>
                        <td className="px-4 py-2 text-zinc-400 text-xs truncate max-w-[200px]">
                          {e.ruta ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-zinc-400 text-xs whitespace-nowrap">
                          {new Date(e.creadoAt).toLocaleString("es-GT", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Explicación de tipos */}
          <section className="border border-zinc-100 bg-zinc-50 p-6 text-sm text-zinc-600 space-y-2">
            <p className="font-semibold text-zinc-700 mb-3">Glosario de eventos</p>
            <dl className="grid sm:grid-cols-2 gap-2">
              {[
                ["LOGIN_FALLIDO", "Intento de inicio de sesión con clave incorrecta"],
                ["RATE_LIMIT", "IP bloqueada temporalmente por exceder el límite de requests"],
                ["BOT_DETECTADO", "Petición API con User-Agent de herramienta de ataque"],
                ["SCAN_PATH", "Intento de acceder a rutas típicas de WordPress o /.env"],
                ["SPAM", "Comentario rechazado por contener spam o URLs"],
                ["ACCESO_DENEGADO", "Intento de acceder a /admin sin sesión válida"],
              ].map(([tipo, desc]) => (
                <div key={tipo} className="flex gap-2">
                  <BadgeTipo tipo={tipo} />
                  <span className="text-xs text-zinc-500">{desc}</span>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  color,
  alerta,
}: {
  titulo: string;
  valor: number;
  color: string;
  alerta?: boolean;
}) {
  const colores: Record<string, string> = {
    zinc:    "border-zinc-200 bg-white text-zinc-900",
    red:     "border-red-200 bg-red-50 text-red-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    purple:  "border-purple-200 bg-purple-50 text-purple-700",
    yellow:  "border-yellow-200 bg-yellow-50 text-yellow-700",
  };
  const cls = colores[color] ?? colores.zinc;
  return (
    <div className={`border p-4 rounded-sm ${cls}`}>
      <p className="text-xs uppercase tracking-wider opacity-70 mb-1">{titulo}</p>
      <p className="text-3xl font-mono font-semibold">
        {valor}
        {alerta && <span className="ml-1 text-base">⚠</span>}
      </p>
    </div>
  );
}
