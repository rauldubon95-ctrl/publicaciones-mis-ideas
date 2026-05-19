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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Admin</h1>
          <p className="text-gray-500 mt-1">{publicaciones.length} publicaciones</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/nueva" className="btn-primary">
            + Nueva publicación
          </Link>
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Salir
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {publicaciones.map((p) => (
          <div key={p.id} className="card p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${
                  p.publicado ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {p.publicado ? "Publicado" : "Borrador"}
                </span>
                {p.categoria && (
                  <span className="badge bg-brand-50 text-brand-700">{p.categoria.nombre}</span>
                )}
              </div>
              <h2 className="font-semibold text-gray-900 truncate">{p.titulo}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatFecha(p.creadoAt)} · 💬 {p._count.comentarios} · ❤️ {p._count.reacciones}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/admin/editar/${p.id}`} className="btn-secondary text-sm py-1.5">
                Editar
              </Link>
              <Link
                href={`/publicaciones/${p.slug}`}
                target="_blank"
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Ver →
              </Link>
            </div>
          </div>
        ))}

        {publicaciones.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">✍️</p>
            <p>No hay publicaciones aún.</p>
            <Link href="/admin/nueva" className="btn-primary mt-4 inline-flex">
              Crear primera publicación
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
