import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const FROM = process.env.FROM_EMAIL ?? "Raúl Dubón <noreply@rauldubon.org>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "raul.dubon95@gmail.com";

// ─── Plantillas HTML ──────────────────────────────────────────────────────────

function baseLayout(contenido: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raúl Dubón</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;overflow:hidden;">
        <!-- Cabecera -->
        <tr>
          <td style="padding:28px 40px 20px;border-bottom:1px solid #e4e4e7;">
            <a href="${BASE_URL}" style="text-decoration:none;font-size:20px;font-weight:600;color:#1e3a5f;font-family:Georgia,serif;">
              Raúl Dubón
            </a>
          </td>
        </tr>
        <!-- Cuerpo -->
        <tr>
          <td style="padding:32px 40px;">
            ${contenido}
          </td>
        </tr>
        <!-- Pie -->
        <tr>
          <td style="padding:20px 40px;background:#fafafa;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;font-family:sans-serif;text-align:center;">
              © ${new Date().getFullYear()} Raúl Dubón · <a href="${BASE_URL}" style="color:#6b7280;text-decoration:none;">rauldubon.org</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function htmlConfirmacion(token: string, nombre?: string | null): string {
  const url = `${BASE_URL}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
  const saludo = nombre ? `Hola <strong>${escapeHtml(nombre)}</strong>,` : "Hola,";
  return baseLayout(`
    <p style="font-size:16px;color:#3f3f46;margin:0 0 16px;">${saludo}</p>
    <p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">
      Gracias por suscribirte. Solo falta un paso: confirma tu correo para empezar a recibir
      una notificación cada vez que publique algo nuevo.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:6px;">
          <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;font-family:sans-serif;">
            Confirmar suscripción
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#71717a;margin:0 0 8px;font-family:sans-serif;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;margin:0 0 32px;">${url}</p>
    <p style="font-size:13px;color:#a1a1aa;margin:0;font-family:sans-serif;">
      Si no solicitaste esta suscripción, puedes ignorar este correo.
    </p>
  `);
}

export function htmlNuevaPublicacion(
  titulo: string,
  resumen: string,
  slug: string,
  token: string,
  nombre?: string | null
): string {
  const articuloUrl = `${BASE_URL}/publicaciones/${encodeURIComponent(slug)}`;
  const unsubscribeUrl = `${BASE_URL}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;
  const saludo = nombre ? `Hola <strong>${escapeHtml(nombre)}</strong>,` : "Hola,";
  return baseLayout(`
    <p style="font-size:16px;color:#3f3f46;margin:0 0 16px;">${saludo}</p>
    <p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">
      Publiqué algo nuevo que podría interesarte:
    </p>
    <h2 style="font-size:22px;font-weight:600;color:#18181b;margin:0 0 12px;line-height:1.3;font-family:Georgia,serif;">
      ${titulo}
    </h2>
    <p style="font-size:15px;line-height:1.7;color:#52525b;margin:0 0 28px;">
      ${resumen}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 40px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:6px;">
          <a href="${articuloUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;font-family:sans-serif;">
            Leer publicación →
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 20px;">
    <p style="font-size:12px;color:#a1a1aa;margin:0;text-align:center;font-family:sans-serif;">
      Recibiste este correo porque te suscribiste en rauldubon.org.<br>
      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Cancelar suscripción</a>
    </p>
  `);
}

export function htmlAccesoContenido(
  titulo: string,
  slug: string,
  token: string,
  nombre?: string | null
): string {
  const url = `${BASE_URL}/leer/${encodeURIComponent(token)}`;
  const saludo = nombre ? `Hola <strong>${escapeHtml(nombre)}</strong>,` : "Hola,";
  return baseLayout(`
    <p style="font-size:16px;color:#3f3f46;margin:0 0 16px;">${saludo}</p>
    <p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 0 24px;">
      Gracias por tu compra. Aquí tienes el enlace para acceder al artículo:
    </p>
    <h2 style="font-size:22px;font-weight:600;color:#18181b;margin:0 0 24px;line-height:1.3;font-family:Georgia,serif;">
      ${escapeHtml(titulo)}
    </h2>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:6px;">
          <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;font-family:sans-serif;">
            Abrir artículo →
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#71717a;margin:0 0 8px;font-family:sans-serif;">
      Si el botón no funciona, copia y pega este enlace en tu navegador:
    </p>
    <p style="font-size:12px;color:#a1a1aa;word-break:break-all;font-family:monospace;margin:0 0 32px;">${url}</p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 16px;">
    <p style="font-size:12px;color:#a1a1aa;margin:0;font-family:sans-serif;">
      Guarda este correo: el enlace funciona indefinidamente desde cualquier
      dispositivo. Al abrirlo, tu navegador recordará tu acceso a este artículo.
    </p>
    <p style="font-size:11px;color:#d4d4d8;margin:8px 0 0;font-family:sans-serif;">
      Artículo: <a href="${BASE_URL}/publicaciones/${encodeURIComponent(slug)}" style="color:#a1a1aa;">${BASE_URL}/publicaciones/${escapeHtml(slug)}</a>
    </p>
  `);
}

export function htmlNotificacionDonacion(
  montoUSD: string,
  nombreDonante: string,
  correoDonante: string | null,
  donacionId: string
): string {
  const adminUrl = `${BASE_URL}/admin/donaciones`;
  return baseLayout(`
    <p style="font-size:16px;color:#3f3f46;margin:0 0 8px;">
      <strong>Nueva donación recibida</strong> 🎉
    </p>
    <p style="font-size:14px;color:#71717a;margin:0 0 24px;font-family:sans-serif;">
      Esta es una notificación automática para el administrador.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin:0 0 24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#71717a;font-family:sans-serif;">Monto</p>
          <p style="margin:0 0 20px;font-size:28px;font-weight:600;color:#059669;font-family:Georgia,serif;">
            $${escapeHtml(montoUSD)} USD
          </p>
          <p style="margin:0 0 6px;font-size:13px;color:#71717a;font-family:sans-serif;">Donante</p>
          <p style="margin:0 0 16px;font-size:15px;color:#18181b;">
            ${escapeHtml(nombreDonante || "Anónimo")}
          </p>
          ${
            correoDonante
              ? `<p style="margin:0 0 6px;font-size:13px;color:#71717a;font-family:sans-serif;">Correo de contacto</p>
                 <p style="margin:0 0 16px;font-size:14px;color:#18181b;font-family:monospace;">${escapeHtml(correoDonante)}</p>`
              : ""
          }
          <p style="margin:0 0 6px;font-size:13px;color:#71717a;font-family:sans-serif;">ID de donación</p>
          <p style="margin:0;font-size:12px;color:#52525b;font-family:monospace;">${escapeHtml(donacionId)}</p>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="background:#1d4ed8;border-radius:6px;">
          <a href="${adminUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;font-family:sans-serif;">
            Ver en el panel de admin
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:#a1a1aa;margin:24px 0 0;font-family:sans-serif;">
      El pago ya fue procesado y capturado por PayPal. El monto aparecerá en tu cuenta Business según los tiempos habituales de PayPal.
    </p>
  `);
}

// ─── Funciones de envío ───────────────────────────────────────────────────────

export async function enviarConfirmacion(
  email: string,
  token: string,
  nombre?: string | null
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Confirma tu suscripción — Raúl Dubón",
      html: htmlConfirmacion(token, nombre),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function enviarEnlaceAccesoContenido(
  email: string,
  titulo: string,
  slug: string,
  token: string,
  nombre?: string | null
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Tu acceso a: ${titulo}`,
      html: htmlAccesoContenido(titulo, slug, token, nombre),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function enviarNotificacionDonacion(
  montoUSD: string,
  nombreDonante: string,
  correoDonante: string | null,
  donacionId: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `💰 Nueva donación de $${montoUSD} — ${nombreDonante || "Anónimo"}`,
      html: htmlNotificacionDonacion(montoUSD, nombreDonante, correoDonante, donacionId),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function enviarNuevaPublicacion(
  email: string,
  token: string,
  titulo: string,
  resumen: string,
  slug: string,
  nombre?: string | null
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${titulo} — Raúl Dubón`,
      html: htmlNuevaPublicacion(titulo, resumen, slug, token, nombre),
    });
    return !error;
  } catch {
    return false;
  }
}
