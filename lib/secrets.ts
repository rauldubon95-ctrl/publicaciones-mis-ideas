// Acceso unificado a secretos.
// SESSION_SIGNING_SECRET y D1_SYNC_SECRET deben estar configuradas en Vercel
// y en el Worker de Cloudflare. ADMIN_PASSWORD acepta fallback a ADMIN_SECRET
// para no romper el acceso si solo está configurada la variable legacy.

// Lo que el humano escribe en el formulario de /admin/login.
export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SECRET;
}

// Firma cookies de sesión admin (`admin_auth`) y el token premium del
// asistente IA. Debe ser un valor aleatorio largo (>= 32 chars).
// El Worker también lo necesita como secret con el mismo nombre.
export function sessionSecret(): string | undefined {
  return process.env.SESSION_SIGNING_SECRET;
}

// Autentica los endpoints /sync y /telemetria del Worker desde Next.js.
// Debe configurarse idéntico aquí y en Cloudflare Worker.
export function d1SyncSecret(): string | undefined {
  return process.env.D1_SYNC_SECRET;
}
