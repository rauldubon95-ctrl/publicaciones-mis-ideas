// Acceso unificado a secretos. Permite separar funciones del antiguo
// ADMIN_SECRET sin romper despliegues durante la transición: si la variable
// nueva no está configurada, cae al ADMIN_SECRET legacy.
//
// Una vez todas las variables nuevas estén configuradas en Vercel y el
// Worker de Cloudflare, ADMIN_SECRET puede eliminarse.

// Lo que el humano escribe en el formulario de /admin/login.
// Antes era el HMAC-secret completo (muy largo); ahora puede ser una
// contraseña humana corta.
export function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SECRET;
}

// Firma cookies de sesión admin (`admin_auth`) y el token premium del
// asistente IA. Debe ser un valor aleatorio largo (>= 32 chars).
// El Worker también lo necesita como secret con el mismo nombre.
export function sessionSecret(): string | undefined {
  return process.env.SESSION_SIGNING_SECRET ?? process.env.ADMIN_SECRET;
}

// Autentica los endpoints /sync y /telemetria del Worker desde Next.js.
// Debe configurarse idéntico aquí y en Cloudflare Worker.
export function d1SyncSecret(): string | undefined {
  return process.env.D1_SYNC_SECRET ?? process.env.ADMIN_SECRET;
}
