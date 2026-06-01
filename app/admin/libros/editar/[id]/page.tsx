import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LibroForm from "@/components/LibroForm";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar libro | Admin" };

interface Props { params: Promise<{ id: string }> }

export default async function EditarLibroPage({ params }: Props) {
  const { id } = await params;
  const libro = await prisma.libro.findUnique({ where: { id } });
  if (!libro) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/admin" className="hover:text-gray-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/libros" className="hover:text-gray-600">Libros</Link>
        <span>/</span>
        <span className="text-gray-600">Editar</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Editar libro</h1>
      <LibroForm libro={libro} />
    </div>
  );
}
