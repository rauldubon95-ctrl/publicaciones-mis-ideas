"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFecha } from "@/lib/utils";
import Image from "next/image";

interface Libro {
  id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  paginas: number | null;
  precioCentavos: number | null;
  imagenPortada: string | null;
  creadoAt: string;
  _count: { descargas: number };
}

export default function AdminLibrosPage() {
  const router = useRouter();
  const [libros, setLibros] = useState<Libro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/admin/libros")
      .then((r) => { if (r.status === 401) { router.replace("/admin/login"); return null; } return r.json(); })
      .then((d) => { if (d) setLibros(d); })
      .finally(() => setCargando(false));
  }, [router]);

  async function handleEliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar "${titulo}"? Se borrarán también el PDF y la portada.`)) return;
    await fetch(`/api/admin/libros/${id}`, { method: "DELETE" });
    setLibros((prev) => prev.filter((l) => l.id !== id));
  }

  if (cargando) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-zinc-400 text-sm">Cargando…</p></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Libros</h1>
          <p className="text-zinc-400 text-sm mt-1">{libros.length} libro{libros.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/libros/nueva" className="btn-primary">Nuevo libro</Link>
          <Link href="/admin" className="btn-secondary">← Admin</Link>
        </div>
      </div>

      {libros.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">No hay libros aún.</p>
          <Link href="/admin/libros/nueva" className="btn-primary mt-4 inline-flex">Agregar primero</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {libros.map((l) => (
            <div key={l.id} className="border border-zinc-100 rounded-xl p-4 flex gap-4 items-start group hover:border-zinc-200 transition-colors bg-white">
              {/* Portada miniatura */}
              <div className="shrink-0 w-14 h-20 bg-zinc-100 rounded-sm overflow-hidden flex items-center justify-center">
                {l.imagenPortada ? (
                  <Image src={l.imagenPortada} alt="" width={56} height={80} className="object-cover w-full h-full" />
                ) : (
                  <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`badge text-xs uppercase tracking-wider ${l.publicado ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {l.publicado ? "Publicado" : "Borrador"}
                  </span>
                  {l.precioCentavos != null && l.precioCentavos > 0 && (
                    <span className="badge bg-zinc-100 text-zinc-500 text-xs">${(l.precioCentavos / 100).toFixed(2)} USD</span>
                  )}
                  {l.paginas && <span className="text-xs text-zinc-400">{l.paginas} págs.</span>}
                  <span className="text-xs text-zinc-400">{l._count.descargas} descargas</span>
                </div>
                <h2 className="font-serif font-semibold text-zinc-900 truncate">{l.titulo}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{formatFecha(l.creadoAt)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin/libros/editar/${l.id}`} className="btn-secondary py-1.5 text-xs">Editar</Link>
                <Link href={`/libros/${l.slug}`} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-700 px-2">Ver</Link>
                <button onClick={() => handleEliminar(l.id, l.titulo)} className="text-xs text-red-400 hover:text-red-600 px-2">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
