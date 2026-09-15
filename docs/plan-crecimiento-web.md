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

## 5. Sugerencias concretas de mejora (ampliado)

> Esto son **recomendaciones** (opiniones fundadas en las capacidades reales
> del sitio, no hechos medidos). Cada una marca esfuerzo estimado
> (🟢 bajo · 🟡 medio · 🔴 alto) e impacto probable.

### 5.1 Ganancias rápidas — experiencia y confianza

1. **Propuesta de valor en la portada (above the fold).** 🟢 · impacto alto.
   Que en los primeros 3 segundos quede claro *quién es Raúl, qué va a
   encontrar el visitante y qué hacer* (leer / suscribirse / preguntarle al
   asistente). Muchos sitios académicos entierran esto y el visitante se va
   sin entender dónde está.
2. **Página "Sobre Raúl" con credenciales.** 🟢 · impacto alto (confianza +
   SEO). Formación, líneas de investigación, publicaciones, dónde ha sido
   citado. Google premia la autoría demostrable (E-E-A-T) y el lector confía
   más antes de pagar o suscribirse.
3. **Experiencia de lectura.** 🟢 · impacto medio. Tiempo estimado de
   lectura, barra de progreso, y al final del artículo un bloque "seguí
   leyendo" con 2-3 relacionados. Alarga la sesión y baja el rebote.
4. **Índice (tabla de contenidos) en artículos largos.** 🟢 · impacto medio.
   Tus piezas son extensas; un índice navegable mejora lectura y SEO
   (genera enlaces internos con ancla).
5. **Captura de newsletter no intrusiva.** 🟢 · impacto alto. CTA al final
   del artículo + un aviso discreto tras leer ~60%. La lista propia es tu
   activo más durable (no depende de algoritmos).

### 5.2 Contenido y adquisición (SEO / GEO)

6. **Páginas pilar / dossiers por tema.** 🟡 · impacto alto. Una guía
   profunda por eje ("Clases sociales", "Colonialidad del poder",
   "Sociología del deporte") que enlace a todos tus artículos del tema.
   Construye *autoridad temática*: es donde un académico con nicho propio
   le gana a medios grandes.
7. **Contenido tipo "¿qué es X?".** 🟡 · impacto alto (cola larga + GEO).
   Responder preguntas concretas es como busca la gente *y* como consultan
   los asistentes de IA. Cada concepto que dominás es una puerta de entrada.
8. **Enlazado interno sistemático.** 🟢-🟡. Que cada artículo enlace a 2-3
   relacionados y a su dossier. Reparte autoridad y mantiene al lector dentro.
9. **Reutilización / distribución.** 🟡. Cada artículo = un hilo para redes
   + un párrafo para el newsletter + un post para LinkedIn. El contenido ya
   existe; el cuello es que nadie lo ve. (Tus skills de divulgación y
   psicología del contenido sirven justo para esto.)
10. **Datos estructurados FAQ/HowTo** donde aplique. 🟢. Aumenta la chance de
    resultados enriquecidos en Google. La base JSON-LD ya está.

### 5.3 El asistente IA como producto (tu diferenciador)

11. **Darle entidad propia.** 🟡 · impacto alto. Una mini-landing que explique
    "preguntale al corpus de Raúl", con 3 preguntas de ejemplo clicables y el
    chat bien visible (no escondido en un ícono). Casi ningún sitio académico
    en español tiene esto: es razón para entrar *y* para volver.
12. **Tras el chunking**, que cite pasajes concretos (no solo títulos):
    sube la percepción de rigor y lo vuelve compartible ("mirá lo que me
    respondió sobre X").

### 5.4 Retención y monetización

13. **Membresía recurrente** (ya en CLAUDE.md §18). 🔴 · ingresos recurrentes.
    Suscripción que desbloquee biblioteca members-only + asistente sin
    límite. Convierte lectores fieles en ingreso estable (MRR).
14. **Lead magnet gratuito.** 🟡. Un PDF/guía fuerte a cambio del email.
    Crece la lista con gente realmente interesada en tus temas.
15. **Revisar la fricción de los muros de pago.** 🟢-🟡. Que el resumen
    público *enganche* y el muro explique claramente qué se recibe. Un muro
    que aparece muy pronto o sin contexto espanta más de lo que convierte.

### 5.5 Técnico / rendimiento / confianza

16. **Core Web Vitals en móvil.** 🟡 (requiere la analítica de la sección 0).
    La mayoría del tráfico de contenido es móvil; lo lento se abandona.
17. **Pasada de accesibilidad.** 🟡. Foco visible, alt en imágenes,
    navegación por teclado. Es experiencia y además SEO.
18. **Embudo de servicios/cotizaciones.** 🟢. Revisar que desde un artículo
    relevante haya un puente natural a `/servicios` (tu vía de ingresos por
    consultoría).

### 5.6 Si tuviera que elegir 3 para este mes

1. **Medir** (sección 0) — sin esto, todo lo demás es a ciegas.
2. **Página "Sobre Raúl" + propuesta de valor en portada** (#2 y #1) —
   confianza y claridad, esfuerzo bajo.
3. **Un dossier pilar** sobre tu tema más fuerte (#6) — la apuesta de SEO
   que mejor le sienta a un académico con nicho propio.

---

*Nota de honestidad: este plan se basa en las capacidades reales del sitio
(SEO/GEO, newsletter, asistente IA, muros de pago) documentadas en
CLAUDE.md. No incluye números de tráfico porque hoy no los tenemos medidos;
por eso la sección 0 es el primer paso.*
