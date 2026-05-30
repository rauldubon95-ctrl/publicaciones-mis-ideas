"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  recurso?: { id: string; titulo: string; descripcion: string; contenido: string; publicado: boolean };
}

export default function RecursoForm({ recurso }: Props) {
  const router = useRouter();
  const esEdicion = !!recurso;
  const fileRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState(recurso?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(recurso?.descripcion ?? "");
  const [contenido, setContenido] = useState(recurso?.contenido ?? "");
  const [publicado, setPublicado] = useState(recurso?.publicado ?? false);
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [error, setError] = useState("");
  const [cargandoHtml, setCargandoHtml] = useState(false);

  function leerComoDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileHtml(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    if (!archivos.length) return;

    const htmlFile = archivos.find((f) => /\.(html|htm)$/i.test(f.name));
    if (!htmlFile) { setError("Selecciona al menos un archivo .html"); return; }
    if (htmlFile.size > 5 * 1024 * 1024) { setError("El archivo HTML no puede superar 5 MB"); return; }

    setCargandoHtml(true);
    setError("");

    let html = await htmlFile.text();

    // Incrustar imágenes como base64 para que funcionen sin servidor
    const imagenes = archivos.filter((f) => /\.(jpg|jpeg|png|gif|svg|webp|ico|bmp)$/i.test(f.name));
    for (const img of imagenes) {
      const dataUrl = await leerComoDataURL(img);
      const nombre = img.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(
        new RegExp(`(src=["'])(?:\\./)?${nombre}(["'])`, "gi"),
        `$1${dataUrl}$2`
      );
    }

    setContenido(html);
    if (!esEdicion && !titulo) setTitulo(htmlFile.name.replace(/\.(html|htm)$/i, "").replace(/[-_]/g, " "));
    setCargandoHtml(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEstado("guardando"); setError("");
    const url = esEdicion ? `/api/admin/recursos/${recurso.id}` : "/api/admin/recursos";
    const method = esEdicion ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descripcion, contenido, publicado }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error al guardar"); setEstado("error"); return; }
    router.push("/admin/recursos"); router.refresh();
  }

  const labelClass = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5">
        <div>
          <label className={labelClass}>Título *</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="input font-serif text-lg" />
        </div>
        <div>
          <label className={labelClass}>Descripción *</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required rows={2} className="input resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass + " mb-0"}>Contenido HTML *</label>
            <div>
              <input ref={fileRef} type="file" accept=".html,.htm,image/*" multiple className="hidden" onChange={handleFileHtml} />
              <button type="button" disabled={cargandoHtml} onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50">
                {cargandoHtml ? "Procesando…" : "Importar .html + imágenes"}
              </button>
            </div>
          </div>
          <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} required rows={16}
            className="input font-mono text-xs resize-y leading-relaxed" placeholder="Pega tu HTML aquí o importa un archivo…" />
          <p className="text-xs text-zinc-400 mt-1">
            Si el HTML tiene imágenes locales, selecciona el archivo .html <strong>y las imágenes juntas</strong> — se incrustan automáticamente.
          </p>
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setPublicado(!publicado)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${publicado ? "bg-brand-700" : "bg-zinc-300"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${publicado ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-zinc-700 font-medium">{publicado ? "Visible al público" : "Guardar como borrador"}</span>
          </label>
        </div>
      </div>

      {error && <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm rounded">{error}</div>}

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
        <button type="submit" disabled={estado === "guardando"} className="btn-primary px-6">
          {estado === "guardando" ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear recurso"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
      </div>
    </form>
  );
}
