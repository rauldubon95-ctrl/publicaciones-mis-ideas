"use client";
import { useEffect } from "react";

export default function TrackView({ publicacionId }: { publicacionId: string }) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicacionId }),
    }).catch(() => {});
  }, [publicacionId]);

  return null;
}
