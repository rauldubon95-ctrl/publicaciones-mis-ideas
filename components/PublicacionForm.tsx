"use client";
import { useState, useRef } from "react";
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
    esPremium?: boolean;
    precioCentavos?: number | null;
    resumenPublico?: string | null;
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
  const [esPremium, setEsPremium] = useState(publicacion?.esPremium ?? false);
  const [precioStr, setPrecioStr] = useState(
    publicacion?.precioCentavos != null
      ? (publicacion.precioCentavos / 100).toFixed(2)
      : ""
  );
  const [resumenPublico, setResumenPublico] = useState(
    publicacion?.resumenPublico ?? ""
  );
  const [estado, setEstado] = useState<"idle" | "guardando" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [notificando, setNotificando] = useState(false);
  const [resultadoNotif, setResultadoNotif] = useState<string | null>(null);
  const [subiendoWord, setSubiendoWord] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleWordUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoWord(true);
    setErrorMsg("");
    try {
      const form = new FormData();
      form.append("archivo", file);
      const res = await fetch("/api/admin/upload-docx", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error al procesar el archivo");
      }
      const data = await res.json();
      setContenido(data.contenido);
      if (!esEdicion && !titulo) {
        setTitulo(data.titulo);
        setSlug(toSlug(data.titulo));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al procesar el Word");
    } finally {
      setSubiendoWord(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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

      const precioParsed = parseFloat(precioStr.replace(",", "."));
      const precioCentavos =
        esPremium && !isNaN(precioParsed) && precioParsed > 0
          ? Math.round(precioParsed * 100)
          : null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          slug,
          resumen,
          contenido,
          publicado,
          categoriaId: categoriaId || null,
          etiquetas,
          esPremium,
          precioCentavos,
          resumenPublico: esPremium ? resumenPublico.trim() || null : null,
        }),
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

  async function handleNotificar() {
    if (!publicacion) return;
    if (!confirm("¿Enviar esta publicación a todos los suscriptores activos?")) return;
    setNotificando(true);
    setResultadoNotif(null);
    try {
      const res = await fetch("/api/admin/suscriptores/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicacionId: publicacion.id }),
      });
      const data = await res.json() as { enviados?: number; fallidos?: number; error?: string };
      if (!res.ok) {
        setResultadoNotif(`Error: ${data.error ?? "No se pudo enviar."}`);
      } else {
        setResultadoNotif(`✓ ${data.enviados ?? 0} correos enviados${data.fallidos ? ` · ${data.fallidos} fallidos` : ""}`);
      }
    } catch {
      setResultadoNotif("Error de conexión.");
    } finally {
      setNotificando(false);
    }
  }

  async function handleEliminar() {
    if (!publicacion || !confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/admin/publicaciones/${publicacion.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  const labelClass = "block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Título *</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => handleTituloChange(e.target.value)}
            required
            className="input font-serif text-lg"
            placeholder="Título de la publicación"
          />
        </div>

        <div>
          <label className={labelClass}>Slug (URL)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={(e) => setSlug(toSlug(e.target.value))}
            required
            className="input font-mono text-xs"
          />
        </div>

        <div>
          <label className={labelClass}>Categoría</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="input"
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Resumen *</label>
          <textarea
            value={resumen}
            onChange={(e) => setResumen(e.target.value)}
            required
            rows={2}
            maxLength={300}
            className="input resize-none"
            placeholder="Breve descripción visible en listados (máx. 300 caracteres)"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass + " mb-0"}>
              Contenido * <span className="text-zinc-300 normal-case tracking-normal font-normal">— Markdown</span>
            </label>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.md"
                className="hidden"
                onChange={handleWordUpload}
              />
              <button
                type="button"
                disabled={subiendoWord}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {subiendoWord ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border border-brand-400 border-t-transparent rounded-full" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Importar .docx o .md
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            required
            rows={18}
            className="input font-mono text-xs resize-y leading-relaxed"
            placeholder="Escribe el contenido en Markdown..."
          />
        </div>

        <div>
          <label className={labelClass}>
            Etiquetas <span className="text-zinc-300 normal-case tracking-normal font-normal">— separadas por coma</span>
          </label>
          <input
            type="text"
            value={etiquetasText}
            onChange={(e) => setEtiquetasText(e.target.value)}
            placeholder="tecnología, reflexión, proyectos"
            className="input"
          />
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setPublicado(!publicado)}
              className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${
                publicado ? "bg-brand-700" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  publicado ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-zinc-700 font-medium">
              {publicado ? "Visible al público" : "Guardar como borrador"}
            </span>
          </label>
        </div>
      </div>

      {/* ─── Monetización: artículo premium ──────────────────────────── */}
      <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setEsPremium(!esPremium)}
            className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${
              esPremium ? "bg-amber-600" : "bg-zinc-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                esPremium ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </div>
          <div>
            <span className="text-sm text-zinc-800 font-medium">
              Artículo de pago (premium)
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Los visitantes verán el resumen público y un botón para comprar
              acceso vía PayPal. Tras pagar, reciben un enlace mágico por correo.
            </p>
          </div>
        </label>

        {esPremium && (
          <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-amber-200">
            <div>
              <label className={labelClass}>Precio (USD)</label>
              <div className="flex items-center border border-zinc-200 rounded-lg px-3 py-2 bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <span className="text-zinc-400 mr-1 text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={precioStr}
                  onChange={(e) => setPrecioStr(e.target.value)}
                  placeholder="5.00"
                  className="flex-1 outline-none text-sm text-zinc-800 placeholder:text-zinc-300 bg-transparent"
                />
                <span className="text-zinc-400 text-xs ml-1">USD</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Mínimo $1.00.</p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Resumen público{" "}
                <span className="text-zinc-300 normal-case tracking-normal font-normal">
                  — lo que se muestra antes del muro de pago
                </span>
              </label>
              <textarea
                value={resumenPublico}
                onChange={(e) => setResumenPublico(e.target.value)}
                rows={3}
                maxLength={1500}
                className="input resize-none text-sm"
                placeholder="Si lo dejas vacío, se mostrarán las primeras 800 letras del contenido."
              />
            </div>
          </div>
        )}
      </div>

      {/* Notificar suscriptores — solo en edición de artículo publicado */}
      {esEdicion && publicacion.publicado && (
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-800">Notificar suscriptores</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Envía esta publicación por correo a todos los suscriptores activos.
            </p>
            {resultadoNotif && (
              <p className={`text-xs mt-1 font-medium ${resultadoNotif.startsWith("✓") ? "text-emerald-700" : "text-red-600"}`}>
                {resultadoNotif}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleNotificar}
            disabled={notificando}
            className="btn-secondary shrink-0 disabled:opacity-50 text-sm"
          >
            {notificando ? "Enviando…" : "Enviar correo"}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm rounded">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
        <button type="submit" disabled={estado === "guardando"} className="btn-primary px-6">
          {estado === "guardando" ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear publicación"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
        {esEdicion && (
          <button
            type="button"
            onClick={handleEliminar}
            className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors underline underline-offset-2"
          >
            Eliminar publicación
          </button>
        )}
      </div>
    </form>
  );
}
