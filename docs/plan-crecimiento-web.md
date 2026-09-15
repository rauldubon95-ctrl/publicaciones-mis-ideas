# Plan de crecimiento y experiencia — rauldubon.org

> Estado inicial (2026-09-15): sitio en producción, con buena base técnica
> (SEO/GEO, JSON-LD, sitemap, asistente IA con RAG). El problema declarado:
> **pocas visitas**. La hipótesis del autor —correcta— es que **la
> experiencia también es vital**. Este plan separa las dos cosas: atraer
> (visitas) y retener/convertir (experiencia).

---

## 0. Primero medir (sin esto, todo lo demás es a ciegas)

Hoy sabemos las vistas internas (`/admin/metricas`, ya arreglado) y el uso
del asistente (`/admin/observabilidad`, ya funcionando). **Lo que NO
sabemos** y necesitamos para priorizar:

- **De dónde vienen las visitas** (buscadores, redes, directo, referidos).
- **Qué páginas entran y cuáles retienen** (bounce, tiempo, scroll).
- **Rendimiento real** (Core Web Vitals) en móvil.

**Acción #1 (bloqueante para priorizar bien):** instalar una analítica de
tráfico respetuosa con la privacidad. Opciones:
- **Vercel Web Analytics** (un clic desde el panel de Vercel; ya usás Vercel).
- **Plausible / Umami** (sin cookies, liviano) si querés más detalle.

Con 2-3 semanas de datos reales priorizamos con evidencia, no con supuestos.
**Sin esto, lo de abajo es un menú razonable, no un orden garantizado.**

---

## 1. Experiencia (retener y convertir — "es vital")

La experiencia decide si la visita que tanto cuesta atraer **se queda,
vuelve y se suscribe**. Palancas, de mayor a menor impacto probable:

1. **Rendimiento en móvil.** La mayoría del tráfico de un sitio de
   contenido es móvil. Medir Core Web Vitals (LCP, INP, CLS) y atacar lo
   que salga rojo. La base ya es buena (Next 16, `next/font` self-hosted).
2. **Experiencia de lectura.** Es tu producto central. Tipografía cómoda,
   ancho de línea legible, buen contraste, el visor PDF fluido. Un artículo
   que se lee a gusto retiene; uno incómodo se abandona.
3. **El asistente IA como gancho.** Pocos sitios académicos en español
   tienen un asistente que responde citando el corpus real del autor. Bien
   ubicado (no escondido), con 2-3 preguntas sugeridas de ejemplo, es un
   diferenciador de experiencia y una razón para volver. (Su calidad sube
   con el chunking del corpus — ver `re-ingesta-corpus-chunking-diseno.md`.)
4. **Fricción de los muros de pago.** Revisar que el resumen público
   "enganche" antes del muro; que el muro explique claramente qué se recibe.
   Un muro que aparece demasiado pronto o sin contexto espanta.
5. **Navegación y descubrimiento.** Que desde un artículo sea fácil llegar
   a otro relacionado (ya hay "artículos relacionados"), a la categoría, al
   libro del mismo tema. Reducir callejones sin salida.
6. **Accesibilidad.** Foco visible, alt en imágenes, navegación por teclado.
   Es experiencia y además SEO.

## 2. Visitas (atraer — el problema declarado)

El contenido existe; el cuello es **distribución y descubribilidad**.

1. **Audiencia propia (lo más durable): el newsletter.** Ya tenés
   suscripción Double Opt-In. Convertir lectores en suscriptores es la
   palanca de crecimiento más sólida y menos dependiente de algoritmos.
   Acción: CTA de suscripción visible al final de cada artículo + un envío
   regular (quincenal) con lo nuevo. Un lector que se suscribe vuelve solo.
2. **SEO de cola larga.** La base técnica ya está. El siguiente nivel es
   **profundidad temática**: artículos que respondan preguntas concretas
   ("qué es la colonialidad del poder", "clases sociales en Centroamérica")
   y se enlacen entre sí formando autoridad sobre tus temas. Es donde un
   académico gana: nadie más cubre tu nicho con tu rigor.
3. **GEO (que te citen los asistentes de IA).** Tu `robots.txt` ya permite
   a ChatGPT/Perplexity/Claude. Contenido claro, bien estructurado y con
   datos citables aumenta la probabilidad de ser fuente en respuestas de
   IA — un canal de visitas nuevo que casi nadie está optimizando aún.
4. **Redes, con propósito.** Los botones de compartir ya están. Más que
   "publicar por publicar": convertir cada artículo en un hilo/resumen que
   aporte valor por sí mismo y enlace al original. (Tus skills de
   divulgación y psicología del contenido sirven justo para esto.)
5. **Comunidades donde ya está tu público.** Grupos académicos, listas,
   foros de ciencias sociales latinoamericanas. Un aporte genuino con
   enlace vale más que mil publicaciones frías.

## 3. Cadencia sostenible (sos un equipo de una persona)

Mejor poco y constante que un pico y silencio:

- **Semanal:** 1 pieza de contenido (artículo o resumen divulgativo).
- **Quincenal:** 1 envío de newsletter con lo nuevo.
- **Mensual:** revisar `/admin/metricas` + analítica → ¿qué temas traen y
  retienen gente? Doblar la apuesta en lo que funciona.

## 4. Decisiones / datos que necesito del autor para afinar

1. ¿Instalamos Vercel Web Analytics (rápido) o Plausible/Umami (más detalle)?
2. ¿Cuál es tu objetivo #1 real: suscriptores, lectores, o ventas?
3. ¿Dónde está hoy tu audiencia (qué redes/comunidades usás)?

Con eso convertimos este menú en un plan priorizado con metas medibles.

---

*Nota de honestidad: este plan se basa en las capacidades reales del sitio
(SEO/GEO, newsletter, asistente IA, muros de pago) documentadas en
CLAUDE.md. No incluye números de tráfico porque hoy no los tenemos medidos;
por eso la sección 0 es el primer paso.*
