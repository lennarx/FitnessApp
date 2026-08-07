# Fitness Tracker

PWA personal (single-user, Android-only) para reemplazar un Excel de tracking de gimnasio y alimentación. Local-first: la app lee y escribe siempre en IndexedDB (Dexie) primero, y sincroniza append-only hacia Supabase cuando hay señal.

Ver `Architecture.md` (brief maestro del proyecto completo) y `PLAN_FASE_1.md` (esta fase: scaffold) para el contexto completo.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Dexie.js sobre IndexedDB (fuente de verdad local)
- Supabase (Postgres + Auth con magic link + RLS)
- Serwist (service worker, solo precache de assets)
- Deploy: Vercel

## Estructura de carpetas

```
app/                  Rutas (App Router)
  layout.tsx           Dark mode + AuthGuard envolviendo toda la app
  page.tsx             Home: demo del loop completo (form + badge de sync)
  manifest.ts          Manifest de la PWA (metadata API nativa de Next)
  sw.ts                Service worker (Serwist, solo precache)
  login/               Login por magic link
  auth/callback/       Canje de code por sesión

components/
  auth/AuthGuard.tsx    Guard de sesión offline-safe (getSession, no getUser)
  sync/SyncStatusBadge  Indicador "Al día" / "N pendientes"
  dev/                  Componentes de scaffolding, se borran en fase 2+

lib/
  db/                   Dexie: schema versionado + instancia tipada
  supabase/             Clientes Supabase (browser, server, middleware)
  sync/                 Motor de sync (registry, engine, hooks)
  auth/session.ts        getLocalUserId() offline-safe
  utils/ids.ts            newId() = local_id = Supabase PK

types/entities.ts       Única fuente de tipos, compartida por Dexie y Supabase

supabase/
  migrations/            11 archivos SQL, uno por tabla, con RLS
  README.md              Cómo aplicar las migrations

proxy.ts                 Middleware (renombrado a "proxy" en Next 16), refresca sesión
```

## Correr local

```bash
npm install
cp .env.local.example .env.local   # completar con tu proyecto de Supabase
npm run dev
```

`npm run dev` y `npm run build` usan `--webpack` explícitamente: el plugin de Serwist (`@serwist/next`) integra vía config de webpack, y Next 16 usa Turbopack por defecto — sin el flag, el build falla.

## Env vars (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Aplicar las migrations de Supabase

Ver `supabase/README.md` — comandos con Supabase CLI (`supabase db push`) o `psql` directo.

## Cómo funciona el sync

- Todo registro local nace con `synced: 0` y un `id` generado en cliente (`crypto.randomUUID()`), que es también la PK en Supabase.
- El push (`lib/sync/syncEngine.ts`) hace `upsert(rows, { onConflict: "id" })` — reintentar nunca duplica filas.
- Se dispara al montar la app, al recuperar señal (`online`), y tras cada escritura local (evento `sync:requested`).
- Sin resolución de conflictos ni pull remoto→local en esta fase (un solo usuario, un solo dispositivo).

## Estado de esta fase

Fase 1 de 6: scaffold completo, sin pantallas de features (catálogo, plan, sesión, comidas llegan después). El home (`/`) es un demo dummy del ciclo local→sync→Supabase — se reemplaza en fase 2+.
