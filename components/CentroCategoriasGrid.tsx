import Link from "next/link";

interface Categoria {
  slug: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  _count: { publicaciones: number };
}

interface Props {
  categorias: Categoria[];
}

// Iconos SVG por defecto si la categoría no tiene icono configurado
const ICONO_DEFAULT = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

export default function CentroCategoriasGrid({ categorias }: Props) {
  const activas = categorias.filter((c) => c._count.publicaciones > 0);
  if (activas.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-100 pt-12">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-6">
        Explorar por categoría
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {activas.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categorias/${cat.slug}`}
            className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4
                       hover:border-brand-300 hover:shadow-sm transition-all duration-150"
          >
            {/* Ícono o emoji */}
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-100
                             text-zinc-500 group-hover:bg-brand-100 group-hover:text-brand-700
                             transition-colors text-xl leading-none">
              {cat.icono ? cat.icono : ICONO_DEFAULT}
            </span>

            {/* Nombre + contador */}
            <div>
              <p className="text-sm font-semibold text-zinc-800 leading-snug group-hover:text-brand-800 transition-colors">
                {cat.nombre}
              </p>
              {cat.descripcion && (
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">
                  {cat.descripcion}
                </p>
              )}
              <p className="text-xs text-zinc-300 mt-1.5 tabular-nums">
                {cat._count.publicaciones}{" "}
                {cat._count.publicaciones === 1 ? "publicación" : "publicaciones"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
