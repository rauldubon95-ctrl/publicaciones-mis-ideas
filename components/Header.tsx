"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/libros", label: "Libros" },
  { href: "/recursos", label: "Recursos" },
  { href: "/comics", label: "Cómics" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/servicios", label: "Consultoría" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [q, setQ] = useState("");
  const buscadorRef = useRef<HTMLInputElement>(null);

  // Cerrar menú y buscador al cambiar de ruta
  useEffect(() => {
    setOpen(false);
    setBuscando(false);
    setQ("");
  }, [pathname]);

  // Bloquear scroll del body cuando el menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Foco al buscador cuando se abre
  useEffect(() => {
    if (buscando) buscadorRef.current?.focus();
  }, [buscando]);

  function submitBusqueda(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/publicaciones?q=${encodeURIComponent(query)}`);
    setBuscando(false);
  }

  return (
    <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Marca */}
        <Link
          href="/"
          className="font-serif font-semibold text-xl text-zinc-900 tracking-tight shrink-0 relative group"
          aria-label="Raúl Dubón — Inicio"
        >
          Raúl Dubón
          <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-amber-600/80 group-hover:w-full transition-all duration-300"></span>
        </Link>

        {/* Nav escritorio — centrado */}
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center" aria-label="Navegación principal">
          {nav.map(({ href, label }) => {
            const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                  activo
                    ? "text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {label}
                {activo && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Acciones derechas */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Buscador */}
          {buscando ? (
            <form onSubmit={submitBusqueda} className="hidden sm:flex items-center gap-1">
              <input
                ref={buscadorRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => !q && setBuscando(false)}
                placeholder="Buscar publicaciones…"
                className="w-56 lg:w-72 border border-zinc-200 rounded-full px-4 py-1.5 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/60 focus:border-transparent"
                aria-label="Buscar publicaciones"
              />
              <button
                type="submit"
                className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                aria-label="Buscar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={() => setBuscando(true)}
              className="hidden sm:flex p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
              aria-label="Abrir buscador"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {/* Botón Suscribirme */}
          <Link
            href="/#suscribirme"
            className="hidden sm:inline-flex items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            Suscribirme
          </Link>

          {/* Botón hamburguesa — solo móvil/tablet */}
          <button
            className="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {open && (
        <nav className="lg:hidden border-t border-zinc-100 bg-white px-4 py-3 flex flex-col gap-1" aria-label="Navegación móvil">
          {nav.map(({ href, label }) => {
            const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  activo
                    ? "bg-amber-50 text-amber-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="mt-2 pt-3 border-t border-zinc-100 flex flex-col gap-2">
            <form onSubmit={submitBusqueda} className="flex gap-2">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="flex-1 border border-zinc-200 rounded-full px-4 py-2 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/60 focus:border-transparent"
                aria-label="Buscar publicaciones"
              />
              <button
                type="submit"
                className="p-2 text-zinc-500 hover:text-zinc-900"
                aria-label="Buscar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            <Link
              href="/#suscribirme"
              className="inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
            >
              Suscribirme
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
