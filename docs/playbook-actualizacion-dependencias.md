# Playbook: actualización de dependencias ("piezas") — rauldubon.org

> Guía permanente para actualizar las dependencias del proyecto de forma
> **quirúrgica** y sin romper nada. Escrita para hacerlo **siempre acompañado de
> una sesión IA**, en pasos pequeños y reversibles. Si eres una sesión IA nueva:
> lee esto **y** `CLAUDE.md` antes de tocar nada.

---

## 1. Filosofía (las reglas de oro)

1. **Una pieza (o grupo pequeño) a la vez.** Nunca todo de golpe.
2. **Probar entre cada paso** (`tsc` + `build`). Si algo falla, sabes exactamente qué lo causó.
3. **Siempre en una rama nueva.** Nunca directo a `main`.
4. **NUNCA `npm audit fix --force`.** Puede "arreglar" una vulnerabilidad menor degradando una pieza grande (p. ej. bajar Next.js a una versión antigua) y romper todo.
5. **No actualizar justo antes** de necesitar el sitio estable (lanzamiento, campaña, etc.).
6. **Cada actualización = un commit aparte.** Así se revierte una sola sin afectar las demás.

---

## 2. Contexto del proyecto

- **Dos ecosistemas npm independientes**, se actualizan por separado:
  - La **web** → `package.json` en la raíz.
  - El **Worker de IA** → `workers/sociologia/package.json`.
- **Versiones (semver `X.Y.Z`):**
  - **Parche (`Z`)** → corrige bugs. Casi siempre seguro.
  - **Menor (`Y`)** → añade cosas sin romper. Suele ser seguro.
  - **Mayor (`X`)** → puede romper. **Leer el changelog** y probar a fondo.

---

## 3. Vulnerabilidades conocidas (al 2026-06-05)

`npm audit` reporta **4 moderadas, todas transitivas** (piezas de tus piezas):

| Pieza | Llega vía | Nota |
|---|---|---|
| `postcss` (<8.5.10) | `next` | XSS solo al estilizar CSS de terceros — no aplica a tu uso |
| `uuid` (<11.1.1) | `exceljs` | bounds check en un caso de `uuid` que no ejecutas |

**No** se arreglan con `--force` (degradaría Next.js a v9). Se resuelven **subiendo Next.js y exceljs** a versiones nuevas cuando toque (ver proceso abajo). Riesgo real: **bajo**.

---

## 4. Proceso paso a paso

```bash
# 1. Rama nueva
git checkout -b deps/actualizacion-YYYY-MM

# 2. Instalar y ver qué está atrasado
npm install
npm outdated          # lista: Current / Wanted / Latest

# 3. Empezar por lo seguro (parches y menores). Un paquete o grupo a la vez:
npm install <paquete>@<version>     # o `npm update <paquete>`

# 4. VERIFICAR (la web)
npx prisma generate
npx tsc --noEmit
npx next build

#    VERIFICAR (el Worker, si tocaste sus dependencias)
cd workers/sociologia && npx tsc --noEmit && cd ../..

# 5. Si pasa → commit de ESE cambio
git add -A && git commit -m "deps: sube <paquete> a <version>"

# 6. Repetir 3–5 con la siguiente pieza.
```

**7. Probar en Preview de Vercel.** Al hacer push de la rama, Vercel crea una URL de Preview. Abre y haz una **prueba de humo** (checklist abajo).

**8. Merge a `main` solo si todo está verde** (build + humo). Vercel/Cloudflare despliegan solos.

### Checklist de humo (probar en Preview tras actualizar)

- [ ] La home carga.
- [ ] Un artículo abre bien (`/publicaciones/...`).
- [ ] Un muro de pago se ve (un contenido premium en incógnito).
- [ ] `/donar` carga y el botón de PayPal aparece.
- [ ] Login de admin (`/admin/login`) funciona.
- [ ] `/admin/metricas` muestra datos.
- [ ] `/privacidad` carga.
- [ ] El asistente de IA responde (chat).

---

## 5. Casos especiales (mayores = sesión dedicada)

| Pieza | Qué vigilar al subir de versión mayor |
|---|---|
| **Next.js** (15 → 16…) | Cambios de App Router, `middleware.ts`, `next.config.mjs`, headers/CSP. Leer la guía oficial de migración. |
| **React** (19 → …) | Va de la mano con Next.js. |
| **Prisma** (5 → …) | Regenerar cliente, revisar `schema.prisma`, probar consultas. |
| **exceljs** | Probar subida/lectura de tableros Excel (`/admin/tableros`). |
| **Tailwind** | Revisar que los estilos no se rompan visualmente. |

---

## 6. Lo que NUNCA se hace

- ❌ `npm audit fix --force`
- ❌ Actualizar todas las piezas de golpe
- ❌ Actualizar sin correr `tsc` + `build`
- ❌ Mergear a `main` sin pasar por Preview

---

## 7. Reversión (si algo sale mal)

- Cada actualización es un commit aparte → `git revert <sha>` deshace solo esa.
- O `git reset --hard <commit-bueno>` en la rama.
- Como todo va en rama, `main` (producción) nunca se ve afectado hasta el merge.

---

## 8. Cadencia sugerida + Dependabot

- **Mensual:** Dependabot (`.github/dependabot.yml`) abre Pull Requests con las
  novedades. Revisa los de **parches/menores** con una sesión IA y mergéalos si
  pasan el proceso de arriba.
- **Trimestral (o cuando Dependabot abra un PR "major"):** encara una pieza
  mayor (Next/React/Prisma) en una **sesión dedicada**, con prueba de humo
  completa.

> Dependabot es el "vigilante": **te avisa** abriendo un PR cuando hay piezas
> nuevas. Tú decides; no actualiza nada solo sin tu merge.
