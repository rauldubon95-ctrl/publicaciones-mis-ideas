"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Novedad {
  id: string;
  titulo: string;
  textoCorto: string | null;
  url: string;
  tipo: string;
  activo: boolean;
  orden: number;
  expiraAt: string | null;
}

const TIPOS = [
  { value: "articulo", label: "Artículo externo" },
  { value: "conferencia", label: "Conferencia" },
  { value: "aviso", label: "Aviso" },
];

const VACIA = { titulo: "", textoCorto: "", url: "", tipo: "articulo", activo: true, orden: 0, expiraAt: "" };

export default function NovedadesAdminPage() {
  const router = useRouter();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<typeof VACIA>({ ...VACIA });
  const [editId, setEditId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function cargar() {
    fetch("/api/admin/novedades")
      .then((r) => {
        if (r.status === 401) { router.replace("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setNovedades(d); })
      .finally(() => setCargando(false));
  }

  useEffect(cargar, [router]);

  function resetForm() {
    setForm({ ...VACIA });
    setEditId(null);
    setError("");
  }

  function editar(n: Novedad) {
    setEditId(n.id);
    setForm({
      titulo: n.titulo,
      textoCorto: n.textoCorto ?? "",
      url: n.url,
      tipo: n.tipo,
      activo: n.activo,
      orden: n.orden,
      expiraAt: n.expiraAt ? n.expiraAt.slice(0, 10) : "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const payload = {
        ...form,
        orden: Number(form.orden) || 0,
        expiraAt: form.expiraAt || null,
        textoCorto: form.textoCorto || null,
      };
      const res = await fetch(
        editId ? `/api/admin/novedades/${editId}` : "/api/admin/novedades",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      resetForm();
      cargar();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta novedad?")) return;
    await fetch(`/api/admin/novedades/${id}`, { method: "DELETE" });
    if (editId === id) resetForm();
    cargar();
  }

  const inputCls = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 outline-hidden focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all bg-white";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-zinc-900">Novedades</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Anuncios del panel lateral de la home. Caducan solos por fecha para no saturar.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
      </div>

      {/* Formulario */}
      <form onSubmit={guardar} className="mb-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {editId ? "Editar novedad" : "Nueva novedad"}
        </p>
        <input className={inputCls} placeholder="Título" value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={200} required />
        <input className={inputCls} placeholder="Texto corto (opcional)" value={form.textoCorto}
          onChange={(e) => setForm({ ...form, textoCorto: e.target.value })} maxLength={200} />
        <input className={inputCls} placeholder="https://… (destino externo)" value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })} maxLength={500} required />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className={inputCls} type="number" placeholder="Orden" value={form.orden}
            onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
          <input className={inputCls} type="date" value={form.expiraAt}
            onChange={(e) => setForm({ ...form, expiraAt: e.target.value })} title="Caduca el (opcional)" />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activa
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={guardando} className="btn-primary text-sm disabled:opacity-50">
            {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Crear novedad"}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">Cancelar</button>
          )}
        </div>
      </form>

      {/* Lista */}
      {cargando ? (
        <p className="text-zinc-400 text-sm text-center py-10">Cargando…</p>
      ) : novedades.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
          <p className="text-sm">Aún no hay novedades. Crea la primera arriba.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {novedades.map((n) => {
            const caducada = n.expiraAt && new Date(n.expiraAt) < new Date();
            return (
              <div key={n.id} className="py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="badge bg-brand-50 text-brand-600 text-xs uppercase tracking-wider">{n.tipo}</span>
                    {!n.activo && <span className="badge bg-zinc-100 text-zinc-500 text-xs">inactiva</span>}
                    {caducada && <span className="badge bg-amber-50 text-amber-700 text-xs">caducada</span>}
                  </div>
                  <p className="text-sm font-medium text-zinc-800 truncate">{n.titulo}</p>
                  <p className="text-xs text-zinc-400 truncate">{n.url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => editar(n)} className="btn-secondary py-1.5 text-xs">Editar</button>
                  <button onClick={() => eliminar(n.id)} className="text-xs text-red-500 hover:text-red-700 px-2">Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
