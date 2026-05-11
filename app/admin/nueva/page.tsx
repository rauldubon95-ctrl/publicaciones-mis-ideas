import { prisma } from "@/lib/prisma";
import PublicacionForm from "@/components/PublicacionForm";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nueva publicación | Admin" };

export default async function NuevaPage() {
  const categorias = await prisma.categoria.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/admin" className="hover:text-gray-600">Admin</Link>
        <span>/</span>
        <span className="text-gray-600">Nueva publicación</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Nueva publicación</h1>
      <PublicacionForm categorias={categorias} />
    </div>
  );
}
