import Link from "next/link";
import { formatFecha } from "@/lib/utils";
import { serieDePublicacion } from "@/lib/series";
import { formatoMinutos } from "@/lib/lectura";

interface Props {
  publicacion: {
    slug: string;
    titulo: string;
    resumen: string;
    // unstable_cache serializa las fechas como texto: se aceptan ambos.
    publicadoAt: Date | string | null;
    categoria: { nombre: string; slug: string } | null;
    etiquetas?: { etiqueta: { nombre: string; slug: string } }[];
    _count?: { comentarios: number; reacciones: number };
  };
  /** Minutos de lectura calculados con el texto completo (lib/lectura). */
  minutos?: number;
  variante?: "grid" | "destacado" | "lista";
}

// Tarjeta tipográfica: sin portadas de relleno. El título es el protagonista;
// arriba, la serie a la que pertenece el texto (o su categoría). Toda la
// tarjeta es clicable mediante un único enlace "estirado" sobre el título
// (un solo destino por tarjeta para lectores de pantalla y teclado).
export default function PublicacionCard({ publicacion: p, minutos, variante = "grid" }: Props) {
  const enSerie = serieDePublicacion(p.slug);
  const href = `/publicaciones/${p.slug}`;
  const fecha = p.publicadoAt ? new Date(p.publicadoAt) : null;

  const rotulo = enSerie ? (
    <span className="text-amber-800">
      {enSerie.serie.titulo} <span aria-hidden="true">·</span> {enSerie.rotulo}
    </span>
  ) : p.categoria ? (
    <span>{p.categoria.nombre}</span>
  ) : null;

  const meta = (
    <>
      {fecha && <time dateTime={fecha.toISOString()}>{formatFecha(fecha)}</time>}
      {fecha && minutos ? <span aria-hidden="true"> · </span> : null}
      {minutos ? <span>{formatoMinutos(minutos)} de lectura</span> : null}
    </>
  );

  if (variante === "destacado") {
    return (
      <article className="group relative">
        {rotulo && <p className="text-sm text-zinc-600 mb-3">{rotulo}</p>}
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-zinc-900 text-balance">
          <Link href={href} className="after:absolute after:inset-0 decoration-1 underline-offset-[6px] group-hover:underline">
            {p.titulo}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-zinc-700 line-clamp-4 text-pretty">{p.resumen}</p>
        <p className="mt-5 text-sm text-zinc-500">{meta}</p>
      </article>
    );
  }

  if (variante === "lista") {
    return (
      <article className="group relative grid gap-1 py-7 border-t border-zinc-200 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8">
        <p className="text-sm text-zinc-500 sm:pt-1">
          {fecha && <time dateTime={fecha.toISOString()}>{formatFecha(fecha)}</time>}
        </p>
        <div className="min-w-0">
          {rotulo && <p className="text-sm text-zinc-600 mb-1.5">{rotulo}</p>}
          <h2 className="font-serif text-xl sm:text-2xl font-semibold leading-snug text-zinc-900 text-balance">
            <Link href={href} className="after:absolute after:inset-0 decoration-1 underline-offset-4 group-hover:underline">
              {p.titulo}
            </Link>
          </h2>
          <p className="mt-2 text-zinc-600 leading-relaxed line-clamp-2 text-pretty">{p.resumen}</p>
          {minutos ? <p className="mt-3 text-sm text-zinc-500">{formatoMinutos(minutos)} de lectura</p> : null}
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col border-t border-zinc-300 pt-5">
      {rotulo && <p className="text-sm text-zinc-600 mb-2">{rotulo}</p>}
      <h2 className="font-serif text-xl font-semibold leading-snug text-zinc-900 text-balance">
        <Link href={href} className="after:absolute after:inset-0 decoration-1 underline-offset-4 group-hover:underline">
          {p.titulo}
        </Link>
      </h2>
      <p className="mt-2 text-zinc-600 leading-relaxed line-clamp-3 text-pretty">{p.resumen}</p>
      <p className="mt-4 text-sm text-zinc-500">{meta}</p>
    </article>
  );
}
