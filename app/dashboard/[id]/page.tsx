"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  archivoUrl: string;
  archivoNombre: string;
  preview: string;
  creadoAt: string;
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

  useEffect(() => {
    fetch(`/api/dashboard/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("No encontrado");
        return r.json();
      })
      .then((d: Tablero) => {
        setTablero(d);
        try { setPreview(JSON.parse(d.preview)); } catch { /* preview inválido */ }
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

      {/* Encabezado */}
      <header className="mb-8 border-b border-zinc-200 pb-6">
        {tablero.categoria && (
          <span className="inline-block text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded mb-3">
            {tablero.categoria}
          </span>
        )}
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-2">{tablero.titulo}</h1>
        {tablero.descripcion && (
          <p className="text-zinc-500 text-sm leading-relaxed mb-4">{tablero.descripcion}</p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span>{tablero.archivoNombre}</span>
            {preview && (
              <span>
                {preview.totalRows > 500
                  ? `Mostrando 500 de ${preview.totalRows} filas`
                  : `${preview.totalRows} filas · ${preview.headers.length} columnas`}
              </span>
            )}
          </div>
          <a
            href={tablero.archivoUrl}
            download={tablero.archivoNombre}
            className="inline-flex items-center gap-1.5 text-xs bg-brand-700 text-white hover:bg-brand-800 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Excel
          </a>
        </div>
      </header>

      {/* Tabla */}
      {preview ? (
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
      )}
    </div>
  );
}
