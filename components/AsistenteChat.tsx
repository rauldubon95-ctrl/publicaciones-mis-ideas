"use client";

import { useState, useRef, useEffect } from "react";

const WORKER_URL = process.env.NEXT_PUBLIC_SOCIOLOGIA_WORKER_URL ?? "";

interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
  fuentes?: string[];
  error?: boolean;
}

export default function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (abierto) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [abierto, mensajes]);

  async function enviar() {
    const texto = pregunta.trim();
    if (!texto || cargando) return;

    setMensajes((prev) => [...prev, { rol: "usuario", texto }]);
    setPregunta("");
    setCargando(true);

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: texto }),
      });

      const data = await res.json() as {
        respuesta?: string;
        fuentes?: string[];
        error?: string;
        mensaje?: string;
        restantes?: number;
      };

      if (!res.ok) {
        const msg =
          res.status === 429
            ? data.mensaje ?? "Límite diario alcanzado. Vuelve mañana."
            : data.error ?? "Error del servidor.";
        setMensajes((prev) => [...prev, { rol: "asistente", texto: msg, error: true }]);
      } else {
        setMensajes((prev) => [
          ...prev,
          { rol: "asistente", texto: data.respuesta ?? "", fuentes: data.fuentes },
        ]);
        if (typeof data.restantes === "number") setRestantes(data.restantes);
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: "asistente", texto: "No se pudo conectar con el asistente.", error: true },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function manejarTecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  if (!WORKER_URL) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-zinc-900 text-white shadow-xl flex items-center justify-center hover:bg-zinc-700 transition-colors"
        aria-label="Abrir asistente de ciencias sociales"
      >
        {abierto ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Panel de chat */}
      {abierto && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
              RD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">Asistente de Raúl Dubón</p>
              <p className="text-xs text-zinc-400 mt-0.5">Ciencias sociales · IA</p>
            </div>
            {restantes !== null && (
              <span className="text-xs text-zinc-400 shrink-0">{restantes} restantes</span>
            )}
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 min-h-[200px]">
            {mensajes.length === 0 && (
              <div className="text-center text-zinc-400 text-xs mt-4 px-4">
                <p className="mb-2 text-2xl">📚</p>
                <p>Pregúntame sobre los artículos y publicaciones de Raúl Dubón.</p>
                <p className="mt-1 text-zinc-300">5 consultas gratuitas por día</p>
              </div>
            )}

            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.rol === "usuario" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.rol === "usuario"
                      ? "bg-zinc-900 text-white rounded-br-sm"
                      : m.error
                      ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                      : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  {m.fuentes && m.fuentes.length > 0 && (
                    <p className="text-xs text-zinc-400 mt-1.5 border-t border-zinc-200 pt-1.5">
                      📚 {m.fuentes.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {cargando && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 rounded-xl rounded-bl-sm px-4 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-100 p-3 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={manejarTecla}
              placeholder="Escribe tu pregunta…"
              rows={1}
              maxLength={500}
              disabled={cargando}
              className="flex-1 resize-none text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50 max-h-24 overflow-y-auto"
              style={{ minHeight: "38px" }}
            />
            <button
              onClick={enviar}
              disabled={!pregunta.trim() || cargando}
              className="w-9 h-9 shrink-0 bg-zinc-900 text-white rounded-lg flex items-center justify-center hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Enviar"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
