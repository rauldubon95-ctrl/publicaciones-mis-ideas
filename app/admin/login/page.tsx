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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Panel Admin</h1>
        <p className="text-gray-500 text-sm mb-6">Ingresa la clave secreta para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Clave secreta"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {error && <p className="text-red-600 text-sm">Clave incorrecta</p>}
          <button type="submit" disabled={cargando} className="btn-primary w-full justify-center">
            {cargando ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
