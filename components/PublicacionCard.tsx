import Link from "next/link";
import { formatFecha } from "@/lib/utils";

interface Props {
  publicacion: {
    slug: string;
    titulo: string;
    resumen: string;
    publicadoAt: Date | null;
    categoria: { nombre: string; slug: string } | null;
    etiquetas: { etiqueta: { nombre: string; slug: string } }[];
    _count?: { comentarios: number; reacciones: number };
  };
  variante?: "grid" | "destacado" | "lista";
}

// Paleta editorial por categoría — sin imágenes stock, composición cromática
// suave inspirada en portadas de libros/revistas académicas.
const PALETAS: Record<string, { bg: string; text: string; mark: string }> = {
  ideas:                { bg: "bg-linear-to-br from-rose-100 to-orange-50",  text: "text-rose-900",   mark: "text-rose-200" },
  "observacion-social": { bg: "bg-linear-to-br from-emerald-100 to-lime-50",  text: "text-emerald-900",mark: "text-emerald-200" },
  reflexion:            { bg: "bg-linear-to-br from-amber-100 to-yellow-50",  text: "text-amber-900",  mark: "text-amber-200" },
  "teoria-sociologica": { bg: "bg-linear-to-br from-indigo-100 to-sky-50",    text: "text-indigo-900", mark: "text-indigo-200" },
  proyectos:            { bg: "bg-linear-to-br from-orange-100 to-red-50",    text: "text-orange-900", mark: "text-orange-200" },
  metodologia:          { bg: "bg-linear-to-br from-slate-100 to-zinc-50",    text: "text-slate-900",  mark: "text-slate-200" },
  default:              { bg: "bg-linear-to-br from-stone-100 to-amber-50",   text: "text-stone-900",  mark: "text-stone-200" },
};

function paleta(slug: string | undefined) {
  return (slug && PALETAS[slug]) || PALETAS.default;
}

// Tiempo de lectura estimado — el resumen es un proxy razonable (200 wpm).
// Fallback conservador: 4 min.
function tiempoLectura(resumen: string): number {
  const palabras = resumen.trim().split(/\s+/).length;
  return Math.max(3, Math.min(12, Math.ceil(palabras / 30)));
}

export default function PublicacionCard({ publicacion: p, variante = "grid" }: Props) {
  const pal = paleta(p.categoria?.slug);
  const inicial = (p.titulo.trim().charAt(0) || "R").toUpperCase();
  const minutos = tiempoLectura(p.resumen);

  // Variante "destacado" — para hero, más grande
  if (variante === "destacado") {
    return (
      <article className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-zinc-200/60 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-200/40 transition-all">
        <Link href={`/publicaciones/${p.slug}`} className="block">
          <div className={`relative aspect-[16/10] ${pal.bg} overflow-hidden`}>
            <span className={`absolute -top-4 -right-2 font-serif text-[14rem] leading-none ${pal.mark} select-none`}>
              {inicial}
            </span>
            {p.categoria && (
              <span className={`absolute top-5 left-5 text-[10px] font-semibold uppercase tracking-widest ${pal.text}`}>
                {p.categoria.nombre}
              </span>
            )}
          </div>
        </Link>
        <div className="p-6 flex flex-col gap-3 flex-1">
          <Link href={`/publicaciones/${p.slug}`} className="block">
            <h2 className="text-2xl font-serif font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors leading-tight">
              {p.titulo}
            </h2>
          </Link>
          <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">{p.resumen}</p>
          <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-zinc-400">
            {p.publicadoAt && <time>{formatFecha(p.publicadoAt)}</time>}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 2" />
              </svg>
              {minutos} min
            </span>
          </div>
        </div>
      </article>
    );
  }

  // Variante "lista" — para índices sin miniatura destacada
  if (variante === "lista") {
    return (
      <article className="py-6 border-b border-zinc-100 last:border-0 flex gap-5 group">
        <Link href={`/publicaciones/${p.slug}`} className="shrink-0 w-24 sm:w-32 aspect-[4/3] rounded-lg overflow-hidden">
          <div className={`relative w-full h-full ${pal.bg} flex items-center justify-center`}>
            <span className={`font-serif text-5xl ${pal.mark} leading-none select-none`}>{inicial}</span>
          </div>
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          {p.categoria && (
            <Link
              href={`/categorias/${p.categoria.slug}`}
              className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 hover:text-amber-800 mb-1.5"
            >
              {p.categoria.nombre}
            </Link>
          )}
          <Link href={`/publicaciones/${p.slug}`}>
            <h2 className="text-lg font-serif font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors leading-snug mb-1">
              {p.titulo}
            </h2>
          </Link>
          <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2 mb-2">{p.resumen}</p>
          <div className="mt-auto flex items-center gap-3 text-xs text-zinc-400">
            {p.publicadoAt && <time>{formatFecha(p.publicadoAt)}</time>}
            <span aria-hidden>·</span>
            <span>{minutos} min de lectura</span>
          </div>
        </div>
      </article>
    );
  }

  // Variante "grid" — tarjeta editorial estándar (default)
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-white border border-zinc-200/60 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-200/40 transition-all">
      <Link href={`/publicaciones/${p.slug}`} className="block">
        <div className={`relative aspect-[4/3] ${pal.bg} overflow-hidden`}>
          <span className={`absolute -top-3 -right-1 font-serif text-[9rem] leading-none ${pal.mark} select-none`}>
            {inicial}
          </span>
          {p.categoria && (
            <span className={`absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-widest ${pal.text}`}>
              {p.categoria.nombre}
            </span>
          )}
        </div>
      </Link>
      <div className="p-5 flex flex-col gap-2.5 flex-1">
        <Link href={`/publicaciones/${p.slug}`} className="block">
          <h2 className="text-lg font-serif font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors leading-snug">
            {p.titulo}
          </h2>
        </Link>
        <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3">{p.resumen}</p>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-zinc-400">
          {p.publicadoAt && <time>{formatFecha(p.publicadoAt)}</time>}
          <span className="inline-flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 2" />
            </svg>
            {minutos} min
          </span>
        </div>
      </div>
    </article>
  );
}
