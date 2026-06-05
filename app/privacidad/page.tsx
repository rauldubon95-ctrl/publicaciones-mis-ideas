import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl, SITE_NAME } from "@/lib/seo";

const CONTACTO = process.env.ADMIN_EMAIL ?? "raul.dubon95@gmail.com";
const ACTUALIZADO = "5 de junio de 2026";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Cómo se recogen, usan y protegen tus datos en rauldubon.org. Política de minimización: recoger lo mínimo y protegerlo.",
  alternates: { canonical: canonicalUrl("/privacidad") },
  openGraph: {
    type: "article",
    title: "Aviso de privacidad — Raúl Dubón",
    description:
      "Cómo se recogen, usan y protegen tus datos en rauldubon.org.",
    url: canonicalUrl("/privacidad"),
    siteName: SITE_NAME,
    locale: "es_ES",
  },
};

export default function PrivacidadPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-zinc-600">Aviso de privacidad</span>
      </nav>

      <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-3">
        Aviso de privacidad
      </h1>
      <p className="text-sm text-zinc-400 mb-10">Última actualización: {ACTUALIZADO}</p>

      <div className="prose prose-zinc max-w-none prose-headings:font-serif prose-headings:font-semibold prose-a:text-brand-700">
        <p>
          Soy <strong>Raúl Dubón</strong> y este sitio (<strong>rauldubon.org</strong>) es
          mi espacio personal de divulgación académica. Mi política es sencilla:{" "}
          <strong>recoger los menos datos posibles y proteger los que necesito</strong>.
          Aquí te explico, sin tecnicismos, qué datos se manejan, para qué y cómo los cuido.
        </p>

        <h2>1. Quién es responsable</h2>
        <p>
          El responsable del tratamiento de tus datos soy yo, Raúl Dubón. Para cualquier
          consulta sobre privacidad o para ejercer tus derechos, escríbeme a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>

        <h2>2. Qué datos recojo y para qué</h2>
        <p>Solo recojo lo necesario para que el sitio funcione y para entregarte lo que pides:</p>
        <ul>
          <li>
            <strong>Tu correo y nombre</strong> — cuando compras un contenido, haces una
            donación, te suscribes al boletín o solicitas una cotización. Sirven para{" "}
            <em>entregarte tu compra</em>, <em>enviarte el enlace de acceso</em>,{" "}
            <em>responderte</em> o <em>mandarte novedades</em> si te suscribiste.
          </li>
          <li>
            <strong>Datos técnicos mínimos</strong> — al visitar una página se registra una
            vista con tu <em>país aproximado</em>, <em>tipo de dispositivo</em> (teléfono o
            computadora) y una <em>huella cifrada de tu IP</em> (un código irreversible, no
            tu IP real). Sirve para estadísticas básicas y para evitar abusos. No te
            identifica personalmente.
          </li>
        </ul>

        <h2>3. Lo que NO recojo ni guardo</h2>
        <ul>
          <li>
            <strong>Datos de tu tarjeta.</strong> Los pagos los procesa{" "}
            <strong>PayPal</strong>; yo <strong>nunca</strong> veo ni almaceno el número de
            tu tarjeta ni tus datos bancarios.
          </li>
          <li><strong>Contraseñas tuyas</strong> — no necesitas crear ninguna cuenta para usar el sitio.</li>
          <li><strong>Direcciones físicas ni teléfonos</strong> — no se piden.</li>
        </ul>

        <h2>4. Con quién se comparten</h2>
        <p>
          No vendo ni cedo tus datos a terceros con fines comerciales. Solo me apoyo en
          proveedores de confianza que tratan los datos en mi nombre, estrictamente para que
          el sitio funcione:
        </p>
        <ul>
          <li><strong>PayPal</strong> — procesar pagos y donaciones.</li>
          <li><strong>Resend</strong> — enviar correos (enlaces de acceso, confirmaciones, boletín).</li>
          <li><strong>Supabase</strong> — alojar la base de datos y los archivos.</li>
          <li><strong>Vercel</strong> — alojar el sitio web.</li>
          <li><strong>Cloudflare</strong> — el asistente de inteligencia artificial.</li>
        </ul>

        <h2>5. Cookies</h2>
        <p>
          Uso cookies <strong>solo funcionales</strong>, no publicitarias ni de rastreo de
          terceros:
        </p>
        <ul>
          <li>
            <strong>Cookies de acceso a compras</strong> — para recordar que ya pagaste un
            contenido y dejarte abrirlo sin volver a comprar.
          </li>
          <li><strong>Cookie de administración</strong> — solo para mi sesión de administrador.</li>
        </ul>

        <h2>6. Cómo protejo tus datos</h2>
        <ul>
          <li>Las <strong>huellas de IP se guardan cifradas</strong> (no la IP real).</li>
          <li>La base de datos está <strong>cerrada</strong>: tus datos no son accesibles públicamente.</li>
          <li>Toda la comunicación viaja <strong>cifrada (HTTPS)</strong>.</li>
          <li>Los <strong>datos de pago los maneja PayPal</strong>, no este sitio.</li>
        </ul>

        <h2>7. Cuánto tiempo los conservo</h2>
        <p>
          Conservo tus datos solo mientras hagan falta: los de tu suscripción, hasta que
          canceles; los de una compra o donación, el tiempo razonable para soporte y registro.
          Cuando ya no son necesarios, se eliminan.
        </p>

        <h2>8. Tus derechos</h2>
        <p>
          Puedes pedirme en cualquier momento <strong>acceder</strong> a los datos que tengo de
          ti, <strong>corregirlos</strong> o <strong>eliminarlos</strong>. Si te suscribiste al
          boletín, cada correo incluye un enlace para <strong>cancelar</strong> al instante.
          Para cualquier otra solicitud, escríbeme a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> y la atenderé.
        </p>

        <h2>9. Visitantes de otros países</h2>
        <p>
          Si me visitas desde la Unión Europea u otra región con normativa propia (como el
          RGPD), se respetan los mismos principios descritos aquí: minimización, consentimiento
          para el boletín, seguridad y tus derechos de acceso y eliminación.
        </p>

        <h2>10. Cambios a este aviso</h2>
        <p>
          Si actualizo este aviso, cambiaré la fecha del encabezado. Te recomiendo revisarlo
          de vez en cuando.
        </p>
      </div>
    </main>
  );
}
