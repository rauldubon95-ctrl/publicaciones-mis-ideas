import { prisma } from "@/lib/prisma";
import PublicacionCard from "@/components/PublicacionCard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Publicaciones" };
export const dynamic = "force-dynamic";

export default async function PublicacionesPage() {
  const publicaciones = await prisma.publicacion.findMany({
    where: { publicado: true },
    orderBy: { publicadoAt: "desc" },
    include: {
      categoria: true,
      etiquetas: { include: { etiqueta: true } },
      _count: { select: { comentarios: true, reacciones: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Publicaciones</h1>
      <p className="text-gray-500 mb-8">{publicaciones.length} publicaciones</p>

      {publicaciones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>No hay publicaciones todavía.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {publicaciones.map((p) => (
            <PublicacionCard key={p.id} publicacion={p} />
          ))}
        </div>
      )}
    </div>
  );
}
