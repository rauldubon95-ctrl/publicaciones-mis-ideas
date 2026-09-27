import Link from "next/link";
import { AUTOR, LIBROS_AUTOR } from "@/lib/autor";

// Bloque de enganche del autor para la barra lateral de la home.
// Presenta a Raúl Dubón, enlaza a "Sobre mí" y menciona la trilogía publicada
// (solo mención, sin enlaces externos). Server component presentacional.

export default function AutorDestacado() {
  const { nombre, titulo, bioCorta, foto } = AUTOR;

  return (
    <div className="border border-zinc-200 rounded-xl bg-white/70 p-5">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Sobre el autor
      </p>

      <div className="flex items-center gap-3 mb-3">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto}
            alt={nombre}
            className="w-12 h-12 rounded-full object-cover border border-zinc-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-700 flex items-center justify-center text-white text-lg font-serif font-semibold">
            {nombre.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-serif font-semibold text-zinc-900 leading-tight">{nombre}</p>
          <p className="text-xs text-brand-700">{titulo}</p>
        </div>
      </div>

      <p className="text-sm text-zinc-600 leading-relaxed mb-4">{bioCorta}</p>

      <Link
        href="/sobre-mi"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
      >
        Conóceme <span aria-hidden>→</span>
      </Link>

      <div className="mt-5 pt-4 border-t border-zinc-100">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">
          Trilogía publicada
        </p>
        <ul className="space-y-1.5">
          {LIBROS_AUTOR.map((libro) => (
            <li key={libro.titulo} className="text-xs text-zinc-500 leading-snug">
              <span className="text-zinc-700 font-medium">{libro.titulo}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
