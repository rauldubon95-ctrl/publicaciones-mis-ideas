"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface Servicio {
  id: string;
  titulo: string;
  descripcion: string;
  detalle: string | null;
  categoria: string;
  icono: string | null;
  activo: boolean;
  orden: number;
  _count: { cotizaciones: number };
}

const CATEGORIAS_SUGERIDAS = [
  "Formulación y Evaluación",
  "Investigación Social",
  "Datos y Sistemas",
  "Consultoría Técnica",
];

const ICONOS_SUGERIDOS = [
  "📊", "📋", "🔍", "📈", "🗂️", "✍️", "🧮", "💻", "📚", "🏛️",
  "🔬", "📐", "🗃️", "📑", "🎯", "💡",
];

interface FormData {
  titulo: string;
  descripcion: string;
  detalle: string;
  categoria: string;
  icono: string;
  activo: boolean;
  orden: number;
}

const FORM_VACÍO: FormData = {
  titulo: "",
  descripcion: "",
  detalle: "",
  categoria: "",
  icono: "",
  activo: true,
  orden: 0,
};

export default function AdminServiciosPage() {
  const router = useRouter();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState<FormData>(FORM_VACÍO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarServicios = useCallback(() => {
    setCargando(true);
    fetch("/api/admin/servicios")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setServicios(data as Servicio[]); })
      .finally(() => setCargando(false));
  }, [router]);

  useEffect(() => { cargarServicios(); }, [cargarServicios]);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACÍO);
    setError(null);
    setModalAbierto(true);
  }

  function abrirEditar(s: Servicio) {
    setEditando(s);
    setForm({
      titulo: s.titulo,
      descripcion: s.descripcion,
      detalle: s.detalle ?? "",
      categoria: s.categoria,
      icono: s.icono ?? "",
      activo: s.activo,
      orden: s.orden,
    });
    setError(null);
    setModalAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      detalle: form.detalle.trim() || undefined,
      categoria: form.categoria.trim(),
      icono: form.icono.trim() || undefined,
      activo: form.activo,
      orden: form.orden,
    };

    const url = editando ? `/api/admin/servicios/${editando.id}` : "/api/admin/servicios";
    const method = editando ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Error al guardar."); return; }
      setModalAbierto(false);
      cargarServicios();
    } catch {
      setError("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  }

  async function toggleActivo(s: Servicio) {
    await fetch(`/api/admin/servicios/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !s.activo }),
    });
    cargarServicios();
  }

  async function eliminar(s: Servicio) {
    if (!confirm(`¿Eliminar "${s.titulo}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/servicios/${s.id}`, { method: "DELETE" });
    cargarServicios();
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-zinc-400 text-sm">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-10 border-b border-zinc-200 pb-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Servicios</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {servicios.length === 0
              ? "Sin servicios"
              : `${servicios.length} servicio${servicios.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={abrirCrear} className="btn-primary">
            + Nuevo servicio
          </button>
          <Link href="/admin" className="btn-secondary">
            ← Volver
          </Link>
        </div>
      </div>

      {servicios.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-2xl mb-3">🗂️</p>
          <p className="text-sm font-medium">No hay servicios aún.</p>
          <p className="text-xs mt-1 text-zinc-300 mb-5">
            Categorías sugeridas: {CATEGORIAS_SUGERIDAS.join(" · ")}
          </p>
          <button onClick={abrirCrear} className="btn-primary">
            Crear primer servicio
          </button>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {servicios.map((s) => (
            <div key={s.id} className="py-4 flex items-center gap-4 group">
              <div className="text-xl w-8 text-center shrink-0">{s.icono || "📋"}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`badge text-xs uppercase tracking-wider ${
                      s.activo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {s.activo ? "Activo" : "Oculto"}
                  </span>
                  <span className="badge bg-brand-50 text-brand-600 text-xs">
                    {s.categoria}
                  </span>
                  <span className="text-xs text-zinc-400">#{s.orden}</span>
                </div>
                <h2 className="font-serif font-semibold text-zinc-900 text-sm truncate">
                  {s.titulo}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{s.descripcion}</p>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {s._count.cotizaciones} solicitud{s._count.cotizaciones !== 1 ? "es" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => abrirEditar(s)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleActivo(s)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  {s.activo ? "Ocultar" : "Activar"}
                </button>
                <button
                  onClick={() => eliminar(s)}
                  className="text-xs text-red-400 hover:text-red-600 px-2 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalAbierto(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-serif font-semibold text-zinc-900">
                {editando ? "Editar servicio" : "Nuevo servicio"}
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardar} className="p-6 space-y-4">
              {/* Icono */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Icono (emoji)
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {ICONOS_SUGERIDOS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icono: ic }))}
                      className={`text-lg p-1.5 rounded border transition-colors ${
                        form.icono === ic
                          ? "border-brand-600 bg-brand-50"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={form.icono}
                  onChange={(e) => setForm((f) => ({ ...f, icono: e.target.value }))}
                  className="input w-24"
                  placeholder="Emoji"
                />
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className="input"
                  placeholder="Nombre del servicio"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="categorias-lista"
                  maxLength={80}
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="input"
                  placeholder="Ej. Formulación y Evaluación"
                />
                <datalist id="categorias-lista">
                  {CATEGORIAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Descripción corta */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Descripción corta <span className="text-red-500">*</span>{" "}
                  <span className="text-zinc-400">(para la tarjeta)</span>
                </label>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="input resize-none"
                  placeholder="Una o dos oraciones describiendo el servicio"
                />
                <p className="text-xs text-zinc-400 text-right mt-1">
                  {form.descripcion.length}/500
                </p>
              </div>

              {/* Detalle */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Detalle ampliado{" "}
                  <span className="text-zinc-400">(metodología, entregables, etc.)</span>
                </label>
                <textarea
                  maxLength={3000}
                  rows={4}
                  value={form.detalle}
                  onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
                  className="input resize-none"
                  placeholder="Descripción ampliada, metodología, entregables… (opcional)"
                />
              </div>

              {/* Orden + Activo */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Orden (menor = primero)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={form.orden}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, orden: parseInt(e.target.value) || 0 }))
                    }
                    className="input w-24"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                    className="accent-brand-700 w-4 h-4"
                  />
                  <span className="text-sm text-zinc-700">Visible en el sitio</span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded px-4 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn-primary flex-1 justify-center disabled:opacity-60"
                >
                  {guardando ? "Guardando…" : editando ? "Actualizar" : "Crear servicio"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
