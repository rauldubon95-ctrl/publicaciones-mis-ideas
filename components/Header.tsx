"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/recursos", label: "Recursos" },
  { href: "/comics", label: "Cómics" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/servicios", label: "Consultoría" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cerrar menú al cambiar de ruta
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-serif font-semibold text-lg text-brand-800 tracking-tight">
          Mis Ideas
        </Link>

        {/* Nav escritorio */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === href
                  ? "text-brand-700 border-b-2 border-brand-600"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-4 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Admin
          </Link>
        </nav>

        {/* Botón hamburguesa — solo móvil */}
        <button
          className="sm:hidden p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
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

      {/* Menú móvil desplegable */}
      {open && (
        <nav className="sm:hidden border-t border-zinc-100 bg-white px-4 py-3 flex flex-col gap-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-brand-50 text-brand-700"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="px-3 py-2.5 rounded text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Admin
          </Link>
        </nav>
      )}
    </header>
  );
}
