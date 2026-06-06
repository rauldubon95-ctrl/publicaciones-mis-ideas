"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatFecha } from "@/lib/utils";

interface Publicacion {
  id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  creadoAt: string;
  categoria: { nombre: string } | null;
  _count: { comentarios: number; reacciones: number };
}

const SECCIONES = [
  {
    href: "/admin/nueva",
    label: "Nueva publicación",
    desc: "Redactar y publicar un artículo",
    primary: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: "/admin/recursos",
    label: "Recursos",
    desc: "PDFs, HTMLs y materiales descargables",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/libros",
    label: "Libros",
    desc: "Subir y gestionar libros en PDF",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/admin/comics",
    label: "Cómics",
    desc: "Gestionar tiras cómicas e ilustraciones",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/tableros",
    label: "Dashboards",
    desc: "Subir y publicar plantillas Excel",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z" />
      </svg>
    ),
  },
  {
    href: "/admin/servicios",
    label: "Servicios",
    desc: "Consultoría: crear y editar servicios",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/cotizaciones",
    label: "Cotizaciones",
    desc: "Solicitudes recibidas de clientes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: "/admin/metricas",
    label: "Métricas",
    desc: "Vistas, descargas y reacciones del sitio",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/admin/observabilidad",
    label: "IA Observabilidad",
    desc: "Telemetría del asistente de IA",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      </svg>
    ),
  },
  {
    href: "/admin/seguridad",
    label: "Seguridad",
    desc: "Eventos y alertas de seguridad",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: "/admin/suscriptores",
    label: "Suscriptores",
    desc: "Lista de correo y analítica de envíos",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/donaciones",
    label: "Donaciones",
    desc: "Historial de donaciones recibidas vía PayPal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    href: "/admin/ventas-libros",
    label: "Ventas de libros",
    desc: "Historial de compras de libros vía PayPal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/admin/compras",
    label: "Compras de contenido",
    desc: "Pedidos de acceso a artículos premium",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    href: "/admin/ventas-recursos",
    label: "Ventas de recursos",
    desc: "Historial de compras de recursos HTML vía PayPal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    href: "/admin/ventas-dashboards",
    label: "Ventas de tableros",
    desc: "Historial de compras de tableros Excel vía PayPal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

const PAGE_SIZE = 20;

export default function AdminPage() {
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<string | null>(null);
  const [totalDonado, setTotalDonado] = useState<number>(0);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setCargando(true);
    fetch(`/api/admin/publicaciones?page=${page}&pageSize=${PAGE_SIZE}`)
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setPublicaciones(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .finally(() => setCargando(false));
  }, [router, page]);

  useEffect(() => {
    fetch("/api/admin/donaciones")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totalRecaudado: number } | null) => {
        if (d) setTotalDonado(d.totalRecaudado);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  async function handleSyncD1() {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await fetch("/api/admin/sync-d1-all", { method: "POST" });
      const data = await res.json() as { total: number; exitosos: number; fallidos: number };
      setResultadoSync(`✓ ${data.exitosos} de ${data.total} artículos sincronizados al asistente IA`);
    } catch {
      setResultadoSync("Error al sincronizar. Intenta de nuevo.");
    } finally {
      setSincronizando(false);
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
      <div className="flex items-center justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Administración</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {total === 0
              ? "Sin publicaciones"
              : `${total} publicación${total !== 1 ? "es" : ""}`}
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-sm">
          Salir
        </button>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {SECCIONES.map(({ href, label, desc, primary, icon }) => (
          <Link
            key={href}
            href={href}
            className={`group flex flex-col gap-3 rounded-xl border p-4 transition-all ${
              primary
                ? "border-brand-300 bg-brand-50 hover:border-brand-500 hover:bg-brand-100"
                : "border-zinc-200 bg-white hover:border-brand-300 hover:shadow-xs"
            }`}
          >
            <span className={`w-9 h-9 flex items-center justify-center rounded-lg ${
              primary ? "bg-brand-700 text-white" : "bg-zinc-100 text-zinc-600 group-hover:bg-brand-100 group-hover:text-brand-700"
            } transition-colors`}>
              {icon}
            </span>
            <div>
              <p className={`text-sm font-semibold leading-tight ${primary ? "text-brand-800" : "text-zinc-800"}`}>
                {label}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Stat de donaciones */}
      {totalDonado > 0 && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">${(totalDonado / 100).toFixed(2)} USD</span>
            {" "}recaudados en donaciones completadas
          </p>
          <a href="/admin/donaciones" className="text-xs text-amber-700 hover:underline shrink-0">
            Ver historial →
          </a>
        </div>
      )}

      {/* Sync IA */}
      <div className="mb-10 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-800">Asistente IA — sincronización</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Envía todos los artículos publicados al asistente para que pueda responder sobre ellos.
          </p>
          {resultadoSync && (
            <p className="text-xs mt-1 text-emerald-700 font-medium">{resultadoSync}</p>
          )}
        </div>
        <button
          onClick={handleSyncD1}
          disabled={sincronizando}
          className="btn-secondary shrink-0 disabled:opacity-50"
        >
          {sincronizando ? "Sincronizando…" : "Sincronizar artículos"}
        </button>
      </div>

      {/* Lista de publicaciones */}
      <div className="border-t border-zinc-100 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
          Publicaciones recientes
        </h2>
        {total === 0 ? (
          <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
            <p className="text-sm">No hay publicaciones aún.</p>
            <Link href="/admin/nueva" className="btn-primary mt-5 inline-flex">
              Crear primera publicación
            </Link>
          </div>
        ) : (
          <>
          <div className="divide-y divide-zinc-100">
            {publicaciones.map((p) => (
              <div key={p.id} className="py-4 flex items-center gap-4 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-xs uppercase tracking-wider ${
                      p.publicado
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {p.publicado ? "Publicado" : "Borrador"}
                    </span>
                    {p.categoria && (
                      <span className="badge bg-brand-50 text-brand-600 uppercase tracking-wider text-xs">
                        {p.categoria.nombre}
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif font-semibold text-zinc-900 truncate text-base leading-snug">
                    {p.titulo}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatFecha(p.creadoAt)}
                    {" · "}
                    {p._count.comentarios} comentarios
                    {" · "}
                    {p._count.reacciones} reacciones
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Link href={`/admin/editar/${p.id}`} className="btn-secondary py-1.5">
                    Editar
                  </Link>
                  <Link
                    href={`/publicaciones/${p.slug}`}
                    target="_blank"
                    className="text-xs text-zinc-400 hover:text-zinc-700 px-2 transition-colors"
                  >
                    Ver
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-zinc-400">
                Página {page} de {totalPaginas}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                disabled={page >= totalPaginas}
                className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
