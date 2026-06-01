"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toSlug } from "@/lib/utils";
import Image from "next/image";

interface Props {
  libro?: {
    id: string;
    titulo: string;
    slug: string;
    descripcion: string;
    paginas: number | null;
    precioCentavos: number | null;
    urlPdf: string;
    imagenPortada: string | null;
    publicado: boolean;
  };
}

export default function LibroForm({ libro }: Props) {
  const router = useRouter();
  const esEdicion = !!libro;

  const [titulo, setTitulo]             = useState(libro?.titulo ?? "");
  const [descripcion, setDescripcion]   = useState(libro?.descripcion ?? "");
  const [paginas, setPaginas]           = useState(libro?.paginas?.toString() ?? "");
  const [precioStr, setPrecioStr]       = useState(
    libro?.precioCentavos != null ? (libro.precioCentavos / 100).toFixed(2) : ""
  );
  const [urlPdf, setUrlPdf]             = useState(libro?.urlPdf ?? "");
  const [nombrePdf, setNombrePdf]       = useState(libro?.urlPdf ? "PDF cargado" : "");
  const [portada, setPortada]           = useState(libro?.imagenPortada ?? "");
  const [publicado, setPublicado]       = useState(libro?.publicado ?? false);

  const [subiendoPdf, setSubiendoPdf]   = useState(false);
  const [subiendoImg, setSubiendoImg]   = useState(false);
  const [guardando, setGuardando]       = useState(false);
  const [error, setError]               = useState("");

  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(
    file: File,
    tipo: "pdf" | "portada",
    setSub: (v: boolean) => void,
    onOk: (url: string, nombre: string) => void
  ) {
    setSub(true);
    setError("");
    const form = new FormData();
    form.append("tipo", tipo);
    form.append("archivo", file);
    try {
      const res = await fetch("/api/admin/libros/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Error al subir");
      onOk(data.url, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir archivo");
    } finally {
      setSub(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlPdf) { setError("Sube el PDF del libro antes de guardar."); return; }
    setGuardando(true);
    setError("");

    const precioParsed = parseFloat(precioStr.replace(",", "."));
    const precioCentavos = !isNaN(precioParsed) && precioParsed >= 0
      ? Math.round(precioParsed * 100) : null;

    const url    = esEdicion ? `/api/admin/libros/${libro.id}` : "/api/admin/libros";
    const method = esEdicion ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo, descripcion, urlPdf,
          imagenPortada: portada || null,
          paginas:       paginas ? parseInt(paginas) : null,
          precioCentavos,
          publicado,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      router.push("/admin/libros");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setGuardando(false);
    }
  }

  const labelClass = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      {/* Portada y PDF */}
      <div className="grid sm:grid-cols-2 gap-5">

        {/* Portada */}
        <div>
          <label className={labelClass}>Imagen de portada</label>
          <div
            onClick={() => imgRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-zinc-200 hover:border-brand-400 rounded-xl overflow-hidden transition-colors bg-zinc-50 flex flex-col items-center justify-center"
            style={{ minHeight: 200 }}
          >
            {portada ? (
              <div className="relative w-full" style={{ height: 200 }}>
                <Image src={portada} alt="Portada" fill className="object-contain" />
              </div>
            ) : (
              <div className="py-10 text-center px-4">
                {subiendoImg ? (
                  <span className="text-sm text-zinc-400 animate-pulse">Subiendo imagen…</span>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-zinc-400">Haz clic para subir portada</p>
                    <p className="text-xs text-zinc-300 mt-1">JPG, PNG, WebP · máx. 5 MB</p>
                  </>
                )}
              </div>
            )}
          </div>
          {portada && (
            <button type="button" onClick={() => setPortada("")}
              className="mt-2 text-xs text-red-400 hover:text-red-600">
              Quitar portada
            </button>
          )}
          <input ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              subirArchivo(f, "portada", setSubiendoImg, (url) => setPortada(url));
              e.target.value = "";
            }} />
        </div>

        {/* PDF */}
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Archivo PDF *</label>
            <div
              onClick={() => pdfRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                urlPdf ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-zinc-50 hover:border-brand-400"
              }`}
            >
              {subiendoPdf ? (
                <p className="text-sm text-zinc-400 animate-pulse">Subiendo PDF…</p>
              ) : urlPdf ? (
                <div>
                  <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-medium text-emerald-700">{nombrePdf || "PDF cargado"}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Haz clic para reemplazar</p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-zinc-400">Haz clic para subir el PDF</p>
                  <p className="text-xs text-zinc-300 mt-1">máx. 50 MB</p>
                </div>
              )}
            </div>
            <input ref={pdfRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                subirArchivo(f, "pdf", setSubiendoPdf, (url, nombre) => {
                  setUrlPdf(url);
                  setNombrePdf(nombre);
                });
                e.target.value = "";
              }} />
          </div>
        </div>
      </div>

      {/* Metadatos */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Título *</label>
          <input
            type="text" value={titulo} required maxLength={200}
            onChange={(e) => setTitulo(e.target.value)}
            className="input font-serif text-lg"
            placeholder="Título del libro"
          />
          {titulo && (
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              /libros/<span className="text-zinc-600">{toSlug(titulo)}</span>
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción *</label>
          <textarea
            value={descripcion} required rows={4} maxLength={2000}
            onChange={(e) => setDescripcion(e.target.value)}
            className="input resize-none"
            placeholder="Sobre qué trata el libro, para quién está dirigido…"
          />
          <p className="text-xs text-zinc-400 mt-1">{descripcion.length}/2000</p>
        </div>

        <div>
          <label className={labelClass}>Número de páginas</label>
          <input
            type="number" value={paginas} min={1} max={9999}
            onChange={(e) => setPaginas(e.target.value)}
            className="input" placeholder="ej. 245"
          />
        </div>

        <div>
          <label className={labelClass}>Precio (USD)</label>
          <div className="flex items-center border border-zinc-200 rounded-lg px-3 py-2 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <span className="text-zinc-400 mr-1 text-sm">$</span>
            <input
              type="number" min="0" max="9999" step="0.01"
              value={precioStr}
              onChange={(e) => setPrecioStr(e.target.value)}
              placeholder="0.00 = gratis"
              className="flex-1 outline-none text-sm text-zinc-800 placeholder:text-zinc-300 bg-transparent"
            />
            <span className="text-zinc-400 text-xs ml-1">USD</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Déjalo vacío para no mostrar precio.</p>
        </div>

        <div className="sm:col-span-2 flex items-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setPublicado(!publicado)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${publicado ? "bg-brand-700" : "bg-zinc-300"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${publicado ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-zinc-700 font-medium">
              {publicado ? "Visible al público" : "Guardar como borrador"}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={guardando || subiendoPdf || subiendoImg}
          className="btn-primary disabled:opacity-50">
          {guardando ? "Guardando…" : esEdicion ? "Guardar cambios" : "Publicar libro"}
        </button>
        <button type="button" onClick={() => router.push("/admin/libros")}
          className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}
