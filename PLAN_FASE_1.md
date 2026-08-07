# Fase 1 — Scaffold: Next.js + PWA + Dexie + Supabase + capa de sync

## Contexto

`Architecture.md` es el brief maestro de una PWA personal (single-user, Android-only, español rioplatense) que reemplaza un Excel de tracking de gimnasio/nutrición. Esta es la Fase 1 de 6: solo scaffold — sin pantallas de features. El repo está vacío (solo `Architecture.md` y un `README.md` placeholder), así que todo es greenfield; no hay código ni convenciones existentes que reusar dentro de este repo.

El objetivo de esta fase es dejar la base técnica completa y verificable: proyecto instalable como PWA, schema de datos completo (local + remoto) derivado del dominio, auth por magic link, y una capa de sync local→remoto append-only e idempotente — todo demostrado con un loop dummy end-to-end. Las pantallas reales (catálogo, plan, sesión, comidas) llegan en fases posteriores.

Versiones verificadas contra el registro de npm al momento de planificar: `next@16.3.0`, `tailwindcss@4.3.3`, `@serwist/next@9.5.12` (peerDependency `next >= 14.0.0`, así que no hace falta bajar a Next 15 — la combinación es compatible).

## Bootstrap

`npx create-next-app@latest` con TypeScript, Tailwind, App Router, ESLint, **sin `src/`** (layout plano `app/ components/ lib/`, alias `@/*` — consistente con el proyecto hermano `lol-coach` que usa el mismo patrón de `lib/supabase/{client,server,middleware}.ts`). Tailwind v4 es CSS-first: `@import "tailwindcss";` en `globals.css`, sin `tailwind.config.ts` obligatorio.

## Estructura de carpetas

```
FitnessApp/
├── app/
│   ├── layout.tsx              # dark mode hardcodeado, envuelve SyncProvider + AuthGuard
│   ├── page.tsx                 # home: TestRecordForm + SyncStatusBadge
│   ├── globals.css
│   ├── manifest.ts              # Next metadata route → manifest.webmanifest
│   ├── sw.ts                    # Serwist SW source, solo precache
│   ├── login/page.tsx           # magic link
│   └── auth/callback/route.ts   # canjea code por sesión, redirige a "/"
├── components/
│   ├── auth/AuthGuard.tsx       # chequeo de sesión offline-safe (getSession, NUNCA getUser)
│   ├── sync/SyncStatusBadge.tsx
│   └── dev/TestRecordForm.tsx   # namespaced "dev" — se borra en fase 2+
├── lib/
│   ├── db/{index,schema}.ts     # Dexie: version(1).stores({...}), Table<T> tipados
│   ├── supabase/{client,server,middleware}.ts
│   ├── sync/{registry,syncEngine,useSyncStatus,useSyncTrigger}.ts
│   ├── auth/session.ts          # getLocalUserId() — offline-safe
│   └── utils/ids.ts             # newId() = crypto.randomUUID()
├── types/entities.ts            # única fuente de verdad de tipos (Dexie + Supabase)
├── proxy.ts                     # middleware renombrado a "proxy" en Next 16
├── supabase/
│   ├── README.md                # comandos para aplicar migrations
│   └── migrations/0001_exercises.sql … 0011_test_records.sql
├── public/icons/                # placeholders 192/512/512-maskable
├── next.config.ts               # withSerwistInit
└── .env.local.example
```

## PWA

- **Manifest**: nativo de Next (`app/manifest.ts`, metadata API) — sin paquete extra. Nombre, íconos placeholder, `theme_color` oscuro, `display: 'standalone'`.
- **Service Worker**: `@serwist/next` + `serwist` (no `next-pwa`, que está prácticamente sin mantenimiento y con problemas conocidos en App Router). `next.config.ts` envuelto con `withSerwistInit({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })`; `app/sw.ts` usa los presets de precache de Serwist únicamente — cero lógica custom de fetch/sync en el worker, tal como pide el brief.

## Schema de datos

Resolución del solapamiento sueño/sensación entre "sesión" y "métricas diarias" del brief: `daily_metrics` es una tabla propia por `(user_id, metric_date)` con `sleep_hours`, `feeling_1_10`, `steps` — cubre también días de descanso. `training_sessions.notes` queda solo para notas libres de la sesión de gimnasio.

Todas las tablas: `id UUID PRIMARY KEY` (generado en cliente, es también el `local_id` de Dexie — mismo valor, mismo campo, en ambos lados), `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `created_at TIMESTAMPTZ DEFAULT now()`. Solo en Dexie: `synced` como `0|1` (no boolean — indexado de forma más consistente en IndexedDB).

Entidades (11 tablas reales + `test_records` de esta fase):

| Tabla | Campos clave | Raw + normalizado |
|---|---|---|
| `exercises` | `name_es`, `name_en?`, `muscle_group`, `equipment?`, `image_url?`, `is_custom`, `source` | — |
| `routines` | `name`, `is_active` | — |
| `routine_days` | `routine_id`, `day_label`, `day_order`, `notes?` | — |
| `routine_day_exercises` | `routine_day_id`, `exercise_id`, `exercise_order`, `target_sets`, `target_reps_min/max`, `target_rir?`, `rest_seconds?`, `progression_notes?` | — |
| `training_sessions` | `routine_day_id?`, `session_date`, `started_at?`, `ended_at?`, `notes?` | — |
| `logged_sets` | `training_session_id`, `exercise_id`, `set_order`, `reps`, `rir?` | `load_raw` (NOT NULL) + `load_normalized_kg` (NULL) |
| `cardio_sessions` | `training_session_id?`, `session_date`, `activity_type`, `duration_minutes`, `distance_meters?` | `intensity_raw?` + `intensity_rpe?` |
| `meals` | `occurred_at`, `raw_text` (NOT NULL), `structured_text?`, `training_day_flag`, `parse_status` | `portion_raw?` + `portion_grams?` |
| `body_weight` | `measured_at`, `weight_kg` (NOT NULL), `notes?` | — (siempre numérico) |
| `daily_metrics` | `metric_date`, `sleep_hours?`, `feeling_1_10?`, `steps?`; unique `(user_id, metric_date)` | — |
| `test_records` | `note` | Fase 1 únicamente, se elimina al empezar fase 2 |

`types/entities.ts` define una interfaz TS por tabla; `lib/db/schema.ts` (stores de Dexie) y las migrations SQL derivan sus campos de ahí a mano (sin codegen esta fase).

## RLS — patrón único para las 11 migrations

```sql
ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<tabla>_owner_access" ON <tabla>
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

`id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (cliente siempre lo manda; el default es red de seguridad, `pgcrypto` viene habilitado por defecto en Supabase).

## Capa de sync

- **Idempotencia**: `id` = `local_id`, mismo valor en Dexie y Postgres. Push vía `supabase.from(table).upsert(rows, { onConflict: 'id' })` — reintentar nunca duplica.
- **Push directo browser → Supabase** (anon key, RLS como único gatekeeper), no proxiado por una API route — así el sync no depende de que Vercel esté disponible, solo de Supabase.
- `lib/sync/syncEngine.ts`: `pushPending()` recorre `registry.ts` (mapa de tablas locales↔remotas), lee `where('synced').equals(0)`, saca el campo `synced` del payload, hace upsert, y solo si tiene éxito marca `synced=1` localmente para esos ids. Mutex con boolean de módulo para evitar pushes solapados.
- **Backoff**: exponencial simple (`min(2^intentos * 1000ms, 60000ms)`), reset a 0 en éxito. `setTimeout`, explícitamente sin Background Sync API.
- **Triggers**: mount de la app, evento `online`, y evento custom `sync:requested` disparado tras cada escritura local (no-op si está offline).
- **Indicador UI**: `dexie-react-hooks` `liveQuery` contando `synced=0` en todas las tablas del registry, reactivo sin polling. "Al día" en 0, si no "`N` pendientes de sincronizar".

## Auth

- **Login** (`app/login/page.tsx`): input de email, `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
- **Callback** (`app/auth/callback/route.ts`): canjea `code` por sesión server-side, setea cookies, redirige a `/`.
- **Guard doble, a propósito**:
  - `proxy.ts` (server; Next 16 renombró la convención de `middleware.ts` a `proxy.ts`) refresca cookie de sesión — solo corre si hay request de red real a Vercel.
  - `components/auth/AuthGuard.tsx` (cliente) usa `supabase.auth.getSession()` — lee sesión persistida localmente **sin red**. Nunca `getUser()`, que valida el JWT contra el servidor y rompería el offline.
  - Motivo: con el shell precacheado por Serwist, un reload 100% offline nunca llega a Vercel — el SW sirve el HTML/JS cacheado y `proxy.ts` no corre. `AuthGuard` es quien decide, desde la sesión local, si renderiza la app o rebota a `/login`. Esto es lo que hace posible el criterio de aceptación "en modo avión la app abre".
- **`user_id` en escrituras locales**: `lib/auth/session.ts` expone `getLocalUserId()` (mismo `getSession()` offline-safe), usado por cada write helper antes de construir la fila de Dexie. Como el login requiere red por definición, siempre hay sesión persistida antes de que el usuario pueda llegar a un formulario offline.

## Paquetes

```
next, react, react-dom, typescript, @types/{node,react,react-dom}
tailwindcss, @tailwindcss/postcss, postcss
eslint, eslint-config-next
dexie, dexie-react-hooks
@supabase/supabase-js, @supabase/ssr
@serwist/next, serwist
```

No hace falta: `uuid` (Android Chrome soporta `crypto.randomUUID()` nativo), SheetJS (fase 6), SDK de OpenRouter/AI (fase 4).

## Home page demo

`components/dev/TestRecordForm.tsx`: formulario dummy que escribe un `test_record` en Dexie (`synced: false`, `user_id` de la sesión local, `id` nuevo), disparando `sync:requested`. `app/page.tsx` lo monta junto al `SyncStatusBadge` y una lista simple de los `test_records` locales con su estado de sync visible por fila.

## README

Al terminar: sección de estructura de carpetas, cómo correr local (`npm install`, `npm run dev`), env vars (`.env.local.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`), y cómo aplicar las migrations (`supabase/README.md` con comandos `supabase db push` o `psql`).

## Verificación (mapeada a los criterios de aceptación del usuario)

1. `npm run build` limpio — correr tras el scaffold y tras cada bloque agregado (TypeScript estricto detecta desalineación entre `types/entities.ts` y el uso real).
2. Instalable y standalone — deployar a Vercel (el prompt de instalación es poco confiable en localhost), instalar desde Chrome/Android, confirmar que abre sin barra de URL.
3. Modo avión: abre y guarda con `synced:false` — activar modo avión, relanzar la PWA instalada (cold start, para ejercitar el shell cacheado + `AuthGuard` offline), enviar el `TestRecordForm`, confirmar fila visible con estado "no sincronizado" y el badge en "N pendientes".
4. Recupera señal → sync solo, badge "Al día" — desactivar modo avión, esperar el evento `online` (o volver a foreground), chequear la fila en el Table Editor de Supabase, confirmar el badge.
5. Dos syncs seguidos no duplican — con un registro ya sincronizado, invocar `pushPending()` dos veces (botón dev temporal o consola), confirmar `select count(*) where id = '<id>'` = 1 en Supabase.
6. Magic link + RLS — completar el flujo de login con el email real, confirmar redirect autenticado a `/`; en SQL editor de Supabase confirmar `relrowsecurity = true` en las 11 tablas y que una query con anon key sin `Authorization` bearer devuelve cero filas.

## Archivos críticos a crear primero

- `types/entities.ts` (fuente de tipos)
- `lib/db/schema.ts` (Dexie)
- `supabase/migrations/0001_exercises.sql` (template del patrón RLS reusado en las otras 10)
- `lib/sync/syncEngine.ts`
- `components/auth/AuthGuard.tsx`
