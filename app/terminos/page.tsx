import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl, SITE_NAME } from "@/lib/seo";

const CONTACTO = process.env.ADMIN_EMAIL ?? "raul.dubon95@gmail.com";
const ACTUALIZADO = "26 de septiembre de 2026";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Condiciones de uso de rauldubon.org: contenido, propiedad intelectual, el asistente de IA, compras y derechos de autor.",
  alternates: { canonical: canonicalUrl("/terminos") },
  openGraph: {
    type: "article",
    title: "Términos de uso — Raúl Dubón",
    description: "Condiciones de uso de rauldubon.org.",
    url: canonicalUrl("/terminos"),
    siteName: SITE_NAME,
    locale: "es_ES",
  },
};

export default function TerminosPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-zinc-600">Términos de uso</span>
      </nav>

      <h1 className="text-3xl font-serif font-semibold text-zinc-900 mb-3">
        Términos de uso
      </h1>
      <p className="text-sm text-zinc-400 mb-10">Última actualización: {ACTUALIZADO}</p>

      <div className="prose prose-zinc max-w-none prose-headings:font-serif prose-headings:font-semibold prose-a:text-brand-700">
        <p>
          Bienvenido a <strong>rauldubon.org</strong>. Este es mi espacio personal de
          divulgación académica. Al usar el sitio aceptas estas condiciones. Están
          escritas en lenguaje sencillo a propósito; si algo no te queda claro,
          escríbeme a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>

        <h2>1. Quién soy</h2>
        <p>
          El responsable de este sitio soy yo, <strong>Raúl Dubón</strong>, sociólogo,
          desde El Salvador. Publico artículos, libros, recursos y un asistente de
          inteligencia artificial sobre ciencias sociales.
        </p>

        <h2>2. Aceptación</h2>
        <p>
          Usar el sitio —leer, comprar, suscribirte o conversar con el asistente—
          implica que aceptas estos términos y el{" "}
          <Link href="/privacidad">aviso de privacidad</Link>. Si no estás de acuerdo,
          por favor no uses el sitio.
        </p>

        <h2>3. Uso permitido</h2>
        <p>
          Puedes leer y compartir enlaces al contenido libremente. No puedes usar el
          sitio para actividades ilegales, intentar vulnerar su seguridad, extraer datos
          de forma automatizada masiva, ni suplantar a otras personas.
        </p>

        <h2>4. Propiedad intelectual</h2>
        <p>
          <strong>Mi contenido</strong> (los artículos, libros y recursos de mi autoría)
          está protegido por derechos de autor. Puedes citarlo con atribución y enlazar a
          él, pero no reproducirlo íntegramente ni venderlo sin mi permiso por escrito.
        </p>
        <p>
          <strong>Contenido de terceros.</strong> Cuando cito o menciono obras de otras
          personas, lo hago con fines de estudio, crítica y comentario, respetando la
          autoría. Si eres titular de derechos y consideras que hay material tuyo usado
          indebidamente, mira la sección 9 (retirada de contenido): lo atenderé.
        </p>

        <h2>5. El asistente de inteligencia artificial</h2>
        <p>
          El sitio incluye un asistente automático que responde con base en{" "}
          <strong>mi propio contenido y en material de uso libre verificado</strong>. Ten
          en cuenta:
        </p>
        <ul>
          <li>
            Es una herramienta automática y <strong>puede equivocarse</strong> o dar
            respuestas incompletas. Verifica siempre la información importante en las
            fuentes.
          </li>
          <li>
            <strong>No es asesoría profesional</strong> (ni jurídica, médica, financiera
            ni de ningún tipo). No sustituye la consulta con un profesional.
          </li>
          <li>
            Las opiniones o análisis que genere no son necesariamente míos; son la salida
            de un modelo de lenguaje.
          </li>
          <li>
            Lo usas bajo tu propia responsabilidad. Sobre qué datos se manejan al
            conversar, ver el <Link href="/privacidad">aviso de privacidad</Link>.
          </li>
        </ul>

        <h2>6. Compras, pagos y reembolsos</h2>
        <p>
          Algunos contenidos (artículos, libros, recursos, tableros) son de pago. Los
          pagos los procesa <strong>PayPal</strong>; yo no manejo los datos de tu tarjeta.
          El contenido es digital y el acceso puede tener condiciones (por ejemplo, una
          ventana de tiempo o un número de descargas), que se indican al comprar. Si
          tienes un problema con una compra o necesitas un reembolso, escríbeme a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> y lo resolvemos.
        </p>

        <h2>7. Servicios de terceros</h2>
        <p>
          El sitio se apoya en proveedores (PayPal, Resend, Supabase, Vercel, Cloudflare)
          que tienen sus propias condiciones. No respondo por el funcionamiento o las
          políticas de servicios externos enlazados.
        </p>

        <h2>8. Límite de responsabilidad</h2>
        <p>
          El sitio y el asistente se ofrecen “tal cual”, con la mejor intención pero sin
          garantías de exactitud o disponibilidad continua. En la medida que lo permita la
          ley, no me hago responsable de daños derivados del uso del sitio o de decisiones
          tomadas con base en su contenido o en las respuestas del asistente.
        </p>

        <h2>9. Derechos de autor y retirada de contenido</h2>
        <p>
          Respeto los derechos de autor y espero lo mismo de quienes usan el sitio. Si
          eres titular de derechos y crees que algún contenido publicado aquí infringe los
          tuyos, escríbeme a <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a> con:
        </p>
        <ul>
          <li>tu identificación y la de la obra;</li>
          <li>el enlace o descripción exacta del contenido señalado;</li>
          <li>una declaración de que actúas de buena fe como titular o su representante.</li>
        </ul>
        <p>
          Revisaré la solicitud y, si procede, <strong>retiraré el contenido con
          prontitud</strong>.
        </p>

        <h2>10. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de <strong>El Salvador</strong>. Si me
          visitas desde otro país, se respetan además los principios de protección al
          usuario y de datos aplicables en tu región.
        </p>

        <h2>11. Cambios</h2>
        <p>
          Puedo actualizar estos términos; cuando lo haga, cambiaré la fecha del
          encabezado. Te recomiendo revisarlos de vez en cuando.
        </p>

        <h2>12. Contacto</h2>
        <p>
          Para cualquier duda sobre estos términos, escríbeme a{" "}
          <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>.
        </p>
      </div>
    </main>
  );
}
