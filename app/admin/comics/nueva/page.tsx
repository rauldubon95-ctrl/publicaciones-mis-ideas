"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NuevoComicPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [error, setError] = useState("");

  const labelClass = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("guardando"); setError("");
    const res = await fetch("/api/admin/comics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descripcion, publicado }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); setEstado("error"); return; }
    const comic = await res.json();
    router.push(`/admin/comics/editar/${comic.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-xs text-zinc-400 mb-6 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/comics" className="hover:text-zinc-600">Cómics</Link>
        <span>/</span>
        <span className="text-zinc-600">Nuevo</span>
      </nav>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-2">Nuevo cómic</h1>
      <p className="text-zinc-400 text-sm mb-8">Crea primero el cómic, luego subes las páginas (imágenes).</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Título *</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="input font-serif text-lg" />
        </div>
        <div>
          <label className={labelClass}>Descripción *</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required rows={3} className="input resize-none" />
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setPublicado(!publicado)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${publicado ? "bg-brand-700" : "bg-zinc-300"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${publicado ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-zinc-700 font-medium">{publicado ? "Visible al público" : "Guardar como borrador"}</span>
          </label>
        </div>

        {error && <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm rounded-sm">{error}</div>}

        <div className="flex gap-3 pt-4 border-t border-zinc-100">
          <button type="submit" disabled={estado === "guardando"} className="btn-primary px-6">
            {estado === "guardando" ? "Creando…" : "Crear y añadir páginas →"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
