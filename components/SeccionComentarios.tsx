"use client";
import { useState } from "react";
import ComentarioHilo from "@/components/ComentarioHilo";
import ComentarioForm from "@/components/ComentarioForm";
import type { ComentarioArbol } from "@/app/api/comentarios/route";

export default function SeccionComentarios({
  comentariosIniciales,
  publicacionId,
  esAdmin = false,
}: {
  comentariosIniciales: ComentarioArbol[];
  publicacionId: string;
  esAdmin?: boolean;
}) {
  const [comentarios, setComentarios] = useState<ComentarioArbol[]>(comentariosIniciales);

  function agregarComentario(nuevo: ComentarioArbol) {
    setComentarios((prev) => [...prev, nuevo]);
  }

  const total = contarTodos(comentarios);

  return (
    <section>
      <h2 className="text-xl font-serif font-semibold text-zinc-900 mb-6 flex items-baseline gap-2">
        Comentarios
        {total > 0 && (
          <span className="text-sm font-sans font-normal text-zinc-400">({total})</span>
        )}
      </h2>

      {/* Lista de comentarios */}
      {comentarios.length > 0 && (
        <div className="mb-8">
          <ComentarioHilo
            comentarios={comentarios}
            publicacionId={publicacionId}
            esAdmin={esAdmin}
          />
        </div>
      )}

      {/* Formulario nuevo comentario raíz */}
      <div className="bg-white border border-zinc-200 p-6">
        <ComentarioForm
          publicacionId={publicacionId}
          onNuevoComentario={agregarComentario}
        />
      </div>
    </section>
  );
}

function contarTodos(comentarios: ComentarioArbol[]): number {
  return comentarios.reduce((acc, c) => acc + 1 + contarTodos(c.respuestas), 0);
}
