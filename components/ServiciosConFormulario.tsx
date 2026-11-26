"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Servicio {
  id: string;
  titulo: string;
  slug: string;
  descripcion: string;
  categoria: string;
  icono: string | null;
}

interface Props {
  servicios: Servicio[];
}

const PRESUPUESTO_OPCIONES = [
  "Menos de $500",
  "$500 – $1,000",
  "$1,000 – $3,000",
  "$3,000 – $5,000",
  "Más de $5,000",
  "Por definir",
];

export default function ServiciosConFormulario({ servicios }: Props) {
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    organizacion: "",
    tipoServicio: "",
    descripcion: "",
    presupuesto: "",
    website: "", // honeypot
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  // Agrupar servicios por categoría
  const categorias = Array.from(new Set(servicios.map((s) => s.categoria)));

  function abrirFormulario(servicio?: Servicio) {
    setServicioSeleccionado(servicio ?? null);
    setForm((f) => ({
      ...f,
      tipoServicio: servicio?.titulo ?? "",
    }));
    setResultado(null);
    // <dialog> nativo en modo modal: el navegador vuelve inerte el resto de la
    // página, encierra el foco, cierra con Esc / gesto "atrás" y devuelve el
    // foco al botón que lo abrió. Nada de eso hay que programarlo a mano.
    dialogRef.current?.showModal();
    nombreRef.current?.focus();
  }

  function cerrarModal() {
    dialogRef.current?.close();
  }

  // Limpieza al cerrar por cualquier vía (botón, Esc, clic fuera).
  const alCerrar = useCallback(() => {
    setServicioSeleccionado(null);
    setResultado(null);
    setForm({ nombre: "", correo: "", organizacion: "", tipoServicio: "", descripcion: "", presupuesto: "", website: "" });
  }, []);

  // Cerrar al hacer clic fuera del panel. `closedby="any"` lo hace solo en
  // Chrome/Edge/Firefox; Safari aún no lo soporta, así que ahí se emula
  // comparando la posición del puntero (no event.target, que también es el
  // <dialog> en su propio padding).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;
    const fuera = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pulsoFuera = false;
    const down = (e: PointerEvent) => { pulsoFuera = fuera(e); };
    const up = (e: PointerEvent) => { if (pulsoFuera && fuera(e)) dialog.close(); };
    dialog.addEventListener("pointerdown", down);
    dialog.addEventListener("pointerup", up);
    return () => {
      dialog.removeEventListener("pointerdown", down);
      dialog.removeEventListener("pointerup", up);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);

    try {
      const payload = {
        nombre: form.nombre,
        correo: form.correo,
        organizacion: form.organizacion || undefined,
        servicioId: servicioSeleccionado?.id ?? undefined,
        tipoServicio: form.tipoServicio || undefined,
        descripcion: form.descripcion,
        presupuesto: form.presupuesto || undefined,
        website: form.website, // honeypot
      };

      const res = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { error?: string; ok?: boolean };

      if (res.ok) {
        setResultado({ ok: true, mensaje: "¡Solicitud enviada! Me pondré en contacto contigo a la brevedad." });
        setForm({ nombre: "", correo: "", organizacion: "", tipoServicio: "", descripcion: "", presupuesto: "", website: "" });
      } else {
        setResultado({ ok: false, mensaje: data.error ?? "Error al enviar. Intenta de nuevo." });
      }
    } catch {
      setResultado({ ok: false, mensaje: "Error de conexión. Verifica tu internet e intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Grid de servicios por categoría */}
      <div className="space-y-14">
        {categorias.map((cat) => (
          <section key={cat}>
            <h2 className="font-serif text-2xl font-semibold text-zinc-900 mb-6 pb-3 border-b border-zinc-200">
              {cat}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicios
                .filter((s) => s.categoria === cat)
                .map((servicio) => (
                  <article
                    key={servicio.id}
                    className="card rounded-xl p-5 flex flex-col gap-3 hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {servicio.icono && (
                        <span className="text-2xl leading-none mt-0.5" aria-hidden>
                          {servicio.icono}
                        </span>
                      )}
                      <h3 className="font-serif font-semibold text-zinc-900 leading-snug text-base">
                        {servicio.titulo}
                      </h3>
                    </div>
                    <p className="text-zinc-500 text-sm leading-relaxed flex-1">
                      {servicio.descripcion}
                    </p>
                    <button
                      onClick={() => abrirFormulario(servicio)}
                      className="mt-auto btn-secondary text-xs py-1.5 justify-center"
                    >
                      Solicitar cotización
                    </button>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA global */}
      <div className="mt-14 p-8 bg-brand-700 rounded-xl text-center text-white">
        <h2 className="font-serif font-semibold text-xl mb-2">
          ¿No encuentras lo que buscas?
        </h2>
        <p className="text-brand-200 text-sm mb-5 max-w-md mx-auto">
          Cuéntame sobre tu proyecto y exploraremos la mejor solución juntos.
        </p>
        <button
          onClick={() => abrirFormulario()}
          className="inline-flex items-center gap-2 bg-white text-brand-800 font-medium px-5 py-2.5 rounded-sm text-sm hover:bg-brand-50 transition-colors"
        >
          Contactar directamente
        </button>
      </div>

      {/* Modal de cotización: <dialog> nativo (siempre en el DOM, se abre con showModal). */}
      <dialog
        ref={dialogRef}
        aria-labelledby="modal-titulo"
        onClose={alCerrar}
        {...({ closedby: "any" } as Record<string, string>)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] p-0 bg-white rounded-xl shadow-2xl"
      >
            <div className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-6 py-4 flex items-start justify-between">
              <div>
                <h1 id="modal-titulo" className="font-serif font-semibold text-zinc-900 text-base">
                  Solicitar cotización
                </h1>
                {servicioSeleccionado && (
                  <p className="text-xs text-zinc-500 mt-0.5">{servicioSeleccionado.titulo}</p>
                )}
              </div>
              <button
                onClick={cerrarModal}
                className="text-zinc-500 hover:text-zinc-800 transition-colors ml-4 text-xl leading-none min-w-6 min-h-6"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Honeypot — invisible para humanos */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="absolute opacity-0 pointer-events-none w-0 h-0"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cot-nombre" className="block text-xs font-medium text-zinc-600 mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nombreRef}
                    id="cot-nombre"
                    name="nombre"
                    type="text"
                    required
                    maxLength={100}
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="input"
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="cot-correo" className="block text-xs font-medium text-zinc-600 mb-1">
                    Correo electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="cot-correo"
                    name="correo"
                    type="email"
                    spellCheck={false}
                    required
                    maxLength={200}
                    value={form.correo}
                    onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                    className="input"
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cot-org" className="block text-xs font-medium text-zinc-600 mb-1">
                  Organización / institución
                </label>
                <input
                  id="cot-org"
                  type="text"
                  maxLength={150}
                  value={form.organizacion}
                  onChange={(e) => setForm((f) => ({ ...f, organizacion: e.target.value }))}
                  className="input"
                  placeholder="Nombre de tu organización (opcional)"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label htmlFor="cot-tipo" className="block text-xs font-medium text-zinc-600 mb-1">
                  Tipo de servicio requerido
                </label>
                <input
                  id="cot-tipo"
                  type="text"
                  maxLength={150}
                  value={form.tipoServicio}
                  onChange={(e) => setForm((f) => ({ ...f, tipoServicio: e.target.value }))}
                  className="input"
                  placeholder="Ej. Evaluación de impacto, tesis doctoral…"
                />
              </div>

              <div>
                <label htmlFor="cot-desc" className="block text-xs font-medium text-zinc-600 mb-1">
                  Descripción del proyecto <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cot-desc"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="input resize-none"
                  placeholder="Describe tu proyecto, necesidades y contexto…"
                />
                <p className="text-xs text-zinc-500 mt-1 text-right">
                  {form.descripcion.length}/2000
                </p>
              </div>

              <div>
                <label htmlFor="cot-presupuesto" className="block text-xs font-medium text-zinc-600 mb-1">
                  Presupuesto estimado
                </label>
                <select
                  id="cot-presupuesto"
                  value={form.presupuesto}
                  onChange={(e) => setForm((f) => ({ ...f, presupuesto: e.target.value }))}
                  className="input"
                >
                  <option value="">Selecciona un rango (opcional)</option>
                  {PRESUPUESTO_OPCIONES.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              {resultado && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    resultado.ok
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                  role="alert"
                >
                  {resultado.mensaje}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="btn-primary flex-1 justify-center disabled:opacity-60"
                >
                  {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>

              <p className="text-xs text-zinc-500 text-center">
                Tu información es confidencial y solo se usará para responder tu consulta.
              </p>
            </form>
      </dialog>
    </>
  );
}
