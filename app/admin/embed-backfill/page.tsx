"use client";

import { useState } from "react";
import Link from "next/link";

interface Estado {
  status?: "en_progreso" | "completo";
  procesados?: number;
  errores?: number;
  ultimoId?: number;
  mensaje?: string;
  error?: string;
  detalle?: string;
}

export default function EmbedBackfillPage() {
  const [corriendo, setCorriendo] = useState(false);
  const [iteracion, setIteracion] = useState(0);
  const [estado, setEstado] = useState<Estado>({});
  const [log, setLog] = useState<string[]>([]);
  const [detenerFlag, setDetenerFlag] = useState(false);

  function agregarLog(msg: string) {
    setLog((prev) => [...prev.slice(-40), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function iniciarBackfill() {
    setCorriendo(true);
    setDetenerFlag(false);
    setIteracion(0);
    setEstado({});
    setLog([]);
    agregarLog("Iniciando backfill de embeddings...");

    let iter = 0;
    let seguir = true;

    while (seguir) {
      iter++;
      setIteracion(iter);

      try {
        const res = await fetch("/api/admin/embed-backfill", { method: "POST" });
        const data: Estado = await res.json();

        if (!res.ok) {
          agregarLog(`❌ Error HTTP ${res.status}: ${data.error ?? "sin detalle"}`);
          if (data.detalle) agregarLog(`   Detalle: ${data.detalle}`);
          setEstado(data);
          break;
        }

        setEstado(data);

        if (data.status === "completo") {
          agregarLog(`✅ COMPLETO. Total procesados: ${data.procesados ?? "?"}. Errores: ${data.errores ?? 0}.`);
          seguir = false;
        } else {
          agregarLog(`Iter ${iter}: procesados=${data.procesados ?? 0}, errores=${data.errores ?? 0}, últimoId=${data.ultimoId ?? "?"}`);
        }

        // Detener manual
        if (detenerFlag) {
          agregarLog("⏸ Detenido por el usuario.");
          break;
        }

        // Pausa entre lotes para no saturar Workers AI
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        agregarLog(`❌ Fallo de red: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    setCorriendo(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">← Volver al admin</Link>
        <h1 className="text-2xl font-bold mt-2">Sincronizar embeddings (Vectorize)</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Llena el índice <code className="text-xs bg-zinc-100 px-1 rounded">sociologia-embeddings</code> con
          los 804 documentos del corpus de D1. Procesa en lotes de 10, es reanudable si se corta.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-6 text-sm text-amber-900">
        <strong>Qué hace:</strong> por cada documento en D1, genera su embedding con Workers AI
        (<code>@cf/baai/bge-large-en-v1.5</code>, 1024 dims) y lo sube al índice Vectorize.
        Costo: entra dentro del plan gratis de Workers AI. Tiempo: ~2-3 minutos para 804 documentos.
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={iniciarBackfill}
          disabled={corriendo}
          className="px-6 py-3 bg-zinc-900 text-white rounded font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {corriendo ? `Procesando... (iter ${iteracion})` : "Iniciar backfill"}
        </button>
        {corriendo && (
          <button
            onClick={() => setDetenerFlag(true)}
            className="px-4 py-3 bg-white border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
          >
            Detener
          </button>
        )}
      </div>

      {(estado.procesados !== undefined || estado.status) && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-zinc-200 rounded p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Procesados</div>
            <div className="text-3xl font-bold mt-1">{estado.procesados ?? 0}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Errores</div>
            <div className={`text-3xl font-bold mt-1 ${(estado.errores ?? 0) > 0 ? "text-red-600" : ""}`}>
              {estado.errores ?? 0}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Estado</div>
            <div className="text-sm font-medium mt-2">
              {estado.status === "completo" ? "✅ Completo" : corriendo ? "🔄 En progreso" : "⏸ Detenido"}
            </div>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="bg-zinc-900 text-zinc-100 rounded p-4 font-mono text-xs max-h-96 overflow-y-auto">
          {log.map((l, i) => (
            <div key={i} className="py-0.5">{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
