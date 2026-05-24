# Mis Ideas — Plataforma de divulgación de Raúl Dubón

Plataforma web personal para publicar reflexiones, artículos académicos, recursos educativos y cómics. Incluye un asistente de IA especializado en ciencias sociales, construido sobre infraestructura propia.

**Producción:** [publicaciones-mis-ideas.vercel.app](https://publicaciones-mis-ideas.vercel.app)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Base de datos | PostgreSQL vía Supabase |
| ORM | Prisma |
| Almacenamiento de archivos | Supabase Storage |
| Estilos | Tailwind CSS |
| Deploy | Vercel |
| IA / Edge computing | Cloudflare Workers + Workers AI |
| Base de datos del Worker | Cloudflare D1 (SQLite) |
| Rate limiting | Cloudflare KV |

---

## Funcionalidades del sitio

### Contenido público
- **Publicaciones** — artículos con contenido Markdown, categorías, etiquetas y reacciones (👍 ❤️ 💡)
- **Recursos HTML** — documentos académicos descargables con tracking de descargas
- **Cómics** — visor de cómics por página con Supabase Storage
- **Comentarios anidados** — sistema de comentarios en publicaciones con hilos
- **Tarjeta de autor** — presentación del autor en cada publicación
- **Tracking de visitas** — deduplicación por IP para métricas reales

### Panel de administración (`/admin`)
- Crear, editar y eliminar publicaciones, recursos y cómics
- Importar documentos Word (.docx) y exportarlos como PDF maquetado
- Upload directo de imágenes desde el navegador a Supabase Storage
- Dashboard de métricas: visitas, descargas, reacciones por contenido
- Moderación de comentarios
- Log de eventos de seguridad

### Seguridad
- Middleware Edge Runtime con detección de bots y scanners
- Content Security Policy (CSP) estricta
- Autenticación del panel admin con HMAC-SHA256 (sin dependencias externas de auth)
- Headers de seguridad: HSTS, X-Frame-Options, X-Content-Type-Options
- Protección contra prompt injection en el asistente de IA
- Rate limiting por IP en el Worker

---

## Asistente de IA — Cloudflare Worker "sociologia"

Este es el componente técnicamente más complejo del proyecto.

### Qué hace

Un widget de chat flotante aparece en todas las páginas del sitio. Los visitantes pueden hacerle preguntas sobre los artículos y publicaciones de Raúl Dubón. El asistente responde basándose **únicamente** en los documentos académicos indexados, sin inventar información.

### Arquitectura del Worker

```
Navegador del visitante
        │
        │  POST { pregunta }
        ▼
Cloudflare Worker "sociologia"
  ├── Rate limiting (KV) ─── 5 consultas gratuitas/día por IP
  ├── Validación de token premium (acceso ilimitado para el autor)
  ├── Detección de prompt injection (16 patrones)
  ├── Búsqueda semántica simplificada en D1
  │     └── documentos indexados por palabras clave
  └── Llama 3.1 8B Instruct (Workers AI)
        └── Responde en español académico, máx. 250 palabras
              └── Solo con el contexto encontrado en D1
```

### Por qué es significativo

Conectar un LLM a una base de conocimiento propia no es trivial. El Worker resuelve varios problemas a la vez:

**1. Especialización del modelo**
Llama 3.1 8B es un modelo de propósito general. Para que responda *solo* sobre ciencias sociales y *solo* con las fuentes del autor, el Worker construye un prompt de sistema con instrucciones estrictas y el contexto recuperado de D1. Si no hay documentos relevantes, el modelo responde exactamente: *"No tengo información suficiente en mis fuentes actuales sobre ese tema."* — nunca inventa.

**2. Búsqueda de contexto en D1**
La base D1 contiene los documentos académicos indexados. El Worker extrae palabras clave de la pregunta del usuario, consulta D1 con matching por columna `palabras`, y construye un contexto de hasta 4 documentos (1.800 caracteres cada uno) para pasarle al modelo. El modelo solo "ve" ese contexto, no tiene acceso a internet ni a datos externos.

**3. Rate limiting sin base de datos externa**
El límite de 5 consultas gratuitas por día se implementa con Cloudflare KV usando una clave `rl:{ip}:{fecha}` con TTL de 24 horas. No requiere ninguna base de datos adicional ni servicio de terceros.

**4. Sistema de acceso premium**
El autor del sitio puede chatear sin límite. Cuando está logueado como admin en el panel, el frontend obtiene un token derivado criptográficamente del secreto de admin (HMAC-SHA256) desde `/api/asistente/token`. Ese token se envía como header `X-Premium-Token` al Worker, que lo valida contra el valor almacenado en KV y omite el rate limiting. El token nunca se expone en el código fuente ni en el frontend.

**5. Protección contra prompt injection**
16 patrones de regex detectan intentos de manipular al modelo (jailbreak, cambio de rol, solicitudes de revelar el system prompt, etc.). Las consultas que coinciden son rechazadas con HTTP 422 antes de llegar al LLM.

**6. CORS controlado**
El Worker solo acepta requests del dominio de producción y localhost. Cualquier otro origen recibe los mismos headers CORS pero las peticiones de dominios no autorizados no obtienen respuesta útil.

### Variables de entorno del Worker (Cloudflare)

| Binding | Tipo | Uso |
|---|---|---|
| `AI` | Workers AI binding | Inferencia con Llama 3.1 8B |
| `DB` | D1 Database | Documentos académicos indexados |
| `RATE_LIMIT` | KV Namespace | Rate limiting y token premium |

---

## Variables de entorno del sitio (Vercel)

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | URL de conexión a Supabase (pooler, puerto 6543) |
| `DIRECT_URL` | Sí | URL directa a Supabase (puerto 5432, para migraciones) |
| `ADMIN_SECRET` | Sí | Clave para el panel de administración |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Clave anon de Supabase (solo para Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio (solo en servidor, nunca en frontend) |

> El `ADMIN_SECRET` también se usa para derivar el token premium del asistente de IA. Cambiar este valor requiere actualizar el KV del Worker.

---

## Estructura del proyecto

```
app/
├── admin/               # Panel de administración protegido
├── api/
│   ├── admin/           # Endpoints de gestión de contenido
│   ├── asistente/token  # Token premium para el asistente de IA
│   ├── comentarios/     # Sistema de comentarios
│   ├── publicaciones/   # API pública de publicaciones
│   ├── reacciones/      # Sistema de reacciones
│   ├── recursos/        # API de recursos descargables
│   ├── seguridad/       # Log de eventos de seguridad
│   └── track/           # Tracking de visitas y descargas
├── comics/              # Sección de cómics
├── publicaciones/       # Listado y detalle de artículos
└── recursos/            # Sección de recursos HTML

components/
├── AsistenteChat.tsx    # Widget de chat con IA (flotante)
├── Header.tsx
├── Footer.tsx
└── ...

lib/
├── auth.ts              # Autenticación HMAC-SHA256 (Edge-compatible)
├── prisma.ts            # Cliente Prisma singleton
├── security.ts          # Utilidades de seguridad
└── adminAuth.ts         # Verificación de sesión admin

middleware.ts            # Bot detection, scan path blocking, auth guard
```

---

## Desarrollo local

```bash
git clone https://github.com/rauldubon95-ctrl/publicaciones-mis-ideas
cd publicaciones-mis-ideas
npm install
```

Crear `.env` con las variables listadas arriba, luego:

```bash
npx prisma db push    # crea las tablas en Supabase
npm run dev           # http://localhost:3000
```

Panel admin: `http://localhost:3000/admin`
