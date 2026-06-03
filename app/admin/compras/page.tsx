"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFecha } from "@/lib/utils";

interface Compra {
  id: string;
  emailComprador: string;
  nombreComprador: string | null;
  montoCentavos: number;
  moneda: string;
  estado: string;
  paypalOrderId: string | null;
  creadoAt: string;
  completadoAt: string | null;
  publicacion: { titulo: string; slug: string };
}

interface DatosAPI {
  compras: Compra[];
  totalRecaudado: number;
  totalCompletadas: number;
}

const ESTADOS = ["PENDIENTE", "COMPLETADO", "FALLIDO", "CANCELADO"] as const;
type Estado = (typeof ESTADOS)[number];

const ESTADO_ESTILOS: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-700",
  COMPLETADO: "bg-emerald-50 text-emerald-700",
  FALLIDO: "bg-red-50 text-red-700",
  CANCELADO: "bg-zinc-100 text-zinc-500",
};

type EstadoReenvio = { estado: "enviando" | "ok" | "error"; mensaje?: string };

export default function AdminComprasPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<DatosAPI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<string>("");
  const [reenvios, setReenvios] = useState<Record<string, EstadoReenvio>>({});

  const reenviarEnlace = useCallback(async (id: string) => {
    setReenvios((prev) => ({ ...prev, [id]: { estado: "enviando" } }));
    try {
      const r = await fetch(`/api/admin/compras/${id}/reenviar`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { email?: string; error?: string };
      setReenvios((prev) => ({
        ...prev,
        [id]: r.ok
          ? { estado: "ok", mensaje: `Enviado a ${d.email ?? "el comprador"}` }
          : { estado: "error", mensaje: d.error ?? "No se pudo reenviar" },
      }));
    } catch {
      setReenvios((prev) => ({
        ...prev,
        [id]: { estado: "error", mensaje: "Error de red" },
      }));
    }
  }, []);

  const cargar = useCallback(() => {
    setCargando(true);
    const params = filtro ? `?estado=${filtro}` : "";
    fetch(`/api/admin/compras${params}`)
      .then((r) => {
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json() as Promise<DatosAPI>;
      })
      .then((d) => {
        if (d) setDatos(d);
      })
      .finally(() => setCargando(false));
  }, [filtro, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-sm text-zinc-400 mb-6 flex items-center gap-1">
        <Link href="/admin" className="hover:text-zinc-600">
          Admin
        </Link>
        <span>/</span>
        <span className="text-zinc-600">Compras de contenido</span>
      </nav>

      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-zinc-900">
            Compras de contenido premium
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Pedidos de acceso a artículos de pago vía PayPal.
          </p>
        </div>
        {datos && (
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wider">
              Recaudado
            </p>
            <p className="text-2xl font-semibold text-emerald-700 tabular-nums">
              ${(datos.totalRecaudado / 100).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {datos.totalCompletadas} compras completadas
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFiltro("")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            filtro === ""
              ? "bg-zinc-900 text-white"
              : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Todas
        </button>
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setFiltro(e)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filtro === e
                ? "bg-zinc-900 text-white"
                : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-zinc-400 text-sm">Cargando…</p>
      ) : !datos || datos.compras.length === 0 ? (
        <div className="border border-dashed border-zinc-200 rounded-xl p-12 text-center">
          <p className="text-zinc-400 text-sm">
            No hay compras todavía
            {filtro ? ` con estado ${filtro}` : ""}.
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Artículo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Comprador
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {datos.compras.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                      {formatFecha(c.creadoAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-zinc-800 whitespace-nowrap">
                      ${(c.montoCentavos / 100).toFixed(2)}{" "}
                      <span className="text-xs font-normal text-zinc-400">
                        {c.moneda}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/publicaciones/${c.publicacion.slug}`}
                        className="text-brand-700 hover:underline text-sm"
                        target="_blank"
                      >
                        {c.publicacion.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {c.nombreComprador && (
                        <span className="font-medium">{c.nombreComprador}</span>
                      )}
                      {c.nombreComprador && " · "}
                      <a
                        href={`mailto:${c.emailComprador}`}
                        className="text-zinc-500 hover:text-brand-700 transition-colors text-sm"
                      >
                        {c.emailComprador}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge text-xs uppercase tracking-wider ${
                          ESTADO_ESTILOS[c.estado as Estado] ??
                          "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {c.estado === "COMPLETADO" ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <button
                            onClick={() => reenviarEnlace(c.id)}
                            disabled={reenvios[c.id]?.estado === "enviando"}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                          >
                            {reenvios[c.id]?.estado === "enviando" ? "Enviando…" : "Reenviar enlace"}
                          </button>
                          {reenvios[c.id]?.estado === "ok" && (
                            <span className="text-[11px] text-emerald-600">{reenvios[c.id]?.mensaje}</span>
                          )}
                          {reenvios[c.id]?.estado === "error" && (
                            <span className="text-[11px] text-red-600">{reenvios[c.id]?.mensaje}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
