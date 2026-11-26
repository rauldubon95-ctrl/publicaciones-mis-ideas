"use client";

import { useEffect, useId, useState } from "react";

interface Seccion {
  id: string;
  texto: string;
  nivel: 2 | 3;
}

// Índice del artículo, construido a partir de los encabezados ya renderizados
// en #cuerpo-articulo (los ids los pone la página al renderizar el Markdown).
// Resalta la sección que se está leyendo ("scrollspy"):
//  - Navegadores con `scroll-target-group` (Chrome 140+): lo hace el CSS con
//    :target-current; aquí solo se sincroniza aria-current al terminar el scroll.
//  - Resto (Safari, Firefox): IntersectionObserver añade la clase
//    .target-current y aria-current.
// Los estilos viven en globals.css (.indice-articulo).
export default function IndiceArticulo({ variante }: { variante: "escritorio" | "movil" }) {
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const idLista = useId();

  useEffect(() => {
    const cuerpo = document.getElementById("cuerpo-articulo");
    if (!cuerpo) return;
    const encabezados = [...cuerpo.querySelectorAll<HTMLElement>("h2[id], h3[id]")];
    setSecciones(
      encabezados.map((h) => ({
        id: h.id,
        texto: h.textContent?.trim() ?? "",
        nivel: h.tagName === "H2" ? 2 : 3,
      })),
    );
  }, []);

  useEffect(() => {
    if (secciones.length < 3) return;
    const nav = document.querySelector<HTMLElement>(`[data-indice="${variante}"]`);
    if (!nav) return;
    const enlaces = [...nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")];

    const marcar = (activo: HTMLAnchorElement | null) => {
      for (const a of enlaces) {
        const es = a === activo;
        a.classList.toggle("target-current", es);
        if (es) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      }
    };

    if (CSS.supports("scroll-target-group: auto")) {
      const sincronizar = () => marcar(nav.querySelector<HTMLAnchorElement>("a:target-current"));
      sincronizar();
      document.addEventListener("scrollend", sincronizar);
      return () => document.removeEventListener("scrollend", sincronizar);
    }

    const porId = new Map(enlaces.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) marcar(porId.get(e.target.id) ?? null);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const s of secciones) {
      const el = document.getElementById(s.id);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
  }, [secciones, variante]);

  // Un índice de 1–2 entradas no ayuda a navegar.
  if (secciones.length < 3) return null;

  const lista = (
    <ol id={idLista} className="indice-articulo-lista space-y-1.5 text-sm" hidden={variante === "movil" && !abierto}>
      {secciones.map((s) => (
        <li key={s.id} className={s.nivel === 3 ? "pl-4" : ""}>
          <a
            href={`#${s.id}`}
            onClick={() => variante === "movil" && setAbierto(false)}
            className="block border-l-2 border-transparent py-0.5 pl-3 -ml-px leading-snug text-zinc-600 hover:text-zinc-900"
          >
            {s.texto}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variante === "movil") {
    return (
      <nav aria-label="Índice del texto" data-indice="movil" className="indice-articulo mb-8 border-y border-zinc-200 py-3 lg:hidden">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={() => setAbierto((v) => !v)}
          className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-800"
        >
          <span>En este texto · {secciones.length} secciones</span>
          <svg aria-hidden="true" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="mt-3">{lista}</div>
      </nav>
    );
  }

  return (
    <nav aria-label="Índice del texto" data-indice="escritorio" className="indice-articulo max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pr-2">
      <p className="mb-3 text-sm font-medium text-zinc-900">En este texto</p>
      <div className="border-l border-zinc-200">{lista}</div>
    </nav>
  );
}
