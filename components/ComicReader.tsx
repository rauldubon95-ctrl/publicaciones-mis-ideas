"use client";
import { useState, useEffect, useCallback } from "react";

interface Pagina {
  id: string;
  imageUrl: string;
  orden: number;
  caption: string | null;
}

export default function ComicReader({ paginas }: { paginas: Pagina[] }) {
  const [actual, setActual] = useState(0);
  const [modoScroll, setModoScroll] = useState(false);

  const anterior = useCallback(() => setActual((p) => Math.max(0, p - 1)), []);
  const siguiente = useCallback(() => setActual((p) => Math.min(paginas.length - 1, p + 1)), [paginas.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (modoScroll) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") siguiente();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   anterior();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siguiente, anterior, modoScroll]);

  if (paginas.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-300 border border-dashed border-zinc-200">
        <p className="text-sm">Este cómic no tiene páginas aún.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controles superiores */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setModoScroll((v) => !v)}
          className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-sm transition-colors"
        >
          {modoScroll ? "Modo página" : "Modo scroll"}
        </button>
        {!modoScroll && (
          <span className="text-xs text-zinc-400">
            {actual + 1} / {paginas.length}
          </span>
        )}
        <span className="text-xs text-zinc-300 hidden sm:block">
          ← → para navegar
        </span>
      </div>

      {/* Modo scroll — todas las páginas */}
      {modoScroll ? (
        <div className="space-y-4">
          {paginas.map((p) => (
            <figure key={p.id} className="border border-zinc-200 bg-white overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={p.caption ?? `Página ${p.orden}`}
                className="w-full object-contain"
                loading="lazy"
              />
              {p.caption && (
                <figcaption className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-100 bg-zinc-50">
                  {p.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        /* Modo página — una a la vez */
        <div>
          <figure className="border border-zinc-200 bg-white overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={paginas[actual].id}
              src={paginas[actual].imageUrl}
              alt={paginas[actual].caption ?? `Página ${paginas[actual].orden}`}
              className="w-full object-contain"
            />
            {paginas[actual].caption && (
              <figcaption className="px-4 py-3 text-sm text-zinc-600 border-t border-zinc-100 bg-zinc-50 font-serif italic">
                {paginas[actual].caption}
              </figcaption>
            )}
          </figure>

          {/* Navegación */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={anterior}
              disabled={actual === 0}
              className="btn-secondary flex-1 justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>

            {/* Miniaturas */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {paginas.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActual(i)}
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    i === actual ? "bg-brand-700" : "bg-zinc-300 hover:bg-zinc-400"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={siguiente}
              disabled={actual === paginas.length - 1}
              className="btn-primary flex-1 justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
