"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Pagina { id: string; imageUrl: string; orden: number; caption: string | null }
interface Comic  { id: string; titulo: string; descripcion: string; publicado: boolean }

export default function EditarComicPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [comic, setComic] = useState<Comic | null>(null);
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [cargando, setCargando] = useState(true);

  // Edición del cómic
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Upload de imagen
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [errorUpload, setErrorUpload] = useState("");

  const labelClass = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/comics`).then((r) => r.json()),
      fetch(`/api/admin/comics/${id}/paginas`).then((r) => r.json()),
    ]).then(([todos, pags]) => {
      const c = (todos as Comic[]).find((x) => x.id === id);
      if (!c) { router.replace("/admin/comics"); return; }
      setComic(c); setTitulo(c.titulo); setDescripcion(c.descripcion); setPublicado(c.publicado);
      setPaginas(pags);
    }).finally(() => setCargando(false));
  }, [id, router]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/admin/comics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descripcion, publicado }),
    });
    setGuardando(false);
    setComic((prev) => prev ? { ...prev, titulo, descripcion, publicado } : prev);
  }

  async function handleSubirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true); setErrorUpload("");
    const form = new FormData();
    form.append("imagen", file);
    form.append("caption", caption);
    const res = await fetch(`/api/admin/comics/${id}/paginas`, { method: "POST", body: form });
    if (!res.ok) {
      const d = await res.json(); setErrorUpload(d.error ?? "Error al subir"); setSubiendo(false);
      if (fileRef.current) fileRef.current.value = ""; return;
    }
    const nueva = await res.json();
    setPaginas((prev) => [...prev, nueva]);
    setCaption("");
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleEliminarPagina(paginaId: string) {
    if (!confirm("¿Eliminar esta página?")) return;
    await fetch(`/api/admin/comics/${id}/paginas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paginaId }),
    });
    setPaginas((prev) => prev.filter((p) => p.id !== paginaId).map((p, i) => ({ ...p, orden: i + 1 })));
  }

  if (cargando) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-zinc-400 text-sm">Cargando…</p></div>;
  if (!comic) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <nav className="text-xs text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/comics" className="hover:text-zinc-600">Cómics</Link>
        <span>/</span>
        <span className="text-zinc-600">Editar</span>
      </nav>

      {/* Datos del cómic */}
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-serif font-semibold text-zinc-900 mb-5">Información del cómic</h2>
        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="input font-serif" />
          </div>
          <div>
            <label className={labelClass}>Descripción *</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required rows={2} className="input resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => setPublicado(!publicado)}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${publicado ? "bg-brand-700" : "bg-zinc-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${publicado ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-zinc-700">{publicado ? "Visible al público" : "Borrador"}</span>
            </label>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      {/* Subir nueva página */}
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-serif font-semibold text-zinc-900 mb-5">Añadir página</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Pie de imagen (opcional)</label>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300}
              className="input" placeholder="Texto educativo o descripción de la imagen" />
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleSubirImagen} />
            <button type="button" disabled={subiendo} onClick={() => fileRef.current?.click()}
              className="btn-primary w-full justify-center py-3">
              {subiendo ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Subiendo imagen…</>
              ) : "Seleccionar y subir imagen"}
            </button>
            {errorUpload && <p className="text-red-600 text-sm mt-2 border border-red-100 bg-red-50 px-3 py-2 rounded">{errorUpload}</p>}
            <p className="text-xs text-zinc-400 mt-1.5">JPEG, PNG, WebP o GIF · máx. 4 MB por imagen</p>
          </div>
        </div>
      </section>

      {/* Páginas actuales */}
      <section>
        <h2 className="text-lg font-serif font-semibold text-zinc-900 mb-5">
          Páginas <span className="text-zinc-400 font-sans font-normal text-sm">({paginas.length})</span>
        </h2>
        {paginas.length === 0 ? (
          <div className="text-center py-12 text-zinc-300 border border-dashed border-zinc-200 text-sm">
            No hay páginas. Sube la primera imagen arriba.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {paginas.map((p) => (
              <div key={p.id} className="border border-zinc-200 bg-white overflow-hidden group">
                <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt={p.caption ?? `Página ${p.orden}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button onClick={() => handleEliminarPagina(p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white text-xs px-3 py-1.5 rounded font-medium">
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <span className="text-xs font-mono text-zinc-400">#{p.orden}</span>
                  {p.caption && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{p.caption}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
