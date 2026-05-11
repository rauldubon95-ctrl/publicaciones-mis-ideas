# 🚀 Guía de Deploy — Sin programación

Sigue estos pasos en orden. Solo necesitas abrir páginas web.

---

## Paso 1 — Crear base de datos gratis en Supabase

1. Ve a **[supabase.com](https://supabase.com)** y crea una cuenta gratis
2. Haz click en **"New project"**
3. Pon un nombre (ej: `mis-ideas`) y una contraseña — **guarda esa contraseña**
4. Espera ~2 minutos a que el proyecto inicie
5. Ve a **Settings → Database → Connection string**
6. Selecciona **"URI"** en el menú y verás dos secciones:
   - Donde dice **Session mode (port 5432)** → copia esa URL, es tu `DIRECT_URL`
   - Donde dice **Transaction mode (port 6543)** → copia esa URL, es tu `DATABASE_URL`
7. En ambas URLs reemplaza `[YOUR-PASSWORD]` con la contraseña que guardaste

## Paso 2 — Crear las tablas

1. En Supabase, haz click en **"SQL Editor"** (menú izquierdo)
2. Haz click en **"New query"**
3. Abre el archivo [`supabase-setup.sql`](./supabase-setup.sql) en GitHub
4. Copia **todo** el contenido y pégalo en el editor
5. Haz click en **"Run"** — verás "Success"

## Paso 3 — Deploy en Vercel

1. Ve a **[vercel.com](https://vercel.com)** y crea una cuenta gratis (puedes entrar con GitHub)
2. Haz click en **"New Project"**
3. Selecciona el repositorio **`publicaciones-mis-ideas`**
4. Antes de hacer Deploy, haz click en **"Environment Variables"** y agrega estas 4 variables:

| Nombre | Valor |
|--------|-------|
| `DATABASE_URL` | La URL de Supabase **puerto 6543** |
| `DIRECT_URL` | La URL de Supabase **puerto 5432** |
| `ADMIN_SECRET` | Inventa una clave secreta, ej: `misideas2024` |
| `NEXT_PUBLIC_APP_URL` | Lo dejas vacío por ahora |

5. Haz click en **"Deploy"**
6. Espera ~2 minutos — Vercel te dará una URL como `https://mis-ideas-xxxx.vercel.app`
7. Copia esa URL y actualiza la variable `NEXT_PUBLIC_APP_URL` con ella

## ¡Listo! 🎉

- Tu sitio está en: `https://tu-app.vercel.app`
- El panel admin está en: `https://tu-app.vercel.app/admin`
- La clave del admin es la que pusiste en `ADMIN_SECRET`

---

> Cada vez que quieras hacer cambios, solo dile a Claude qué cambiar — él los sube a GitHub y Vercel se actualiza solo.
