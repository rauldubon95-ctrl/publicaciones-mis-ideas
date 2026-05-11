# 💡 Mis Ideas

Sistema de divulgación de reflexiones — Next.js 14 + Supabase + Vercel

## Stack

- **Framework**: Next.js 14 (App Router + TypeScript)
- **Base de datos**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Estilos**: Tailwind CSS
- **Deploy**: Vercel

## Funcionalidades

- Publicaciones con contenido Markdown
- Categorías y etiquetas
- Comentarios públicos
- Reacciones (👍 ❤️ 💡)
- Panel admin protegido por clave secreta

---

## Deploy en Vercel + Supabase

### 1. Crear base de datos en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Anota la contraseña de la base de datos
3. Ve a **Settings → Database → Connection string → URI**
4. Copia las dos URLs (puerto 6543 para `DATABASE_URL`, puerto 5432 para `DIRECT_URL`)

### 2. Configurar variables de entorno en Vercel

En tu proyecto de Vercel → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL de Supabase con puerto **6543** (pooler) |
| `DIRECT_URL` | URL de Supabase con puerto **5432** (directa) |
| `ADMIN_SECRET` | Una clave secreta que solo tú sepas |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` |

### 3. Conectar repositorio y hacer deploy

1. En Vercel → **New Project** → importa `rauldubon95-ctrl/publicaciones-mis-ideas`
2. Vercel detecta Next.js automáticamente
3. Haz click en **Deploy**

### 4. Crear las tablas y datos iniciales

Después del primer deploy exitoso, corre desde tu máquina local:

```bash
# Clona el repo y entra al directorio
git clone https://github.com/rauldubon95-ctrl/publicaciones-mis-ideas
cd publicaciones-mis-ideas

# Copia el archivo de variables y rellena con tus URLs de Supabase
cp .env.example .env

npm install
npx prisma db push        # crea las tablas en Supabase
npm run db:seed           # crea categorías y post de ejemplo
```

---

## Desarrollo local

```bash
cp .env.example .env      # rellena con tus credenciales de Supabase
npm install
npx prisma db push
npm run db:seed
npm run dev               # http://localhost:3000
```

Panel admin: `http://localhost:3000/admin`  
Clave: la que pusiste en `ADMIN_SECRET`
