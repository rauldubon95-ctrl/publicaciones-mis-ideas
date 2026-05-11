"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";

interface Categoria { id: string; nombre: string }

interface Props {
  categorias: Categoria[];
  publicacion?: {
    id: string;
    titulo: string;
    slug: string;
    resumen: string;
    contenido: string;
    publicado: boolean;
    categoriaId: string | null;
    etiquetas: { etiqueta: { nombre: string } }[];
  };
}

export default function PublicacionForm({ categorias, publicacion }: Props) {
  const router = useRouter();
  const esEdicion = !!publicacion;

  const [titulo, setTitulo] = useState(publicacion?.titulo ?? "");
  const [slug, setSlug] = useState(publicacion?.slug ?? "");
  const [resumen, setResumen] = useState(publicacion?.resumen ?? "");
  const [contenido, setContenido] = useState(publicacion?.contenido ?? "");
  const [publicado, setPublicado] = useState(publicacion?.publicado ?? false);
  const [categoriaId, setCategoriaId] = useState(publicacion?.categoriaId ?? "");
  const [etiquetasText, setEtiquetasText] = useState(
    publicacion?.etiquetas.map((e) => e.etiqueta.nombre).join(", ") ?? ""
  );
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleTituloChange(val: string) {
    setTitulo(val);
    if (!esEdicion) setSlug(toSlug(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("guardando");
    setErrorMsg("");

    const etiquetas = etiquetasText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const url = esEdicion
        ? `/api/admin/publicaciones/${publicacion.id}`
        : "/api/publicaciones";
      const method = esEdicion ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, slug, resumen, contenido, publicado, categoriaId: categoriaId || null, etiquetas }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al guardar");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setEstado("error");
    }
  }

  async function handleEliminar() {
    if (!publicacion || !confirm("¿Eliminar esta publicación?")) return;
    await fetch(`/api/admin/publicaciones/${publicacion.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => handleTituloChange(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resumen *
          </label>
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
            rows={2}
            maxLength={300}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contenido * <span className="text-gray-400 font-normal">(Markdown)</span>
          </label>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            required
            rows={14}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Etiquetas <span className="text-gray-400 font-normal">(separadas por coma)</span>
          </label>
          <input
            type="text"
            value={etiquetasText}
            onChange={(e) => setEtiquetasText(e.target.value)}
            placeholder="tecnología, reflexión, proyectos"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <span className="text-sm font-medium text-gray-700">Publicar ahora</span>
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={estado === "guardando"} className="btn-primary">
          {estado === "guardando" ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear publicación"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancelar
        </button>
        {esEdicion && (
          <button
            type="button"
            onClick={handleEliminar}
            className="ml-auto text-sm text-red-500 hover:text-red-700 hover:underline"
          >
            Eliminar publicación
          </button>
        )}
      </div>
    </form>
  );
}
