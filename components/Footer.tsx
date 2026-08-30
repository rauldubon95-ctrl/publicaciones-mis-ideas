import Link from "next/link";
import SubscriptionForm from "./SubscriptionForm";

const NAVEGACION = [
  { href: "/", label: "Inicio" },
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/libros", label: "Libros" },
  { href: "/recursos", label: "Recursos" },
  { href: "/comics", label: "Cómics" },
];

const SECUNDARIO = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/servicios", label: "Consultoría" },
  { href: "/donar", label: "Apoyar" },
  { href: "/privacidad", label: "Privacidad" },
];

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-300 mt-24">
      {/* Bloque principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid gap-12 md:grid-cols-3">
        {/* Identidad */}
        <div>
          <p className="font-serif font-semibold text-2xl text-white tracking-tight">
            Raúl Dubón
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed mt-3 max-w-xs">
            Sociólogo. Investigador, docente y consultor. Un espacio para divulgar
            reflexiones, proyectos e ideas sobre lo social.
          </p>
          <div className="flex items-center gap-4 mt-6 text-zinc-500">
            <a
              href="https://twitter.com/raul_dubon"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/raul-dubon"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="mailto:raul.dubon95@gmail.com"
              className="hover:text-white transition-colors"
              aria-label="Correo electrónico"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Navegación */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
              Navegación
            </h3>
            <ul className="space-y-2">
              {NAVEGACION.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
              Más
            </h3>
            <ul className="space-y-2">
              {SECUNDARIO.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">
            Suscríbete al boletín
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            Recibe nuevas publicaciones, recursos y reflexiones directamente en tu correo.
          </p>
          <div className="footer-newsletter">
            <SubscriptionForm variant="dark" />
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>© {new Date().getFullYear()} Raúl Dubón. Todos los derechos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacidad" className="hover:text-zinc-300 transition-colors">
              Política de privacidad
            </Link>
            <Link href="/donar" className="hover:text-zinc-300 transition-colors">
              Apoyar el proyecto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
