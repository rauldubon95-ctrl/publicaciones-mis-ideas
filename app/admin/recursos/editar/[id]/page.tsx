import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RecursoForm from "@/components/RecursoForm";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar recurso | Admin" };

export default async function EditarRecursoPage({ params }: { params: { id: string } }) {
  const recurso = await prisma.recursoHtml.findUnique({ where: { id: params.id } });
  if (!recurso) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <nav className="text-xs text-zinc-400 mb-6 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/admin" className="hover:text-zinc-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/recursos" className="hover:text-zinc-600">Recursos</Link>
        <span>/</span>
        <span className="text-zinc-600">Editar</span>
      </nav>
      <h1 className="text-2xl font-serif font-semibold text-zinc-900 mb-8">Editar recurso</h1>
      <RecursoForm recurso={recurso} />
    </div>
  );
}
