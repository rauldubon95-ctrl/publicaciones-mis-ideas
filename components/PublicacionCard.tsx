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
}

export default function PublicacionCard({ publicacion: p }: Props) {
  return (
    <article className="card p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {p.categoria && (
          <Link
            href={`/categorias/${p.categoria.slug}`}
            className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            {p.categoria.nombre}
          </Link>
        )}
        {p.etiquetas.map(({ etiqueta }) => (
          <span key={etiqueta.slug} className="badge bg-gray-100 text-gray-600">
            #{etiqueta.nombre}
          </span>
        ))}
      </div>

      <Link href={`/publicaciones/${p.slug}`} className="group">
        <h2 className="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors leading-tight">
          {p.titulo}
        </h2>
      </Link>

      <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{p.resumen}</p>

      <div className="flex items-center justify-between mt-1">
        <time className="text-xs text-gray-400">
          {p.publicadoAt ? formatFecha(p.publicadoAt) : "Sin publicar"}
        </time>
        {p._count && (
          <span className="text-xs text-gray-400 flex items-center gap-3">
            <span>💬 {p._count.comentarios}</span>
            <span>❤️ {p._count.reacciones}</span>
          </span>
        )}
      </div>
    </article>
  );
}
