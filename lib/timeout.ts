// Utilidades de timeout para llamadas a servicios externos (PayPal, Resend,
// Worker de IA/D1). Evitan que un tercero lento/caído deje colgada la función
// serverless hasta que la plataforma la mate. En todos los call-sites existentes
// el error ya se maneja (try/catch o chequeo de `error`), así que añadir el
// timeout NO cambia el camino feliz: solo convierte un cuelgue en un fallo
// limpio y acotado.

export class TimeoutError extends Error {
  constructor(ms: number, etiqueta = "operación") {
    super(`La ${etiqueta} excedió el tiempo límite de ${ms}ms`);
    this.name = "TimeoutError";
  }
}

// `fetch` con AbortController. Aborta la petición pasados `ms` milisegundos.
// Default 12s: holgado para PayPal (responde en 1-3s típicamente) pero acota
// cualquier cuelgue. Se puede pasar un valor menor para servicios internos.
export async function fetchConTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  ms = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Envuelve cualquier promesa (p. ej. una llamada de SDK que no acepta
// AbortSignal, como Resend) con un límite de tiempo. Si se excede, rechaza con
// `TimeoutError`. La promesa subyacente sigue su curso en segundo plano, pero el
// llamador ya no queda bloqueado.
export async function conTimeout<T>(
  promesa: Promise<T>,
  ms: number,
  etiqueta = "operación"
): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new TimeoutError(ms, etiqueta)), ms);
  });
  try {
    return await Promise.race([promesa, limite]);
  } finally {
    if (t) clearTimeout(t);
  }
}
