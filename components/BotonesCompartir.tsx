'use client';

import { useState } from "react";

interface Props {
  titulo: string;
  path: string;
}

export default function BotonesCompartir({ titulo, path }: Props) {
  const [copiado, setCopiado] = useState(false);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const urlEnc = encodeURIComponent(url);
  const tituloEnc = encodeURIComponent(titulo);
  const tituloUrlEnc = encodeURIComponent(`${titulo} ${url}`);

  const enlaces = [
    {
      nombre: "WhatsApp",
      href: `https://wa.me/?text=${tituloUrlEnc}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.52 3.48A11.93 11.93 0 0 0 12.04 0C5.49 0 .15 5.34.15 11.89c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.42-8.43zM12.04 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.23-.37a9.86 9.86 0 0 1-1.52-5.28c0-5.46 4.45-9.9 9.92-9.9 2.65 0 5.13 1.03 7 2.9a9.85 9.85 0 0 1 2.9 7c-.01 5.46-4.46 9.91-9.91 9.91zm5.43-7.42c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      ),
      colorHover: "hover:text-[#25D366] hover:border-[#25D366]",
    },
    {
      nombre: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${urlEnc}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99C18.34 21.13 22 16.99 22 12z"/>
        </svg>
      ),
      colorHover: "hover:text-[#1877F2] hover:border-[#1877F2]",
    },
    {
      nombre: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${urlEnc}&text=${tituloEnc}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      colorHover: "hover:text-zinc-900 hover:border-zinc-900",
    },
    {
      nombre: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${urlEnc}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/>
        </svg>
      ),
      colorHover: "hover:text-[#0A66C2] hover:border-[#0A66C2]",
    },
  ];

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  const claseBoton =
    "inline-flex items-center justify-center w-8 h-8 rounded border border-zinc-200 text-zinc-500 transition-colors";

  return (
    <div className="flex items-center gap-2 my-6">
      <span className="text-xs text-zinc-400 uppercase tracking-wider mr-1">
        Compartir
      </span>
      {enlaces.map((e) => (
        <a
          key={e.nombre}
          href={e.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Compartir en ${e.nombre}`}
          aria-label={`Compartir en ${e.nombre}`}
          className={`${claseBoton} ${e.colorHover}`}
        >
          {e.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copiarEnlace}
        title={copiado ? "¡Enlace copiado!" : "Copiar enlace"}
        aria-label="Copiar enlace al portapapeles"
        className={`${claseBoton} hover:text-brand-700 hover:border-brand-300`}
      >
        {copiado ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )}
      </button>
    </div>
  );
}
