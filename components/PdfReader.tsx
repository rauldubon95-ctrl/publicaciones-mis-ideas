"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  pdfUrl: string;
  titulo: string;
  permitirDescarga?: boolean;
}

// Visor de PDF integrado con pdfjs-dist. Renderiza cada página del PDF como
// imagen dentro de <canvas>, con navegación tipo galería (siguiente/anterior,
// miniaturas, zoom, pantalla completa, modo scroll continuo). Funciona en
// cualquier navegador —incluidos móviles— porque no depende del visor PDF
// nativo del browser.
//
// Seguridad:
//   • pdfjs-dist v4.10+ contiene el fix del CVE-2024-4367 (XSS via FontMatrix).
//   • getDocument({isEvalSupported:false}) desactiva eval y limita superficie.
//   • El worker corre en /_next/... (mismo origen) — sin scripts de terceros.
//   • Los PDFs vienen de Supabase Storage, ya cubierto por connect-src.
//
// Rendimiento:
//   • Render on-demand por página (no toda la galería a la vez).
//   • Uso de devicePixelRatio para nitidez en pantallas retina.
//   • En modo scroll, render diferido con IntersectionObserver.
export default function PdfReader({
  pdfUrl,
  titulo,
  permitirDescarga = true,
}: Props) {
  const [numPaginas, setNumPaginas] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoScroll, setModoScroll] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfRef = useRef<unknown>(null);
  const renderingRef = useRef(false);

  // ─── Carga inicial del PDF ────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        // Import dinámico → pdfjs-dist NO va al bundle inicial; solo cuando el
        // usuario abre un cómic-PDF. Turbopack resuelve la ruta ESM y sirve el
        // worker desde /_next/... (mismo origen, respeta worker-src 'self').
        const pdfjs = await import("pdfjs-dist");
        // El worker se apunta al build ESM más nuevo. Turbopack lo transforma
        // en una URL estática servida por Next; el navegador la carga desde
        // mismo origen. Si el import fallara, PDF.js cae a modo "fake worker"
        // (main thread, más lento pero funcional).
        try {
          const workerModule = await import(
            // @ts-expect-error — Turbopack maneja el sufijo ?url
            "pdfjs-dist/build/pdf.worker.min.mjs?url"
          );
          pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
        } catch {
          // Fallback: usar CDN mismo origen no disponible → PDF.js renderizará
          // en main thread. Aceptable para PDFs pequeños.
        }

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          isEvalSupported: false, // seguridad: desactiva eval en el parser
          disableAutoFetch: false,
          disableStream: false,
        });
        const pdf = await loadingTask.promise;

        if (cancelado) return;
        pdfRef.current = pdf;
        setNumPaginas(pdf.numPages);
        setCargando(false);
      } catch (e) {
        if (cancelado) return;
        console.error("Error al cargar PDF:", e);
        setError("No se pudo cargar el PDF. Intenta descargarlo directamente.");
        setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [pdfUrl]);

  // ─── Renderiza la página actual en el canvas ──────────────────────────
  const renderPagina = useCallback(
    async (numero: number, canvas: HTMLCanvasElement | null) => {
      if (!pdfRef.current || !canvas || renderingRef.current) return;
      renderingRef.current = true;
      try {
        const pdf = pdfRef.current as { getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> };
        const page = await pdf.getPage(numero);
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const contenedorAncho = contenedorRef.current?.clientWidth ?? 800;
        // Escala base: ajustar página al ancho del contenedor. La primera pasada
        // pide viewport a scale=1 para conocer proporciones, luego calculamos.
        const viewportBase = page.getViewport({ scale: 1 });
        const escalaBase = Math.min(
          (contenedorAncho - 32) / viewportBase.width,
          2.5 // techo para no explotar el canvas en pantallas grandes
        );
        const escala = escalaBase * zoom * dpr;
        const viewport = page.getViewport({ scale: escala });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.error(`Error al renderizar página ${numero}:`, e);
      } finally {
        renderingRef.current = false;
      }
    },
    [zoom]
  );

  // Re-renderiza cuando cambia página, zoom o modo (solo en modo página)
  useEffect(() => {
    if (!cargando && !modoScroll && numPaginas > 0) {
      renderPagina(paginaActual, canvasRef.current);
    }
  }, [paginaActual, cargando, modoScroll, numPaginas, renderPagina]);

  // ─── Navegación ───────────────────────────────────────────────────────
  const anterior = useCallback(
    () => setPaginaActual((p) => Math.max(1, p - 1)),
    []
  );
  const siguiente = useCallback(
    () => setPaginaActual((p) => Math.min(numPaginas, p + 1)),
    [numPaginas]
  );

  // Flechas del teclado (solo en modo página)
  useEffect(() => {
    if (modoScroll) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") siguiente();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") anterior();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siguiente, anterior, modoScroll]);

  // ─── Pantalla completa ────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!contenedorRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await contenedorRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // navegador sin soporte → abrir en nueva pestaña como fallback
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }, [pdfUrl]);

  useEffect(() => {
    function onChange() {
      setPantallaCompleta(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ─── UI ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-6 text-center">
        <svg className="w-8 h-8 mx-auto text-amber-600 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-amber-900 text-sm mb-3">{error}</p>
        <a
          href={pdfUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-full transition-colors"
        >
          Descargar PDF
        </a>
      </div>
    );
  }

  return (
    <div
      ref={contenedorRef}
      className={`bg-zinc-900 rounded-xl overflow-hidden ${
        pantallaCompleta ? "fixed inset-0 z-50 rounded-none" : "relative"
      }`}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 text-zinc-200 text-sm">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate font-medium">{titulo}</span>
          {numPaginas > 0 && !modoScroll && (
            <span className="hidden sm:inline text-xs text-zinc-500 shrink-0 tabular-nums">
              · {paginaActual} / {numPaginas}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle modo */}
          <button
            onClick={() => setModoScroll((v) => !v)}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            title={modoScroll ? "Cambiar a modo página" : "Cambiar a modo scroll"}
          >
            {modoScroll ? "Página" : "Scroll"}
          </button>

          {/* Zoom (solo modo página) */}
          {!modoScroll && (
            <div className="flex items-center gap-0.5 mr-1 border-l border-zinc-700 pl-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="p-1.5 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40"
                disabled={zoom <= 0.5}
                aria-label="Reducir zoom"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <span className="hidden md:inline text-xs text-zinc-400 tabular-nums w-11 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                className="p-1.5 rounded hover:bg-zinc-700 transition-colors disabled:opacity-40"
                disabled={zoom >= 2.5}
                aria-label="Aumentar zoom"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}

          {/* Descarga */}
          {permitirDescarga && (
            <a
              href={pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
              aria-label="Descargar PDF"
              title="Descargar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </a>
          )}

          {/* Pantalla completa */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
            aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
            title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {pantallaCompleta ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V5H5v4h4zm10 0V5h-4v4h4zM9 15v4H5v-4h4zm10 0v4h-4v-4h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── Área de visor ─── */}
      <div
        className={`bg-zinc-800 overflow-auto ${
          pantallaCompleta
            ? "h-[calc(100vh-104px)]"
            : "h-[70vh] sm:h-[80vh] lg:h-[85vh] min-h-[500px]"
        }`}
      >
        {cargando ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
            <span className="w-8 h-8 border-2 border-zinc-500 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-sm">Cargando PDF…</p>
          </div>
        ) : modoScroll ? (
          <PaginasScroll pdf={pdfRef.current} numPaginas={numPaginas} />
        ) : (
          <div className="flex items-center justify-center py-6 px-4 min-h-full">
            <canvas ref={canvasRef} className="shadow-2xl shadow-black/40 bg-white" />
          </div>
        )}
      </div>

      {/* ─── Barra inferior de navegación (solo modo página) ─── */}
      {!cargando && !modoScroll && numPaginas > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-800 border-t border-zinc-700">
          <button
            onClick={anterior}
            disabled={paginaActual === 1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-zinc-200 bg-zinc-700 hover:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>

          {/* Miniaturas / punto por página */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[50%]">
            {Array.from({ length: Math.min(numPaginas, 40) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPaginaActual(n)}
                aria-label={`Ir a página ${n}`}
                aria-current={n === paginaActual ? "page" : undefined}
                className={`shrink-0 rounded-full transition-all ${
                  n === paginaActual
                    ? "w-6 h-2 bg-amber-500"
                    : "w-2 h-2 bg-zinc-600 hover:bg-zinc-400"
                }`}
              />
            ))}
            {numPaginas > 40 && (
              <span className="text-xs text-zinc-500 ml-2">…</span>
            )}
          </div>

          <button
            onClick={siguiente}
            disabled={paginaActual === numPaginas}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-zinc-200 bg-zinc-700 hover:bg-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Modo scroll: renderiza todas las páginas apiladas verticalmente, con
// carga diferida (IntersectionObserver) para no explotar la memoria en
// PDFs largos. Cada página se renderiza cuando entra en el viewport.
// ═══════════════════════════════════════════════════════════════════════
function PaginasScroll({ pdf, numPaginas }: { pdf: unknown; numPaginas: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 px-2">
      {Array.from({ length: numPaginas }, (_, i) => i + 1).map((n) => (
        <PaginaLazy key={n} pdf={pdf} numero={n} />
      ))}
    </div>
  );
}

function PaginaLazy({ pdf, numero }: { pdf: unknown; numero: number }) {
  const [visible, setVisible] = useState(false);
  const [renderizado, setRenderizado] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detecta entrada al viewport
  useEffect(() => {
    if (!wrapperRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "500px 0px" } // pre-render 500px antes de que llegue
    );
    io.observe(wrapperRef.current);
    return () => io.disconnect();
  }, []);

  // Renderiza cuando es visible
  useEffect(() => {
    if (!visible || renderizado || !pdf || !canvasRef.current) return;
    let cancelado = false;
    (async () => {
      try {
        const p = pdf as { getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> };
        const page = await p.getPage(numero);
        if (cancelado) return;
        const dpr = window.devicePixelRatio || 1;
        const anchoContenedor = wrapperRef.current?.clientWidth ?? 800;
        const viewportBase = page.getViewport({ scale: 1 });
        const escalaBase = Math.min((anchoContenedor - 16) / viewportBase.width, 2);
        const viewport = page.getViewport({ scale: escalaBase * dpr });
        const canvas = canvasRef.current;
        if (!canvas || cancelado) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelado) setRenderizado(true);
      } catch (e) {
        console.error(`Error al renderizar página ${numero}:`, e);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [visible, renderizado, pdf, numero]);

  return (
    <div ref={wrapperRef} className="w-full flex flex-col items-center gap-1 min-h-[400px]">
      {!renderizado && (
        <div className="w-full max-w-3xl aspect-[3/4] bg-zinc-700/50 rounded flex items-center justify-center">
          <span className="text-xs text-zinc-400">Página {numero}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`shadow-lg shadow-black/40 bg-white ${!renderizado ? "hidden" : ""}`}
      />
      <span className="text-[10px] text-zinc-500 tabular-nums">{numero}</span>
    </div>
  );
}
