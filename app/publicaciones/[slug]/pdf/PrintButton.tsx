"use client";
import { useEffect } from "react";

export default function PrintButton() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      className="bg-white text-brand-800 font-medium px-4 py-1.5 rounded text-sm hover:bg-brand-50 transition-colors"
    >
      Descargar PDF
    </button>
  );
}
