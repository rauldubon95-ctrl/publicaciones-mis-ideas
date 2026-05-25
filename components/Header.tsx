"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/publicaciones", label: "Publicaciones" },
  { href: "/recursos", label: "Recursos" },
  { href: "/comics", label: "Cómics" },
  { href: "/servicios", label: "Consultoría" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-serif font-semibold text-lg text-brand-800 tracking-tight">
          Mis Ideas
        </Link>
        <nav className="flex items-center gap-0.5">
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
      </div>
    </header>
  );
}
