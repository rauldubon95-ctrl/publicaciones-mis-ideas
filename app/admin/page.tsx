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

export default function AdminPage() {
  const router = useRouter();
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/publicaciones")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setPublicaciones(data); })
      .finally(() => setCargando(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
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
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Administración</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {publicaciones.length === 0
              ? "Sin publicaciones"
              : `${publicaciones.length} publicación${publicaciones.length !== 1 ? "es" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/nueva" className="btn-primary">
            Nueva publicación
          </Link>
          <Link href="/admin/recursos" className="btn-secondary">
            Recursos
          </Link>
          <Link href="/admin/comics" className="btn-secondary">
            Cómics
          </Link>
          <Link href="/admin/metricas" className="btn-secondary">
            Métricas
          </Link>
          <Link href="/admin/seguridad" className="btn-secondary">
            Seguridad
          </Link>
          <button onClick={handleLogout} className="btn-secondary">
            Salir
          </button>
        </div>
      </div>

      {/* Lista */}
      {publicaciones.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200">
          <p className="text-sm">No hay publicaciones aún.</p>
          <Link href="/admin/nueva" className="btn-primary mt-5 inline-flex">
            Crear primera publicación
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
