import Link from "next/link";

// Panel lateral slim de la home con anuncios curados (artículos externos,
// conferencias, avisos). Server component presentacional. Los enlaces salen a
// destinos externos con rel="noopener nofollow" (buena práctica para salientes).

export interface NovedadItem {
  id: string;
  titulo: string;
  textoCorto: string | null;
  url: string;
  tipo: string;
}

const ETIQUETA: Record<string, string> = {
  articulo: "Artículo",
  conferencia: "Conferencia",
  aviso: "Aviso",
};

export default function NovedadesSidebar({ novedades }: { novedades: NovedadItem[] }) {
  if (novedades.length === 0) return null;

  return (
    <div className="lg:sticky lg:top-24">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Novedades
      </h2>
      <ul className="space-y-4">
        {novedades.map((n) => (
          <li key={n.id}>
            <Link
              href={n.url}
              target="_blank"
              rel="noopener nofollow"
              className="group block"
            >
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-1">
                {ETIQUETA[n.tipo] ?? "Novedad"}
              </span>
              <p className="text-sm text-zinc-700 leading-snug group-hover:text-brand-700 transition-colors">
                {n.titulo}
              </p>
              {n.textoCorto && (
                <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{n.textoCorto}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
