"use client";
import { useState } from "react";

export default function ComentarioForm({ publicacionId }: { publicacionId: string }) {
  const [nombre, setNombre] = useState("");
  const [contenido, setContenido] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !contenido.trim()) return;
    setEstado("enviando");
    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicacionId, autorNombre: nombre.trim(), contenido: contenido.trim() }),
      });
      if (!res.ok) throw new Error();
      setEstado("ok");
      setNombre("");
      setContenido("");
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setEstado("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-gray-800">Dejar un comentario</h3>
      <input
        type="text"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={80}
        required
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <textarea
        placeholder="Escribe tu comentario..."
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        maxLength={1000}
        required
        rows={4}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="btn-primary disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando…" : "Comentar"}
        </button>
        {estado === "ok" && <span className="text-green-600 text-sm">¡Comentario enviado!</span>}
        {estado === "error" && <span className="text-red-600 text-sm">Error al enviar</span>}
      </div>
    </form>
  );
}
