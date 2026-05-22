import { AUTOR } from "@/lib/autor";

export default function TarjetaAutor() {
  const { nombre, titulo, bio, formacion, especialidades, enlaces, foto } = AUTOR;

  const linksActivos = Object.entries(enlaces).filter(([, v]) => v.trim() !== "");

  const iconoEnlace: Record<string, string> = {
    orcid:        "ORCID",
    scholar:      "Scholar",
    linkedin:     "LinkedIn",
    researchgate: "ResearchGate",
    cv:           "CV ↓",
  };

  return (
    <aside className="border border-zinc-200 bg-zinc-50 p-6 mt-12">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-4">
        Sobre el autor
      </p>

      <div className="flex items-start gap-4">
        {/* Avatar / foto */}
        <div className="shrink-0">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={foto}
              alt={nombre}
              className="w-14 h-14 rounded-full object-cover border border-zinc-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-brand-700 flex items-center justify-center text-white text-xl font-serif font-semibold">
              {nombre.charAt(0)}
            </div>
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <p className="font-serif font-semibold text-zinc-900 leading-tight">{nombre}</p>
          <p className="text-xs text-brand-700 mt-0.5">{titulo}</p>

          {formacion.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1">{formacion.join(" · ")}</p>
          )}
        </div>
      </div>

      {/* Biografía */}
      <p className="text-sm text-zinc-600 leading-relaxed mt-4">{bio}</p>

      {/* Especialidades */}
      {especialidades.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {especialidades.map((e) => (
            <span
              key={e}
              className="text-[11px] bg-white border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full"
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {/* Enlaces académicos */}
      {linksActivos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {linksActivos.map(([key, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] border border-zinc-300 text-zinc-500 hover:border-brand-400 hover:text-brand-700 px-2.5 py-1 rounded transition-colors"
            >
              {iconoEnlace[key] ?? key}
            </a>
          ))}
        </div>
      )}
    </aside>
  );
}
