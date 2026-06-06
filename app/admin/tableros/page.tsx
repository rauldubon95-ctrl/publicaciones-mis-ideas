"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Tablero {
  id: string;
  titulo: string;
  slug: string;
  descripcion?: string;
  categoria?: string;
  archivoNombre: string;
  publicado: boolean;
  orden: number;
  creadoAt: string;
  esPremium?: boolean;
  precioCentavos?: number | null;
  resumenPublico?: string | null;
}

export default function AdminTablerosPage() {
  const [tableros, setTableros] = useState<Tablero[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [esPremiumNuevo, setEsPremiumNuevo] = useState(false);
  const [editandoPremium, setEditandoPremium] = useState<string | null>(null);
  const [precioEdit, setPrecioEdit] = useState("");
  const [resumenEdit, setResumenEdit] = useState("");

  async function cargar() {
    const r = await fetch("/api/admin/tableros");
    if (r.ok) setTableros(await r.json());
  }

  useEffect(() => { cargar(); }, []);

  async function handleSubir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubiendo(true);
    setMensaje(null);
    try {
      const fd = new FormData(e.currentTarget);
      const r = await fetch("/api/admin/tableros", { method: "POST", body: fd });
      const data = await r.json() as { error?: string };
      if (!r.ok) throw new Error(data.error ?? "Error desconocido");
      setMensaje({ tipo: "ok", texto: "Tablero subido correctamente. Publicalo cuando esté listo." });
      formRef.current?.reset();
      await cargar();
    } catch (err) {
      setMensaje({ tipo: "err", texto: (err as Error).message });
    } finally {
      setSubiendo(false);
    }
  }

  async function togglePublicado(t: Tablero) {
    const r = await fetch(`/api/admin/tableros/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicado: !t.publicado }),
    });
    if (r.ok) await cargar();
  }

  async function eliminar(t: Tablero) {
    if (!confirm(`¿Eliminar "${t.titulo}"? Esta acción no se puede deshacer.`)) return;
    const r = await fetch(`/api/admin/tableros/${t.id}`, { method: "DELETE" });
    if (r.ok) await cargar();
  }

  function abrirEdicionPremium(t: Tablero) {
    setEditandoPremium(t.id);
    setPrecioEdit(t.precioCentavos != null ? (t.precioCentavos / 100).toFixed(2) : "");
    setResumenEdit(t.resumenPublico ?? "");
  }

  async function guardarPremium(t: Tablero, esPremium: boolean) {
    const precioFloat = parseFloat(precioEdit);
    const precioCentavos = !isNaN(precioFloat) && precioFloat >= 1
      ? Math.round(precioFloat * 100)
      : null;

    if (esPremium && precioCentavos == null) {
      alert("El precio mínimo es $1.00 USD.");
      return;
    }

    const r = await fetch(`/api/admin/tableros/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        esPremium,
        precioCentavos,
        resumenPublico: resumenEdit.trim() || null,
      }),
    });
    if (r.ok) {
      setEditandoPremium(null);
      await cargar();
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      alert(d.error ?? "Error al guardar");
    }
  }

  async function quitarPremium(t: Tablero) {
    if (!confirm(`¿Convertir "${t.titulo}" en tablero gratuito?`)) return;
    const r = await fetch(`/api/admin/tableros/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esPremium: false, precioCentavos: null }),
    });
    if (r.ok) await cargar();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-zinc-400 hover:text-zinc-700 text-sm">← Admin</Link>
        <h1 className="text-xl font-semibold text-zinc-900">Gestión de Dashboards Excel</h1>
      </div>

      {/* Formulario de subida */}
      <form
        ref={formRef}
        onSubmit={handleSubir}
        className="bg-white border border-zinc-200 rounded-xl p-6 mb-8 space-y-4"
      >
        <h2 className="font-medium text-zinc-800 text-sm">Subir nuevo tablero</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Título *</label>
            <input name="titulo" required className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Estadísticas 2024" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Categoría</label>
            <input name="categoria" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Investigación, Encuestas..." />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Descripción</label>
          <textarea name="descripcion" rows={2} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Describe brevemente qué contiene este archivo..." />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">Archivo Excel (.xlsx / .xls) *</label>
          <input name="archivo" type="file" accept=".xlsx,.xls" required className="w-full text-sm text-zinc-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:bg-zinc-100 file:text-zinc-700 file:text-xs file:cursor-pointer" />
          <p className="text-xs text-zinc-400 mt-1">Máx. 10 MB. Se mostrará como tabla de solo lectura al público.</p>
        </div>

        {/* Monetización */}
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="esPremium"
              value="true"
              checked={esPremiumNuevo}
              onChange={(e) => setEsPremiumNuevo(e.target.checked)}
              className="rounded-sm border-zinc-300"
            />
            <span className="text-sm text-zinc-700 font-medium">
              {esPremiumNuevo ? "Tablero de pago" : "Tablero gratuito"}
            </span>
          </label>
          {esPremiumNuevo && (
            <>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Precio (centavos USD) *</label>
                <input
                  type="number"
                  name="precioCentavos"
                  min="100"
                  step="1"
                  placeholder="500 = $5.00"
                  className="w-32 border border-zinc-200 rounded-lg px-3 py-2 text-sm"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">Ejemplo: 500 = $5.00 USD. Mínimo 100 ($1.00).</p>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Resumen público (opcional)</label>
                <textarea
                  name="resumenPublico"
                  rows={3}
                  maxLength={2000}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Texto que verán los visitantes antes del muro de pago. Si lo dejas vacío, se mostrará la descripción."
                />
              </div>
            </>
          )}
        </div>

        {mensaje && (
          <p className={`text-sm px-3 py-2 rounded-sm ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {mensaje.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={subiendo}
          className="bg-brand-700 text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {subiendo ? "Subiendo y procesando..." : "Subir tablero"}
        </button>
      </form>

      {/* Lista de tableros */}
      <div className="space-y-3">
        {tableros.length === 0 && (
          <p className="text-zinc-400 text-sm text-center py-8">Aún no hay tableros. Subí el primero.</p>
        )}
        {tableros.map((t) => (
          <div key={t.id} className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.publicado ? "bg-emerald-500" : "bg-zinc-300"}`} />
                <span className="text-sm font-medium text-zinc-900 truncate">{t.titulo}</span>
                {t.categoria && <span className="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-sm shrink-0">{t.categoria}</span>}
                {t.esPremium && t.precioCentavos != null && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm shrink-0">
                    Premium · ${(t.precioCentavos / 100).toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 ml-4">{t.archivoNombre}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/dashboard/${t.slug}`} target="_blank" className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded-sm border border-zinc-200">
                Ver
              </a>
              <button
                onClick={() => togglePublicado(t)}
                className={`text-xs px-2 py-1 rounded-sm border transition-colors ${t.publicado ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
              >
                {t.publicado ? "Publicado" : "Publicar"}
              </button>
              {t.esPremium ? (
                <button
                  onClick={() => quitarPremium(t)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded-sm border border-zinc-200 hover:bg-zinc-50"
                  title="Quitar precio y dejar gratis"
                >
                  Hacer gratis
                </button>
              ) : null}
              <button
                onClick={() => editandoPremium === t.id ? setEditandoPremium(null) : abrirEdicionPremium(t)}
                className="text-xs text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-sm border border-amber-200"
              >
                {editandoPremium === t.id ? "Cerrar" : (t.esPremium ? "Editar precio" : "Hacer premium")}
              </button>
              <button
                onClick={() => eliminar(t)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-sm border border-transparent hover:border-red-200"
              >
                Eliminar
              </button>
            </div>
            </div>

            {/* Panel inline de edición premium */}
            {editandoPremium === t.id && (
              <div className="mt-4 border-t border-zinc-100 pt-4 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Precio (USD)</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={precioEdit}
                      onChange={(e) => setPrecioEdit(e.target.value)}
                      placeholder="5.00"
                      className="w-full border border-zinc-200 rounded-lg pl-7 pr-3 py-2 text-sm"
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Mínimo $1.00.</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Resumen público (opcional)</label>
                  <textarea
                    value={resumenEdit}
                    onChange={(e) => setResumenEdit(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Texto visible antes del muro de pago. Si lo dejas vacío, se mostrará la descripción."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => guardarPremium(t, true)}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-sm"
                  >
                    Guardar como premium
                  </button>
                  <button
                    onClick={() => setEditandoPremium(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-700 px-3 py-1.5 rounded-sm border border-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
