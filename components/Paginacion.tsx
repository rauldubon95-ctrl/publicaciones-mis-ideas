import Link from "next/link";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  baseUrl: string;
}

export default function Paginacion({ paginaActual, totalPaginas, baseUrl }: Props) {
  if (totalPaginas <= 1) return null;

  const paginas: (number | "...")[] = [];

  if (totalPaginas <= 7) {
    for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
  } else {
    paginas.push(1);
    if (paginaActual > 3) paginas.push("...");
    const start = Math.max(2, paginaActual - 1);
    const end = Math.min(totalPaginas - 1, paginaActual + 1);
    for (let i = start; i <= end; i++) paginas.push(i);
    if (paginaActual < totalPaginas - 2) paginas.push("...");
    paginas.push(totalPaginas);
  }

  function urlPagina(p: number) {
    return p === 1 ? baseUrl : `${baseUrl}?pagina=${p}`;
  }

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-10"
      aria-label="Paginación de artículos"
    >
      {paginaActual > 1 ? (
        <Link
          href={urlPagina(paginaActual - 1)}
          className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded hover:border-zinc-400 transition-colors"
          aria-label="Página anterior"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm text-zinc-300 border border-zinc-100 rounded" aria-disabled>
          ← Anterior
        </span>
      )}

      {paginas.map((p, i) =>
        p === "..." ? (
          <span key={`elipsis-${i}`} className="px-2 py-1.5 text-sm text-zinc-400 select-none">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={urlPagina(p)}
            aria-current={p === paginaActual ? "page" : undefined}
            className={`px-3 py-1.5 text-sm border rounded transition-colors ${
              p === paginaActual
                ? "bg-brand-700 text-white border-brand-700 font-medium"
                : "text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {paginaActual < totalPaginas ? (
        <Link
          href={urlPagina(paginaActual + 1)}
          className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded hover:border-zinc-400 transition-colors"
          aria-label="Página siguiente"
        >
          Siguiente →
        </Link>
      ) : (
        <span className="px-3 py-1.5 text-sm text-zinc-300 border border-zinc-100 rounded" aria-disabled>
          Siguiente →
        </span>
      )}
    </nav>
  );
}
