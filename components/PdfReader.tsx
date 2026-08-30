"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  pdfUrl: string;
  titulo: string;
  totalPaginas?: number | null;
  permitirDescarga?: boolean;
}

// Visor de PDF integrado con iframe (viewer nativo del navegador) + toolbar
// propia. No requiere PDF.js ni librerías externas — funciona en todos los
// navegadores modernos y respeta el CSP porque el src es del mismo origen
// (o de Supabase Storage, ya permitido en img-src y frame-src ampliado).
//
// Este componente sirve como visor genérico y reutilizable para cualquier PDF:
// cómics, libros, presentaciones y materiales educativos. Cuando el backend
// añada soporte de upload de PDF a Comic (ver CLAUDE.md pendiente), este
// componente ya está listo para usarse.
export default function PdfReader({
  pdfUrl,
  titulo,
  totalPaginas = null,
  permitirDescarga = true,
}: Props) {
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [zoom, setZoom] = useState(100);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!contenedorRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await contenedorRef.current.requestFullscreen();
        setPantallaCompleta(true);
      } else {
        await document.exitFullscreen();
        setPantallaCompleta(false);
      }
    } catch {
      // Si el navegador no soporta fullscreen, fallback = abrir en pestaña nueva
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }, [pdfUrl]);

  // Escucha cambios externos de fullscreen (Esc, F11)
  useEffect(() => {
    function onChange() {
      setPantallaCompleta(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Construcción del URL con parámetros que reconocen la mayoría de visores
  // integrados de navegador (Chrome/Edge/Firefox). #zoom= es soportado
  // universalmente; toolbar=0 lo respeta Chrome. Como fallback funcional el
  // visor nativo del navegador siempre está disponible.
  const src = `${pdfUrl}#zoom=${zoom}&toolbar=1&navpanes=0&scrollbar=1`;

  return (
    <div
      ref={contenedorRef}
      className={`bg-zinc-900 rounded-xl overflow-hidden ${
        pantallaCompleta ? "fixed inset-0 z-50 rounded-none" : "relative"
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 text-zinc-200 text-sm">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate font-medium">{titulo}</span>
          {totalPaginas != null && (
            <span className="hidden sm:inline text-xs text-zinc-500 shrink-0">
              · {totalPaginas} {totalPaginas === 1 ? "página" : "páginas"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Controles de zoom */}
          <div className="hidden sm:flex items-center gap-0.5 mr-2 border-r border-zinc-700 pr-2">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
              aria-label="Reducir zoom"
              title="Reducir"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <span className="text-xs text-zinc-400 tabular-nums w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
              aria-label="Aumentar zoom"
              title="Aumentar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

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

          {/* Abrir en nueva pestaña */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
            aria-label="Abrir en nueva pestaña"
            title="Abrir en nueva pestaña"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

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

      {/* Iframe con el PDF — el navegador provee su propio visor con toda la
          navegación por páginas, zoom, búsqueda, etc. */}
      <iframe
        src={src}
        title={titulo}
        className={`w-full bg-zinc-100 ${pantallaCompleta ? "h-[calc(100vh-48px)]" : "h-[70vh] sm:h-[80vh] lg:h-[85vh] min-h-[500px]"}`}
        // sandbox permitiendo scripts (los usa el visor del navegador) y descargas
        // (para que el botón nativo funcione). Bloqueamos top-navigation.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />

      {/* Pie con instrucciones */}
      {!pantallaCompleta && (
        <div className="px-4 py-2 bg-zinc-800/70 border-t border-zinc-700 text-[11px] text-zinc-500 flex items-center justify-between">
          <span className="hidden sm:inline">
            Usa las flechas o rueda del ratón para navegar entre páginas
          </span>
          <span className="sm:hidden">Desliza para navegar</span>
          {permitirDescarga && (
            <a href={pdfUrl} download className="text-amber-400 hover:text-amber-300 transition-colors">
              Descargar PDF ↓
            </a>
          )}
        </div>
      )}
    </div>
  );
}
