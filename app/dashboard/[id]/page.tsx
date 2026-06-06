"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MuroDashboard from "@/components/MuroDashboard";
import BotonesCompartir from "@/components/BotonesCompartir";

interface Preview {
  sheetName: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;
}

interface Tablero {
  id: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  categoria?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  preview?: string;
  creadoAt: string;
  esPremium?: boolean;
  precioCentavos?: number | null;
  resumenPublico?: string | null;
  requiereAcceso?: boolean;
  esAdmin?: boolean;
}

function formatCelda(v: string | number | boolean | null): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

export default function TableroPage() {
  const { id } = useParams<{ id: string }>();
  const [tablero, setTablero] = useState<Tablero | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"tabla" | "dashboard">("tabla");
  // Aviso anti-reshare: el endpoint de descarga redirige aquí con ?acceso=
  // caducado|limite cuando la descarga del Excel agotó su ventana o su tope.
  // La lectura sigue disponible; solo se informa al comprador.
  const [acceso, setAcceso] = useState<string | null>(null);

  useEffect(() => {
    setAcceso(new URLSearchParams(window.location.search).get("acceso"));
  }, []);

  useEffect(() => {
    fetch(`/api/dashboard/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("No encontrado");
        return r.json();
      })
      .then((d: Tablero) => {
        setTablero(d);
        if (d.preview) {
          try { setPreview(JSON.parse(d.preview)); } catch { /* preview inválido */ }
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Volver al Dashboard</Link>
        <p className="mt-6 text-zinc-500">{error}</p>
      </div>
    );
  }

  if (!tablero) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-300 animate-pulse">
        Cargando...
      </div>
    );
  }

  const esPremium = !!tablero.esPremium && (tablero.precioCentavos ?? 0) > 0;
  const puedeVer = !tablero.requiereAcceso;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/dashboard" className="hover:text-zinc-600 transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-zinc-600 truncate">{tablero.titulo}</span>
      </nav>

      {puedeVer && !tablero.esAdmin && (acceso === "caducado" || acceso === "limite") && (
        <div className="mb-6 border border-amber-200 bg-amber-50 rounded-sm px-4 py-2.5">
          <p className="text-sm text-amber-800">
            {acceso === "caducado"
              ? "El enlace para descargar el Excel de este tablero ha caducado."
              : "Has alcanzado el número máximo de descargas del Excel de este tablero."}{" "}
            Puedes seguir consultando los datos en pantalla. Si necesitas descargarlo de nuevo, escríbeme y te reactivo el acceso.
          </p>
        </div>
      )}

      {esPremium && tablero.esAdmin && (
        <div className="mb-6 flex items-center justify-between gap-4 border border-blue-200 bg-blue-50 rounded-sm px-4 py-2.5">
          <p className="text-sm text-blue-800 font-medium">
            Tablero de pago — estás viendo el contenido completo porque eres admin. Los visitantes deben comprarlo para acceder.
          </p>
          <Link href="/admin/tableros" className="shrink-0 text-xs font-medium text-blue-900 underline underline-offset-2 hover:text-blue-700">
            Editar precio
          </Link>
        </div>
      )}

      {/* Encabezado */}
      <header className="mb-8 border-b border-zinc-200 pb-6">
        {tablero.categoria && (
          <span className="inline-block text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-sm mb-3">
            {tablero.categoria}
          </span>
        )}
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-2">{tablero.titulo}</h1>
        {tablero.descripcion && (
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">{tablero.descripcion}</p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            {tablero.archivoNombre && <span>{tablero.archivoNombre}</span>}
            {preview && vista === "tabla" && puedeVer && (
              <span>
                {preview.totalRows > 500
                  ? `Mostrando 500 de ${preview.totalRows} filas`
                  : `${preview.totalRows} filas · ${preview.headers.length} columnas`}
              </span>
            )}
          </div>
          {puedeVer && (
            <a
              href={`/api/dashboard/${tablero.slug}/descargar`}
              download={tablero.archivoNombre}
              className="inline-flex items-center gap-1.5 text-xs bg-brand-700 text-white hover:bg-brand-800 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Excel
            </a>
          )}
        </div>
      </header>

      <BotonesCompartir titulo={tablero.titulo} path={`/dashboard/${tablero.slug}`} />

      {!puedeVer && (
        <div className="max-w-2xl mx-auto pt-2">
          {tablero.resumenPublico ? (
            <div className="prose prose-zinc max-w-none mb-2 whitespace-pre-wrap">
              {tablero.resumenPublico}
            </div>
          ) : tablero.descripcion ? (
            <p className="text-zinc-600 leading-relaxed">{tablero.descripcion}</p>
          ) : null}
          <MuroDashboard
            tableroId={tablero.id}
            titulo={tablero.titulo}
            precioCentavos={tablero.precioCentavos!}
          />
        </div>
      )}

      {puedeVer && (
        <>
          {/* Toggle de vista */}
          <div className="flex items-center gap-1 mb-5 bg-zinc-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setVista("tabla")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === "tabla" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Tabla de datos
            </button>
            <button
              onClick={() => setVista("dashboard")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${vista === "dashboard" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Dashboard (gráficas)
            </button>
          </div>

          {/* Vista: Tabla */}
          {vista === "tabla" && (preview ? (
            <div>
              {preview.sheetName && (
                <p className="text-xs text-zinc-400 mb-2">Hoja: <strong>{preview.sheetName}</strong></p>
              )}
              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="overflow-auto" style={{ maxHeight: "65vh" }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-zinc-800 text-white">
                        <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 w-10 text-right border-r border-zinc-700">#</th>
                        {preview.headers.map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-r border-zinc-700 last:border-r-0">
                            {h || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                          <td className="px-3 py-2 text-xs text-zinc-300 text-right border-r border-zinc-100 select-none">
                            {ri + 1}
                          </td>
                          {preview.headers.map((_, ci) => (
                            <td key={ci} className="px-4 py-2 text-zinc-700 border-r border-zinc-100 last:border-r-0 whitespace-nowrap max-w-xs truncate">
                              {formatCelda(row[ci] ?? null)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {preview.totalRows > 500 && (
                <p className="text-xs text-zinc-400 mt-2 text-center">
                  Se muestran las primeras 500 filas. Descargá el archivo para ver el conjunto completo.
                </p>
              )}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">Sin vista previa disponible.</p>
          ))}

          {/* Vista: Dashboard con Office Online */}
          {vista === "dashboard" && tablero.archivoUrl && (
            <div className="border border-zinc-200 rounded-xl overflow-hidden" style={{ height: "75vh" }}>
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(tablero.archivoUrl)}`}
                className="w-full h-full border-0"
                title={`${tablero.titulo} — Dashboard`}
                allow="fullscreen"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
