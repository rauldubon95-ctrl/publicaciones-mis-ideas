import Link from "next/link";

// Enlaces a las secciones principales. En el footer (en todas las páginas)
// distribuyen enlazado interno hacia las secciones, lo que ayuda a que los
// buscadores las alcancen y las valoren.
const SECCIONES = [
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/libros", label: "Libros" },
  { href: "/recursos", label: "Recursos" },
  { href: "/comics", label: "Cómics" },
  { href: "/servicios", label: "Servicios" },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-zinc-200 mt-20">
      <nav className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="hover:text-brand-700 transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="font-serif italic">Raúl Dubón</span>
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} — Divulgación de reflexiones e ideas</span>
          <Link
            href="/privacidad"
            className="text-zinc-500 hover:text-zinc-800 underline underline-offset-2 transition-colors"
            title="Aviso de privacidad"
          >
            Privacidad
          </Link>
          <Link
            href="/donar"
            className="text-zinc-500 hover:text-amber-500 transition-colors"
            title="Apoya este proyecto"
          >
            ♥ Apoyar
          </Link>
        </div>
      </div>
    </footer>
  );
}
