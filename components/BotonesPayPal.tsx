"use client";
import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    paypal?: {
      HostedButtons: (config: {
        hostedButtonId: string;
      }) => { render: (selector: string) => void };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const BUTTON_ID = process.env.NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID ?? "";

export default function BotonesPayPal() {
  const [cargando, setCargando] = useState(true);
  const containerId = `paypal-container-${BUTTON_ID}`;

  if (!CLIENT_ID || !BUTTON_ID) {
    return (
      <p className="text-sm text-zinc-400 text-center py-6">
        Opciones de pago no disponibles en este momento.
      </p>
    );
  }

  return (
    <div>
      {cargando && (
        <div className="flex items-center justify-center gap-2 py-10 text-zinc-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando opciones de pago…
        </div>
      )}
      <div id={containerId} />
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=USD`}
        strategy="afterInteractive"
        onLoad={() => {
          setCargando(false);
          window.paypal
            ?.HostedButtons({ hostedButtonId: BUTTON_ID })
            .render(`#${containerId}`);
        }}
      />
    </div>
  );
}
