"use client";
import { useState, useCallback } from "react";
import type { ComentarioArbol } from "@/app/api/comentarios/route";

// ── Utilidad de tiempo relativo ──────────────────────────────────────
function tiempoRelativo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)} días`;
  return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

// ── Mini-formulario de respuesta ─────────────────────────────────────
function FormRespuesta({
  publicacionId,
  parentId,
  onEnviado,
  onCancelar,
}: {
  publicacionId: string;
  parentId: string;
  onEnviado: (nuevo: ComentarioArbol) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !texto.trim()) return;
    setEstado("enviando");
    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicacionId,
          parentId,
          autorNombre: nombre.trim(),
          contenido: texto.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      onEnviado(data as ComentarioArbol);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al enviar");
      setEstado("error");
    }
  }

  return (
    <form onSubmit={enviar} className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <input
        type="text"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={80}
        required
        className="w-full border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 rounded"
      />
      <textarea
        placeholder="Escribe tu respuesta…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={1000}
        required
        rows={3}
        className="w-full border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 rounded resize-none"
      />
      {estado === "error" && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="text-xs bg-brand-700 text-white px-3 py-1.5 rounded hover:bg-brand-800 transition-colors disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando…" : "Responder"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1.5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Nodo de un comentario (recursivo) ────────────────────────────────
function NodoComentario({
  comentario,
  publicacionId,
  esAdmin,
  profundidadMax,
  onEliminar,
  onOcultar,
}: {
  comentario: ComentarioArbol;
  publicacionId: string;
  esAdmin: boolean;
  profundidadMax: number;
  onEliminar?: (id: string) => void;
  onOcultar?: (id: string) => void;
}) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [expandido, setExpandido] = useState(true);
  const [respuestas, setRespuestas] = useState<ComentarioArbol[]>(comentario.respuestas);
  const [respondiendoAdmin, setRespondiendoAdmin] = useState(false);
  const [textoAdmin, setTextoAdmin] = useState("");
  const [enviandoAdmin, setEnviandoAdmin] = useState(false);

  const agregarRespuesta = useCallback((nueva: ComentarioArbol) => {
    setRespuestas((prev) => [...prev, nueva]);
    setRespondiendo(false);
    setRespondiendoAdmin(false);
  }, []);

  async function enviarAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!textoAdmin.trim()) return;
    setEnviandoAdmin(true);
    try {
      const res = await fetch("/api/admin/comentarios/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicacionId,
          parentId: comentario.id,
          contenido: textoAdmin.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const data: ComentarioArbol = await res.json();
      agregarRespuesta(data);
      setTextoAdmin("");
    } finally {
      setEnviandoAdmin(false);
    }
  }

  async function moderarEstado(estado: string) {
    await fetch(`/api/admin/comentarios/${comentario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    onOcultar?.(comentario.id);
  }

  async function eliminarComentario() {
    if (!confirm("¿Eliminar este comentario y todas sus respuestas?")) return;
    await fetch(`/api/admin/comentarios/${comentario.id}`, { method: "DELETE" });
    onEliminar?.(comentario.id);
  }

  const esRaiz = comentario.profundidad === 0;
  const puedeResponder = comentario.profundidad < profundidadMax;
  const tieneRespuestas = respuestas.length > 0;

  return (
    <div className={`group ${esRaiz ? "" : "mt-3"}`}>
      {/* Tarjeta del comentario */}
      <div
        className={`relative rounded-lg p-4 transition-colors ${
          comentario.esAdmin
            ? "bg-brand-50 border border-brand-200"
            : "bg-zinc-50 border border-zinc-100"
        }`}
      >
        {/* Insignia admin */}
        {comentario.esAdmin && (
          <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 bg-brand-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Autor
          </span>
        )}

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Avatar inicial */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold uppercase ${
                comentario.esAdmin
                  ? "bg-brand-700 text-white"
                  : "bg-zinc-200 text-zinc-600"
              }`}
            >
              {comentario.autorNombre.charAt(0)}
            </div>
            <span className={`text-sm font-semibold ${comentario.esAdmin ? "text-brand-800" : "text-zinc-800"}`}>
              {comentario.autorNombre}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">{tiempoRelativo(comentario.creadoAt)}</span>
        </div>

        {/* Contenido */}
        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
          {comentario.contenido}
        </p>

        {/* Acciones */}
        <div className="flex items-center gap-3 mt-3">
          {puedeResponder && (
            <button
              onClick={() => { setRespondiendo(!respondiendo); setRespondiendoAdmin(false); }}
              className="text-xs text-zinc-400 hover:text-brand-700 transition-colors font-medium"
            >
              Responder
            </button>
          )}
          {tieneRespuestas && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {expandido ? `▾ Ocultar ${respuestas.length} respuesta${respuestas.length > 1 ? "s" : ""}` : `▸ Ver ${respuestas.length} respuesta${respuestas.length > 1 ? "s" : ""}`}
            </button>
          )}
          {/* Controles admin */}
          {esAdmin && (
            <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {puedeResponder && (
                <button
                  onClick={() => { setRespondiendoAdmin(!respondiendoAdmin); setRespondiendo(false); }}
                  className="text-[11px] bg-brand-700 text-white px-2 py-0.5 rounded hover:bg-brand-800 transition-colors"
                >
                  Responder como autor
                </button>
              )}
              <button
                onClick={() => moderarEstado("OCULTO")}
                className="text-[11px] text-zinc-400 hover:text-amber-600 transition-colors"
              >
                Ocultar
              </button>
              <button
                onClick={eliminarComentario}
                className="text-[11px] text-zinc-400 hover:text-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Formulario respuesta pública */}
        {respondiendo && (
          <FormRespuesta
            publicacionId={publicacionId}
            parentId={comentario.id}
            onEnviado={agregarRespuesta}
            onCancelar={() => setRespondiendo(false)}
          />
        )}

        {/* Formulario respuesta admin */}
        {respondiendoAdmin && esAdmin && (
          <form onSubmit={enviarAdmin} className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <textarea
              placeholder="Respuesta como autor…"
              value={textoAdmin}
              onChange={(e) => setTextoAdmin(e.target.value)}
              maxLength={2000}
              required
              rows={3}
              className="w-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 rounded resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enviandoAdmin}
                className="text-xs bg-brand-700 text-white px-3 py-1.5 rounded hover:bg-brand-800 transition-colors disabled:opacity-50"
              >
                {enviandoAdmin ? "Enviando…" : "Publicar respuesta"}
              </button>
              <button
                type="button"
                onClick={() => setRespondiendoAdmin(false)}
                className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1.5"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Respuestas anidadas */}
      {expandido && respuestas.length > 0 && (
        <div className={`ml-4 mt-1 border-l-2 pl-4 space-y-1 ${comentario.esAdmin ? "border-brand-200" : "border-zinc-100"}`}>
          {respuestas.map((r) => (
            <NodoComentario
              key={r.id}
              comentario={r}
              publicacionId={publicacionId}
              esAdmin={esAdmin}
              profundidadMax={profundidadMax}
              onEliminar={(id) => setRespuestas((prev) => prev.filter((x) => x.id !== id))}
              onOcultar={(id) => setRespuestas((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal exportado ───────────────────────────────────
export default function ComentarioHilo({
  comentarios: inicial,
  publicacionId,
  esAdmin = false,
}: {
  comentarios: ComentarioArbol[];
  publicacionId: string;
  esAdmin?: boolean;
}) {
  const [comentarios, setComentarios] = useState<ComentarioArbol[]>(inicial);

  const eliminar = useCallback((id: string) => {
    setComentarios((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const ocultar = useCallback((id: string) => {
    setComentarios((prev) => prev.filter((c) => c.id !== id));
  }, []);

  if (comentarios.length === 0) {
    return (
      <p className="text-zinc-400 text-sm text-center py-6 border border-dashed border-zinc-100 rounded">
        Sé el primero en comentar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comentarios.map((c) => (
        <NodoComentario
          key={c.id}
          comentario={c}
          publicacionId={publicacionId}
          esAdmin={esAdmin}
          profundidadMax={2}
          onEliminar={eliminar}
          onOcultar={ocultar}
        />
      ))}
    </div>
  );
}
