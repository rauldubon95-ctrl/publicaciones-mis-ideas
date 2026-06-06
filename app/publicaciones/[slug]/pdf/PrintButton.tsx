"use client";
import { useEffect } from "react";

export default function PrintButton({ publicacionId }: { publicacionId: string }) {
  useEffect(() => {
    // Registrar descarga y luego imprimir
    fetch("/api/track/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicacionId }),
    }).catch(() => {});

    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, [publicacionId]);

  function handlePrint() {
    fetch("/api/track/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicacionId }),
    }).catch(() => {});
    window.print();
  }

  return (
    <button
      onClick={handlePrint}
      className="bg-white text-brand-800 font-medium px-4 py-1.5 rounded-sm text-sm hover:bg-brand-50 transition-colors"
    >
      Descargar PDF
    </button>
  );
}
