import Link from "next/link";
import LibroForm from "@/components/LibroForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nuevo libro | Admin" };

export default function NuevoLibroPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/admin" className="hover:text-gray-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/libros" className="hover:text-gray-600">Libros</Link>
        <span>/</span>
        <span className="text-gray-600">Nuevo</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Agregar libro</h1>
      <LibroForm />
    </div>
  );
}
