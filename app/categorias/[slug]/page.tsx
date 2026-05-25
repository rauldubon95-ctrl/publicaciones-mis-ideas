import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await prisma.categoria.findUnique({ where: { slug } });
  if (!cat) return {};
  return { title: cat.nombre };
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  const categoria = await prisma.categoria.findUnique({
    where: { slug },
    include: {
      publicaciones: {
        where: { publicado: true },
        orderBy: { publicadoAt: "desc" },
        include: {
          categoria: true,
          etiquetas: { include: { etiqueta: true } },
          _count: { select: { comentarios: true, reacciones: true } },
        },
      },
    },
  });

  if (!categoria) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-gray-600">Inicio</Link>
        <span>/</span>
        <span className="text-gray-600">{categoria.nombre}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{categoria.nombre}</h1>
      {categoria.descripcion && (
        <p className="text-gray-500 mb-8">{categoria.descripcion}</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {categoria.publicaciones.map((p) => (
          <PublicacionCard key={p.id} publicacion={p} />
        ))}
      </div>

      {categoria.publicaciones.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>No hay publicaciones en esta categoría.</p>
        </div>
      )}
    </div>
  );
}
