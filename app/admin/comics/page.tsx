"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFecha } from "@/lib/utils";

interface Comic { id: string; titulo: string; slug: string; publicado: boolean; creadoAt: string; _count: { paginas: number } }

export default function AdminComicsPage() {
  const router = useRouter();
  const [comics, setComics] = useState<Comic[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/comics")
      .then((r) => { if (r.status === 401) { router.replace("/admin/login"); return null; } return r.json(); })
      .then((d) => { if (d) setComics(d); })
      .finally(() => setCargando(false));
  }, [router]);

  async function handleEliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar "${titulo}" y todas sus imágenes?`)) return;
    await fetch(`/api/admin/comics/${id}`, { method: "DELETE" });
    setComics((prev) => prev.filter((c) => c.id !== id));
  }

  if (cargando) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-zinc-400 text-sm">Cargando…</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Cómics</h1>
          <p className="text-zinc-400 text-sm mt-1">{comics.length} cómic{comics.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/comics/nueva" className="btn-primary">Nuevo cómic</Link>
          <Link href="/admin" className="btn-secondary">← Admin</Link>
        </div>
      </div>

      {comics.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200">
          <p className="text-sm">No hay cómics aún.</p>
          <Link href="/admin/comics/nueva" className="btn-primary mt-4 inline-flex">Crear primero</Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {comics.map((c) => (
            <div key={c.id} className="py-4 flex items-center gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-xs uppercase tracking-wider ${c.publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {c.publicado ? "Publicado" : "Borrador"}
                  </span>
                  <span className="badge bg-zinc-100 text-zinc-500 text-xs">{c._count.paginas} páginas</span>
                </div>
                <h2 className="font-serif font-semibold text-zinc-900 truncate">{c.titulo}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{formatFecha(c.creadoAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin/comics/editar/${c.id}`} className="btn-secondary py-1.5 text-xs">Editar / Páginas</Link>
                <Link href={`/comics/${c.slug}`} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-700 px-2">Ver</Link>
                <button onClick={() => handleEliminar(c.id, c.titulo)} className="text-xs text-red-400 hover:text-red-600 px-2">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
