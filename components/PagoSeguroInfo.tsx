// Componente informativo mostrado junto a botones de pago (muros de pago,
// donaciones). Comunica al usuario final cómo funciona el cobro y qué datos
// se comparten — sin filtrar detalles técnicos (IDs internos, endpoints,
// webhooks, etc.) que pudieran ayudar a un atacante.
//
// Se usa como Server Component (no requiere estado ni JS).
export default function PagoSeguroInfo({
  variante = "muro",
}: {
  variante?: "muro" | "donacion";
}) {
  const esDonacion = variante === "donacion";

  return (
    <div className="border border-zinc-200 bg-white/60 rounded-xl p-4 text-xs text-zinc-600">
      <div className="flex items-start gap-3">
        {/* Ícono candado */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-800 text-sm mb-0.5">
            Pago seguro procesado por PayPal
          </p>
          <p className="leading-relaxed">
            {esDonacion
              ? "Tu aporte va directamente a PayPal. No vemos ni almacenamos tus datos de tarjeta."
              : "El cobro lo procesa PayPal. Nunca vemos ni almacenamos tus datos de tarjeta — solo tu correo, para enviarte el enlace de acceso."}
          </p>

          <details className="mt-3 group">
            <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 select-none inline-flex items-center gap-1 list-none [&::-webkit-details-marker]:hidden">
              <span className="underline underline-offset-2">Cómo funciona</span>
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <ul className="mt-3 space-y-2 text-zinc-500 leading-relaxed">
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                <span>
                  Al confirmar, serás redirigido a la pasarela de PayPal (marca reconocida internacionalmente).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                <span>
                  Puedes pagar con <strong>tarjeta de crédito o débito sin necesidad de crear una cuenta</strong> en PayPal.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                <span>
                  Los datos de tu tarjeta viajan cifrados directamente a los servidores de PayPal. Este sitio nunca los ve.
                </span>
              </li>
              {!esDonacion && (
                <>
                  <li className="flex items-start gap-2">
                    <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                    <span>
                      Después del pago, recibirás por correo un enlace personal para acceder al material.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                    <span>
                      Si pierdes el enlace, puedes escribir a{" "}
                      <a href="mailto:raul.dubon95@gmail.com" className="text-amber-700 hover:text-amber-900 underline">
                        raul.dubon95@gmail.com
                      </a>{" "}
                      y lo reenviamos.
                    </span>
                  </li>
                </>
              )}
              <li className="flex items-start gap-2">
                <span aria-hidden className="text-emerald-600 mt-0.5">✓</span>
                <span>
                  Los pagos aparecen en tu extracto como PayPal, con referencia a este sitio.
                </span>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
