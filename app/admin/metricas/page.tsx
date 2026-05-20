"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Resumen {
  totalVistas: number; vistasEstesMes: number;
  totalDescargas: number; descargasEsteMes: number;
  totalPublicaciones: number; publicacionesPublicadas: number;
  totalComentarios: number; vistasUltimos7: number;
}
interface DatoDia      { dia: string; total: number }
interface TopArticulo  { titulo: string; slug: string; vistas: number; descargas: number }
interface DatoPais     { pais: string; total: number }
interface DatoDispositivo { dispositivo: string; total: number }

interface SupabaseStats {
  dbBytes: number;
  storageBytes: number;
  storageArchivos: number;
  bucketExiste: boolean;
  limites: { dbBytes: number; storageBytes: number; bandwidthBytes: number };
}

interface Metricas {
  resumen: Resumen;
  graficos: { vistasPorDia: DatoDia[]; descargasPorDia: DatoDia[] };
  tablas: { topArticulos: TopArticulo[]; vistasPorPais: DatoPais[]; descargasPorPais: DatoPais[]; vistasPorDispositivo: DatoDispositivo[] };
  supabase: SupabaseStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BANDERAS: Record<string, string> = {
  US:"🇺🇸", MX:"🇲🇽", CO:"🇨🇴", AR:"🇦🇷", ES:"🇪🇸", CL:"🇨🇱", PE:"🇵🇪",
  VE:"🇻🇪", EC:"🇪🇨", BO:"🇧🇴", UY:"🇺🇾", PY:"🇵🇾", CR:"🇨🇷", DO:"🇩🇴",
  GT:"🇬🇹", HN:"🇭🇳", SV:"🇸🇻", NI:"🇳🇮", PA:"🇵🇦", BR:"🇧🇷", DE:"🇩🇪",
  FR:"🇫🇷", GB:"🇬🇧", IT:"🇮🇹", CA:"🇨🇦", AU:"🇦🇺",
};

const NOMBRES_PAISES: Record<string, string> = {
  US:"Estados Unidos", MX:"México", CO:"Colombia", AR:"Argentina", ES:"España",
  CL:"Chile", PE:"Perú", VE:"Venezuela", EC:"Ecuador", BO:"Bolivia", UY:"Uruguay",
  PY:"Paraguay", CR:"Costa Rica", DO:"Rep. Dominicana", GT:"Guatemala", HN:"Honduras",
  SV:"El Salvador", NI:"Nicaragua", PA:"Panamá", BR:"Brasil", DE:"Alemania",
  FR:"Francia", GB:"Reino Unido", IT:"Italia", CA:"Canadá", AU:"Australia",
};

function nombrePais(codigo: string) {
  if (codigo === "Desconocido") return "Desconocido";
  return `${BANDERAS[codigo] ?? "🌐"} ${NOMBRES_PAISES[codigo] ?? codigo}`;
}

function formatDia(dia: string) {
  const [,m,d] = dia.split("-");
  return `${d}/${m}`;
}

function pct(valor: number, total: number) {
  if (!total) return 0;
  return Math.round((valor / total) * 100);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────
function Metrica({ label, valor, sub, color = "zinc" }: {
  label: string; valor: number | string; sub?: string; color?: string
}) {
  const colores: Record<string, string> = {
    zinc: "border-zinc-200",
    brand: "border-brand-600 bg-brand-50",
    emerald: "border-emerald-400 bg-emerald-50",
    amber: "border-amber-400 bg-amber-50",
  };
  return (
    <div className={`bg-white border-l-4 ${colores[color]} border border-r-zinc-200 border-t-zinc-200 border-b-zinc-200 p-5`}>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-serif font-semibold text-zinc-900">{valor.toLocaleString()}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Indicador Supabase ───────────────────────────────────────────────────────
function IndicadorSupabase({ stats }: { stats: SupabaseStats }) {
  const { dbBytes, storageBytes, storageArchivos, bucketExiste, limites } = stats;
  const pctDb      = Math.min(Math.round((dbBytes      / limites.dbBytes)      * 100), 100);
  const pctStorage = Math.min(Math.round((storageBytes / limites.storageBytes) * 100), 100);

  function colorBarra(p: number) {
    if (p >= 80) return "bg-red-500";
    if (p >= 50) return "bg-amber-500";
    return "bg-emerald-500";
  }

  function alerta(p: number) {
    if (p >= 80) return "⚠ Cerca del límite — considera hacer limpieza o actualizar el plan.";
    if (p >= 50) return "Uso moderado — bien por ahora.";
    return "En zona segura.";
  }

  return (
    <div className="bg-white border border-zinc-200 p-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-5">
        Uso de Supabase — Plan gratuito
      </h3>

      <div className="space-y-5">
        {/* Base de datos */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-zinc-700">Base de datos</span>
            <span className="text-zinc-500">
              {formatBytes(dbBytes)} <span className="text-zinc-300">/ {formatBytes(limites.dbBytes)}</span>
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className={`h-full ${colorBarra(pctDb)} rounded-full transition-all`} style={{ width: `${pctDb}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-zinc-400">{pctDb}% utilizado</p>
            <p className="text-xs text-zinc-300">{alerta(pctDb)}</p>
          </div>
        </div>

        {/* Almacenamiento */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-zinc-700">Almacenamiento (imágenes)</span>
            <span className="text-zinc-500">
              {formatBytes(storageBytes)} <span className="text-zinc-300">/ {formatBytes(limites.storageBytes)}</span>
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className={`h-full ${colorBarra(pctStorage)} rounded-full transition-all`} style={{ width: `${pctStorage}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-zinc-400">{pctStorage}% · {storageArchivos} archivo{storageArchivos !== 1 ? "s" : ""}</p>
            {!bucketExiste && (
              <p className="text-xs text-red-400">Bucket &quot;comics&quot; no encontrado</p>
            )}
          </div>
        </div>

        {/* Ancho de banda */}
        <div className="pt-4 border-t border-zinc-100">
          <p className="text-xs font-medium text-zinc-500 mb-2">Límites del plan gratuito (referencia)</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Base de datos", valor: "500 MB" },
              { label: "Storage",       valor: "1 GB" },
              { label: "Bandwidth",     valor: "5 GB/mes" },
            ].map((item) => (
              <div key={item.label} className="border border-zinc-100 rounded p-2.5">
                <p className="text-xs text-zinc-400">{item.label}</p>
                <p className="text-sm font-semibold text-zinc-700 mt-0.5">{item.valor}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Gratis</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-300 mt-3 text-center">
            Plan Pro: $25 USD/mes · 8 GB DB · 100 GB Storage · 250 GB Bandwidth
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Consejero de costos ──────────────────────────────────────────────────────
function ConsejoCostos({ vistas }: { vistas: number }) {
  const porMes = vistas;
  const limiteHobby = 100_000;
  const pctUso = Math.min(Math.round((porMes / limiteHobby) * 100), 100);

  let estado: "ok" | "atencion" | "urgente" = "ok";
  let consejo = "";
  let colorBarra = "bg-emerald-500";

  if (pctUso >= 80) {
    estado = "urgente";
    consejo = "Estás cerca del límite del plan gratuito de Vercel. Considera pasar al plan Pro ($20/mes) para evitar interrupciones.";
    colorBarra = "bg-red-500";
  } else if (pctUso >= 50) {
    estado = "atencion";
    consejo = "Uso moderado — bien por ahora. Si el crecimiento continúa, en 1-2 meses podrías necesitar el plan Pro.";
    colorBarra = "bg-amber-500";
  } else {
    consejo = "Estás en zona segura. El plan gratuito de Vercel es suficiente para tu nivel de tráfico actual.";
  }

  const iconos: Record<string, string> = { ok: "✓", atencion: "!", urgente: "⚠" };
  const colores: Record<string, string> = {
    ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
    atencion: "bg-amber-50 border-amber-200 text-amber-800",
    urgente: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div className="bg-white border border-zinc-200 p-6">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Asesor de Costos
      </h3>

      <div className={`border rounded p-4 mb-5 text-sm flex gap-3 ${colores[estado]}`}>
        <span className="font-bold text-base leading-none mt-0.5">{iconos[estado]}</span>
        <p>{consejo}</p>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Uso del plan Vercel Hobby (gratuito)</span>
            <span className="font-medium">{porMes.toLocaleString()} / {limiteHobby.toLocaleString()} vistas/mes</span>
          </div>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className={`h-full ${colorBarra} rounded-full transition-all`} style={{ width: `${pctUso}%` }} />
          </div>
          <p className="text-xs text-zinc-400 mt-1">{pctUso}% utilizado</p>
        </div>

        <div className="pt-3 border-t border-zinc-100 space-y-2 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-700 text-xs uppercase tracking-wider mb-2">Referencia de precios</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-zinc-200 rounded p-3">
              <p className="font-semibold text-zinc-800">Vercel Hobby</p>
              <p className="text-emerald-700 font-bold text-base mt-0.5">Gratis</p>
              <p className="text-zinc-400 mt-1">100k vistas/mes · 1 proyecto · Sin dominio personalizado en SSL avanzado</p>
            </div>
            <div className="border border-brand-200 bg-brand-50 rounded p-3">
              <p className="font-semibold text-zinc-800">Vercel Pro</p>
              <p className="text-brand-700 font-bold text-base mt-0.5">$20 USD/mes</p>
              <p className="text-zinc-400 mt-1">Tráfico ilimitado · Analytics avanzado · Soporte prioritario</p>
            </div>
          </div>
          <div className="border border-zinc-200 rounded p-3 mt-2">
            <p className="font-semibold text-zinc-800">Dominio propio (.com)</p>
            <p className="text-zinc-600 mt-0.5">$10–$15 USD/año · Se conecta a Vercel en minutos</p>
            <p className="text-zinc-400 mt-1">Recomendado: Namecheap, Cloudflare Registrar (más baratos) o directamente en Vercel</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MetricasPage() {
  const router = useRouter();
  const [data, setData] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/metricas")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .finally(() => setCargando(false));
  }, [router]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando métricas…</p>
      </div>
    );
  }

  if (!data) return null;

  const { resumen, graficos, tablas } = data;

  // Fusionar vistas y descargas en un solo array para el gráfico
  const diasSet = new Set([
    ...graficos.vistasPorDia.map((d) => d.dia),
    ...graficos.descargasPorDia.map((d) => d.dia),
  ]);
  const graficoLinea = Array.from(diasSet).sort().map((dia) => ({
    dia,
    vistas: graficos.vistasPorDia.find((d) => d.dia === dia)?.total ?? 0,
    descargas: graficos.descargasPorDia.find((d) => d.dia === dia)?.total ?? 0,
  }));

  const totalPaises = tablas.vistasPorPais.reduce((s, p) => s + p.total, 0);
  const totalDisp   = tablas.vistasPorDispositivo.reduce((s, d) => s + d.total, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Métricas</h1>
          <p className="text-zinc-400 text-sm mt-1">Últimos 30 días · actualizado en tiempo real</p>
        </div>
        <Link href="/admin" className="btn-secondary text-xs">← Volver al admin</Link>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Metrica
          label="Visitas este mes"
          valor={resumen.vistasEstesMes}
          sub={`${resumen.totalVistas.toLocaleString()} en total`}
          color="brand"
        />
        <Metrica
          label="PDFs descargados"
          valor={resumen.descargasEsteMes}
          sub={`${resumen.totalDescargas.toLocaleString()} en total`}
          color="emerald"
        />
        <Metrica
          label="Artículos publicados"
          valor={resumen.publicacionesPublicadas}
          sub={`${resumen.totalPublicaciones} en total`}
        />
        <Metrica
          label="Comentarios"
          valor={resumen.totalComentarios}
          sub="todos los artículos"
        />
      </div>

      {/* Gráfico de tendencia */}
      <div className="bg-white border border-zinc-200 p-6 mb-6">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-5">
          Visitas y descargas — últimos 30 días
        </h3>
        {graficoLinea.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-zinc-300 text-sm">
            Sin datos aún — los datos aparecerán conforme lleguen visitas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={graficoLinea} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gVistas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2d4270" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2d4270" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDescargas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="dia" tickFormatter={formatDia} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
              <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #e4e4e7", borderRadius: 4 }}
                labelFormatter={(label: unknown) => formatDia(String(label))}
              />
              <Area type="monotone" dataKey="vistas"    name="Visitas"    stroke="#2d4270" fill="url(#gVistas)"    strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="descargas" name="Descargas"  stroke="#059669" fill="url(#gDescargas)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {/* Top artículos */}
        <div className="bg-white border border-zinc-200 p-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Top artículos por visitas
          </h3>
          {tablas.topArticulos.length === 0 ? (
            <p className="text-zinc-300 text-sm">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {tablas.topArticulos.map((a, i) => (
                <div key={a.slug} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-300 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/publicaciones/${a.slug}`}
                      target="_blank"
                      className="text-sm font-medium text-zinc-800 hover:text-brand-700 truncate block"
                    >
                      {a.titulo}
                    </Link>
                    <p className="text-xs text-zinc-400">
                      {a.vistas} visitas · {a.descargas} PDFs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dispositivos */}
        <div className="bg-white border border-zinc-200 p-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Tipo de dispositivo
          </h3>
          {tablas.vistasPorDispositivo.length === 0 ? (
            <p className="text-zinc-300 text-sm">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {tablas.vistasPorDispositivo.map((d) => {
                const p = pct(d.total, totalDisp);
                const iconos: Record<string, string> = { desktop: "🖥", mobile: "📱", tablet: "📲" };
                const nombres: Record<string, string> = { desktop: "Escritorio", mobile: "Móvil", tablet: "Tableta" };
                return (
                  <div key={d.dispositivo}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-600">{iconos[d.dispositivo] ?? "💻"} {nombres[d.dispositivo] ?? d.dispositivo}</span>
                      <span className="text-zinc-400">{d.total} · {p}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600 rounded-full" style={{ width: `${p}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Gráfico de barras de dispositivos */}
          {tablas.vistasPorDispositivo.length > 0 && (
            <div className="mt-5 pt-5 border-t border-zinc-100">
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={tablas.vistasPorDispositivo} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="dispositivo" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
                  <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                    {tablas.vistasPorDispositivo.map((_, i) => (
                      <Cell key={i} fill={["#1e2f52", "#4a5f8a", "#bcc5de"][i % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        {/* Países - visitas */}
        <div className="bg-white border border-zinc-200 p-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Visitantes por país
          </h3>
          {tablas.vistasPorPais.length === 0 ? (
            <p className="text-zinc-300 text-sm">Sin datos aún</p>
          ) : (
            <div className="space-y-2.5">
              {tablas.vistasPorPais.map((p) => {
                const porcentaje = pct(p.total, totalPaises);
                return (
                  <div key={p.pais}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-700">{nombrePais(p.pais)}</span>
                      <span className="text-zinc-400">{p.total} · {porcentaje}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-700 rounded-full" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Países - descargas */}
        <div className="bg-white border border-zinc-200 p-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
            Descargas PDF por país
          </h3>
          {tablas.descargasPorPais.length === 0 ? (
            <p className="text-zinc-300 text-sm">Sin datos aún</p>
          ) : (
            <div className="space-y-2.5">
              {tablas.descargasPorPais.map((p) => {
                const total = tablas.descargasPorPais.reduce((s, x) => s + x.total, 0);
                const porcentaje = pct(p.total, total);
                return (
                  <div key={p.pais}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-700">{nombrePais(p.pais)}</span>
                      <span className="text-zinc-400">{p.total} · {porcentaje}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Indicadores Supabase */}
      <IndicadorSupabase stats={data.supabase} />

      {/* Asesor de costos Vercel */}
      <ConsejoCostos vistas={resumen.vistasEstesMes} />
    </div>
  );
}
