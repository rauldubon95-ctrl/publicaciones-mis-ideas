"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/publicaciones", label: "Publicaciones" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-brand-600 tracking-tight">
          💡 Mis Ideas
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? "bg-brand-50 text-brand-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-2 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
