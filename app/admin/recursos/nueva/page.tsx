import RecursoForm from "@/components/RecursoForm";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nuevo recurso | Admin" };

export default function NuevoRecursoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-xs text-zinc-400 mb-6 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/recursos" className="hover:text-zinc-600">Recursos</Link>
        <span>/</span>
        <span className="text-zinc-600">Nuevo</span>
      </nav>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-8">Nuevo recurso HTML</h1>
      <RecursoForm />
    </div>
  );
}
