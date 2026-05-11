"use client";
import { useState, useEffect } from "react";

const TIPOS = [
  { tipo: "me_gusta", emoji: "👍", label: "Me gusta" },
  { tipo: "me_encanta", emoji: "❤️", label: "Me encanta" },
  { tipo: "inspirador", emoji: "💡", label: "Inspirador" },
];

function getSessionId(): string {
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("session_id", id);
  }
  return id;
}

interface Conteos { [tipo: string]: number }

export default function ReaccionButtons({
  publicacionId,
  conteos: conteoInicial,
}: {
  publicacionId: string;
  conteos: Conteos;
}) {
  const [conteos, setConteos] = useState<Conteos>(conteoInicial);
  const [activos, setActivos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    fetch(`/api/reacciones?publicacionId=${publicacionId}&sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((data) => setActivos(new Set(data.activos ?? [])))
      .catch(() => {});
  }, [publicacionId]);

  async function toggleReaccion(tipo: string) {
    if (cargando) return;
    const sessionId = getSessionId();
    setCargando(tipo);
    const estaActivo = activos.has(tipo);
    try {
      const res = await fetch("/api/reacciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicacionId, tipo, sessionId }),
      });
      const data = await res.json();
      setConteos((prev) => ({ ...prev, [tipo]: data.conteo }));
      setActivos((prev) => {
        const next = new Set(prev);
        estaActivo ? next.delete(tipo) : next.add(tipo);
        return next;
      });
    } catch {
    } finally {
      setCargando(null);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {TIPOS.map(({ tipo, emoji, label }) => (
        <button
          key={tipo}
          onClick={() => toggleReaccion(tipo)}
          disabled={cargando === tipo}
          title={label}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            activos.has(tipo)
              ? "bg-brand-50 border-brand-300 text-brand-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <span>{emoji}</span>
          <span>{conteos[tipo] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
