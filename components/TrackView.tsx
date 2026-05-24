"use client";
import { useEffect } from "react";

type TipoContenido = "publicacion" | "recurso" | "comic";

export default function TrackView({
  tipo,
  contenidoId,
  // Compatibilidad con el prop anterior
  publicacionId,
}: {
  tipo?: TipoContenido;
  contenidoId?: string;
  publicacionId?: string;
}) {
  const tipoFinal = tipo ?? "publicacion";
  const idFinal = contenidoId ?? publicacionId ?? "";

  useEffect(() => {
    if (!idFinal) return;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoFinal, contenidoId: idFinal }),
    }).catch(() => {});
  }, [tipoFinal, idFinal]);

  return null;
}
