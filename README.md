# Fitness Tracker

PWA personal (single-user, Android-only) para reemplazar un Excel de tracking de gimnasio y alimentación. Local-first: la app lee y escribe siempre en IndexedDB (Dexie) primero, y sincroniza append-only hacia Supabase cuando hay señal.

Ver `Architecture.md` (brief maestro del proyecto completo), `PLAN_FASE_1.md` (scaffold) y `PLAN_FASE_2.md` (catálogo de ejercicios + CRUD de plan) para el contexto completo.

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
  page.tsx             Home: redirige a /plan
  plan/                CRUD de rutina (routines → routine_days → routine_day_exercises)
  ejercicios/          Catálogo de ejercicios (búsqueda, filtro, alta de custom)
  manifest.ts          Manifest de la PWA (metadata API nativa de Next)
  sw.ts                Service worker (Serwist, solo precache)
  login/               Login por magic link
  auth/callback/       Canje de code por sesión

components/
  auth/AuthGuard.tsx    Guard de sesión offline-safe (getSession, no getUser) + seed de catálogo + BottomNav
  sync/SyncStatusBadge  Indicador "Al día" / "N pendientes"
  nav/BottomNav.tsx     Navegación inferior (Plan, Sesión*, Comidas*, Historial*, Ejercicios — *placeholder)
  exercises/            Búsqueda/filtro, picker, thumbnail con placeholder, alta de custom
  plan/                 Fila de ejercicio del día + form de targets
  ui/Modal.tsx          Modal genérico mobile-first

lib/
  db/                   Dexie: schema versionado + instancia tipada + write helpers (exercises, routines)
  supabase/             Clientes Supabase (browser, server, middleware)
  sync/                 Motor de sync (registry, engine, hooks) — push chunkeado en lotes de 500
  auth/session.ts        getLocalUserId() offline-safe
  utils/ids.ts            newId() = local_id = Supabase PK

types/entities.ts       Única fuente de tipos, compartida por Dexie y Supabase

data/
  exercises.seed.json    Catálogo completo (dataset traducido + curado), commiteado — lo importa la app
  exercises.curated.json Ejercicios del plan actual sin match exacto en el dataset (o con nombre propio)

scripts/
  build-exercise-seed.ts Regenera exercises.seed.json (ver sección "Catálogo de ejercicios")

supabase/
  migrations/            Archivos SQL, uno por tabla + limpiezas de fase, con RLS
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

## Catálogo de ejercicios

`data/exercises.seed.json` (commiteado al repo) es lo que la app importa a Dexie en el primer login de cada usuario (`bulkAdd` en una sola transacción, solo si no hay ejercicios con `source: 'seed'` todavía). Se genera combinando:

- El dataset **[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)** (~870 ejercicios en inglés, con imágenes) — licencia **Unlicense** (dominio público). Las imágenes se sirven directo desde `raw.githubusercontent.com`, sin hostear nada propio; si no hay red, el catálogo muestra el nombre igual (sin imagen).
- `data/exercises.curated.json`: los ejercicios exactos del plan actual, con nombre en español tal cual se usan hoy, mapeados a un equivalente del dataset cuando existe (heredan su imagen) o como entrada propia sin imagen cuando no.

Para regenerar `exercises.seed.json` (por ejemplo si el dataset upstream cambia):

```bash
# requiere OPENROUTER_API_KEY en .env.local
npx tsx scripts/build-exercise-seed.ts
```

El script descarga el dataset, traduce los nombres al español vía OpenRouter (batches de ~50, modelo configurable con `OPENROUTER_MODEL`) y mergea `exercises.curated.json` al final. Si el dataset no tiene la estructura esperada, el script aborta sin tocar el seed existente; si falla la traducción de algún batch, esos nombres quedan en inglés en vez de bloquear el resto.

## Cómo funciona el sync

- Todo registro local nace con `synced: 0` y un `id` generado en cliente (`crypto.randomUUID()`), que es también la PK en Supabase.
- El push (`lib/sync/syncEngine.ts`) hace `upsert(rows, { onConflict: "id" })` en lotes de 500 filas por tabla — reintentar nunca duplica filas, y el catálogo de ~800+ ejercicios no pega contra límites de payload.
- Se dispara al montar la app, al recuperar señal (`online`), y tras cada escritura local (evento `sync:requested`).
- Sin resolución de conflictos ni pull remoto→local en esta fase (un solo usuario, un solo dispositivo). Los deletes de `routines`/`routine_days`/`routine_day_exercises` son soft delete (`deleted_at`) — como el sync solo empuja upserts, "borrar" es un update más que reusa el mismo pipeline.

## Estado de esta fase

Fase 2 de 6: catálogo de ejercicios (seed + búsqueda + alta de custom) y CRUD de plan (rutina → días → ejercicios con targets). Log de sesión, historial y comidas llegan en fases posteriores — sus tabs en la navegación inferior son placeholders deshabilitados.
