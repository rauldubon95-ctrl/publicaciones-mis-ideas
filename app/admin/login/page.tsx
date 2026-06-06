"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [clave, setClave] = useState("");
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError(true);
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4] px-4">
      <div className="bg-white border border-zinc-200 p-10 w-full max-w-sm">
        <div className="mb-8 border-b border-zinc-100 pb-6">
          <h1 className="text-2xl font-serif font-semibold text-zinc-900">Administración</h1>
          <p className="text-zinc-400 text-sm mt-1">Ingresa la clave de acceso para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
              Clave secreta
            </label>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              required
              autoFocus
              className="input"
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm border border-red-100 bg-red-50 px-3 py-2 rounded-sm">
              Clave incorrecta. Verifica e intenta de nuevo.
            </p>
          )}
          <button type="submit" disabled={cargando} className="btn-primary w-full justify-center py-2.5 mt-2">
            {cargando ? "Verificando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
