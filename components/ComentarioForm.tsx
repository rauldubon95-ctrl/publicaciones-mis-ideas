"use client";
import { useState } from "react";
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-semibold text-zinc-800 text-sm">Dejar un comentario</h3>
      <input
        type="text"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={80}
        required
        className="input"
      />
      <textarea
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
        {estado === "ok" && (
          <span className="text-emerald-600 text-sm animate-in fade-in duration-300">
            ¡Comentario publicado!
          </span>
        )}
        {estado === "error" && (
          <span className="text-red-600 text-sm">{errorMsg}</span>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">
        Máximo 1000 caracteres · No se permiten enlaces externos
      </p>
    </form>
  );
}
