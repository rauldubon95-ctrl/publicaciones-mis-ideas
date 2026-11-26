"use client";
import { useId, useState } from "react";
import type { ComentarioArbol } from "@/app/api/comentarios/route";

export default function ComentarioForm({
  publicacionId,
  onNuevoComentario,
}: {
  publicacionId: string;
  onNuevoComentario: (c: ComentarioArbol) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [contenido, setContenido] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const uid = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !contenido.trim()) return;
    setEstado("enviando");
    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicacionId,
          autorNombre: nombre.trim(),
          contenido: contenido.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar");
      onNuevoComentario(data as ComentarioArbol);
      setNombre("");
      setContenido("");
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al enviar");
      setEstado("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby={`${uid}-titulo`} className="space-y-3">
      <h3 id={`${uid}-titulo`} className="font-semibold text-zinc-800 text-sm">Dejar un comentario</h3>
      {/* Etiquetas visibles: el placeholder desaparece al escribir y no sirve como nombre del campo. */}
      <label htmlFor={`${uid}-nombre`} className="block text-xs font-medium text-zinc-600 -mb-2">
        Tu nombre
      </label>
      <input
        id={`${uid}-nombre`}
        name="nombre"
        type="text"
        autoComplete="name"
        placeholder="Ej. María López"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={80}
        required
        className="input"
      />
      <label htmlFor={`${uid}-contenido`} className="block text-xs font-medium text-zinc-600 -mb-2">
        Comentario
      </label>
      <textarea
        id={`${uid}-contenido`}
        name="contenido"
        aria-describedby={`${uid}-ayuda`}
        placeholder="Escribe tu comentario…"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        maxLength={1000}
        required
        rows={4}
        className="input resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="btn-primary disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando…" : "Publicar comentario"}
        </button>
        <span role="status" className={`text-sm ${estado === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {estado === "ok" && "¡Comentario publicado!"}
          {estado === "error" && errorMsg}
        </span>
      </div>
      <p id={`${uid}-ayuda`} className="text-[11px] text-zinc-500">
        Máximo 1000 caracteres · No se permiten enlaces externos
      </p>
    </form>
  );
}
