# Fitness Tracker

PWA personal (single-user, Android-only) para reemplazar un Excel de tracking de gimnasio y alimentación. Local-first: la app lee y escribe siempre en IndexedDB (Dexie) primero, y sincroniza append-only hacia Supabase cuando hay señal.

Ver `Architecture.md` (brief maestro del proyecto completo), `PLAN_FASE_1.md` (scaffold), `PLAN_FASE_2.md` (catálogo de ejercicios + CRUD de plan), `PLAN_FASE_3.md` (sesión + historial), `PLAN_FASE_4.md` (parse por lenguaje natural + voz) y `PLAN_FASE_5.md` (comidas + peso + métricas del día) para el contexto completo.

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
  sesion/              Elegir día / retomar sesión de hoy + log de sets (formulario o texto/voz), métricas y cardio
  comidas/             Registro de comidas por texto/voz + peso corporal + pasos del día (ver sección "Comidas y peso")
  historial/           Progresión por ejercicio, agrupada por sesión
  api/parse/           Endpoint server-side de parse por LLM (ver sección "Parse por lenguaje natural")
  manifest.ts          Manifest de la PWA (metadata API nativa de Next)
  sw.ts                Service worker (Serwist, solo precache)
  login/               Login por magic link
  auth/callback/       Canje de code por sesión

components/
  auth/AuthGuard.tsx    Guard de sesión offline-safe (getSession, no getUser) + seed de catálogo + SyncStatusBadge + BottomNav
  sync/SyncStatusBadge  Indicador "Al día" / "N pendientes" (montado en AuthGuard, visible en toda la app)
  nav/BottomNav.tsx     Navegación inferior (Plan, Sesión, Comidas, Historial, Ejercicios — los 5 tabs activos desde Fase 5)
  exercises/            Búsqueda/filtro, picker, thumbnail con placeholder, alta de custom
  plan/                 Fila de ejercicio del día + form de targets
  session/              Card de ejercicio con acordeón, fila de set (editar/borrar), draft precargado, métricas diarias, notas, cardio, registro por texto/voz (NlQuickLog/NlSetsDraft/NlInboxList)
  meals/                Header de día (navegación, flag de entrenamiento, pasos), composer de comida, item/detalle de comida
  weight/                Alta + lista con delta de peso corporal
  nl/NlTextInput.tsx    Input + mic + submit reusado por NlQuickLog y MealComposer (extraído en Fase 5)
  history/              Card de sesión con series y flecha de progresión
  ui/Modal.tsx          Modal genérico mobile-first

lib/
  db/                   Dexie: schema versionado + instancia tipada + write helpers (exercises, routines, sessions, dailyMetrics, nlInbox, meals, bodyWeight) + hooks de lectura
  supabase/             Clientes Supabase (browser, server, middleware)
  sync/                 Motor de sync (registry, engine, hooks, useOnline) — push chunkeado en lotes de 500
  parse/                Prompts, validación estructural de la respuesta del LLM, matching de ejercicio por texto, cliente de parse de comidas y derivación de porción (con tests)
  auth/session.ts        getLocalUserId() offline-safe
  utils/ids.ts            newId() = local_id = Supabase PK
  utils/parseLoad.ts      Normalización de carga sin LLM (con tests)
  utils/parseWeight.ts    Normalización de peso corporal (reusa parseLoad) + cálculo de delta (con tests)
  utils/dates.ts           todayLocalDate() / formatSessionDate() / addLocalDays() / localDayRangeIso() en zona local, no UTC (con tests)
  utils/setOrder.ts        nextSetOrder() compartido entre el formulario y el borrador de NL (con tests)
  utils/useSpeechRecognition.ts  Wrapper de Web Speech API (es-AR)

types/entities.ts       Única fuente de tipos, compartida por Dexie y Supabase

data/
  exercises.seed.json    Catálogo completo (dataset traducido + curado), commiteado — lo importa la app
  exercises.curated.json Ejercicios del plan actual sin match exacto en el dataset (o con nombre propio)

scripts/
  build-exercise-seed.ts Regenera exercises.seed.json (ver sección "Catálogo de ejercicios")

Tests: lib/**/*.test.ts (vitest, solo helpers puros — ver sección "Tests")

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

OPENROUTER_API_KEY=tu-openrouter-key
OPENROUTER_MODEL=deepseek/deepseek-chat
```

`OPENROUTER_API_KEY` y `OPENROUTER_MODEL` ya no son solo para el script de seed: `/api/parse` los usa en runtime (por eso la key **no** lleva prefijo `NEXT_PUBLIC_` — nunca viaja al cliente). Dar de alta ambas también en Vercel (Production y Preview).

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

## Tests

```bash
npm test          # corre una vez
npm run test:watch
```

Solo helpers puros (`lib/**/*.test.ts`) con [vitest](https://vitest.dev), `environment: "node"` — sin jsdom ni testing de UI/componentes. Cubre `lib/utils/parseLoad.ts` (normalización de carga sin LLM: `"190"` → `190`, `"62,5"` → `62.5`, `"40 kg"` → `40`; `"+10 kg de lastre"`, `"40 kg/lado"`, `"I10-D10"` → `null`, preservando siempre `load_raw` verbatim), `lib/parse/validateParseResult.ts` (validación estructural de la respuesta del LLM, casos válidos e inválidos), `lib/parse/matchExercise.ts` (matching de ejercicio por texto: acentos, ambigüedad, sin resultado), `lib/utils/setOrder.ts`, `lib/utils/dates.ts` (aritmética de fecha local — `addLocalDays`, `localDayRangeIso` — sin cruzar por UTC), `lib/parse/mealPortion.ts` (`derivePortion`: un solo ítem cuantificado promueve `portion_raw`/`portion_grams`, varios o ninguno quedan `null`) y `lib/utils/parseWeight.ts` (`parseBodyWeightKg` reusando `parseLoad` + rango de plausibilidad, `weightDeltas`).

## Parse por lenguaje natural

`app/api/parse/route.ts` recibe `{ kind: "sets" | "meal", text: string }`, valida la sesión de Supabase del request (401 sin sesión) y llama a OpenRouter con `temperature: 0` y un prompt por modo (`lib/parse/prompts.ts`). La respuesta se limpia de fences de markdown y se valida estructuralmente con `validateParseResult` — si no matchea el shape esperado, `422` con mensaje claro; el cliente ofrece reintentar, guardar para después o cargar manual. Timeout de ~15s (`AbortSignal.timeout`) para no colgar la UI del gym.

- `kind: "sets"` → `{ exercise_query, sets: [{ load_raw, reps, rir }] }`. La carga siempre vuelve verbatim como string — la normalización numérica la hace `parseLoad` en el cliente, nunca el LLM.
- `kind: "meal"` → `{ items: [{ name, quantity_raw }], structured_text }`, sin macros ni calorías (fuera de alcance v1). Consumido por `/comidas` vía `lib/parse/requestMealParse.ts` (ver sección "Comidas y peso").

En la pantalla de sesión, `NlQuickLog` es el input único "Registrar por texto" (con dictado por voz vía Web Speech API, `es-AR`, botón de micrófono oculto si el navegador no soporta la API o no hay señal). El resultado se muestra como borrador confirmable en `NlSetsDraft` — ejercicio resuelto contra el catálogo local (`lib/parse/matchExercise.ts`, scoring simple con plegado de acentos) y series editables — nunca se guarda sin confirmación explícita.

```bash
curl -X POST http://localhost:3000/api/parse \
  -H 'Content-Type: application/json' \
  -d '{"kind":"sets","text":"prensa 190, 12-11-10, RIR 1"}'
# sin cookie de sesión -> 401
```

## Inbox offline

Si el parse falla por falta de señal, error de red o el endpoint no responde (502/504), el texto crudo se guarda igual en `nl_inbox` (`status: "pending"`) en vez de perderse — "nunca se pierde un registro". La pantalla de sesión muestra un badge discreto con la cantidad de pendientes (`NlInboxList`); cada ítem tiene botón "Procesar" (deshabilitado sin señal, mismo flujo de parse + borrador confirmable) y "Descartar". Sin procesamiento automático en background: el usuario siempre confirma.

**`nl_inbox` es exclusivo de sets.** Las comidas nunca pasan por ahí: `meals` ya tiene `raw_text NOT NULL` y `parse_status` nativos, así que una comida se guarda SIEMPRE e inmediatamente como fila de `meals` con el texto crudo, haya señal o no (`parse_status: "pending_parse"`). El parse por LLM es un enriquecimiento posterior que completa `structured_text` (+ `portion_raw`/`portion_grams`) y pasa `parse_status` a `"parsed"` — nunca una precondición para que el registro exista. La diferencia con sets es que un set necesita estructura (ejercicio + carga + reps) antes de poder guardarse como fila; una comida no.

## Comidas y peso

`/comidas` (Fase 5) tiene dos vistas por un segmented control en el header:

- **Día**: navegación de fecha (`addLocalDays`), toggle "Día de entrenamiento" y pasos del día. El toggle escribe `training_day_flag` en todas las comidas no borradas del día (`setDayTrainingFlag` en `lib/db/meals.ts`) y las comidas nuevas nacen con el valor vigente; un día sin comidas todavía guarda el toggle solo en estado local porque no hay dónde persistirlo. Los pasos usan el `upsertDailyMetrics` existente de Fase 3 (get-or-create por fecha, nunca fila nueva si ya existe).
  - El composer (`MealComposer`, sobre `NlTextInput`) guarda la comida de inmediato vía `createMeal` (`raw_text`, `parse_status: "pending_parse"`) y recién después, si hay señal, dispara `requestMealParse` → `applyMealParse` en segundo plano — sin bloquear el input para la próxima comida. Si el parse falla por lo que sea, la comida ya está guardada.
  - Cada comida muestra un chip discreto ("procesada" / "pendiente" / "sin procesar") y un botón "Procesar pendientes (N)" (visible con señal) que recorre las comidas `pending_parse` de todos los días, secuencialmente.
  - Tap sobre una comida abre el detalle: editar `raw_text` (re-dispara el parse y resetea a `pending_parse`) u hora, "No procesar" (pasa a `parse_status: "unparsed"`, estado terminal para no reintentar para siempre un texto que el LLM nunca va a parsear) y "Borrar" (soft delete).
- **Peso**: alta de peso corporal en kg (acepta coma o punto — `parseBodyWeightKg`, que reusa `parseLoad` y agrega un rango de plausibilidad 20–400 kg), notas opcionales, lista descendente con delta (↑/↓) contra la medición anterior (`weightDeltas`), edición in-place y borrado (soft delete) — cubre el caso de una medición duplicada por doble tap, que edit-in-place solo no resuelve.

## Cómo funciona el sync

- Todo registro local nace con `synced: 0` y un `id` generado en cliente (`crypto.randomUUID()`), que es también la PK en Supabase.
- El push (`lib/sync/syncEngine.ts`) hace `upsert(rows, { onConflict: "id" })` en lotes de 500 filas por tabla — reintentar nunca duplica filas, y el catálogo de ~800+ ejercicios no pega contra límites de payload.
- Se dispara al montar la app, al recuperar señal (`online`), y tras cada escritura local (evento `sync:requested`).
- Sin resolución de conflictos ni pull remoto→local en esta fase (un solo usuario, un solo dispositivo). Los deletes de `routines`/`routine_days`/`routine_day_exercises`/`logged_sets`/`meals`/`body_weight` son soft delete (`deleted_at`) — como el sync solo empuja upserts, "borrar" es un update más que reusa el mismo pipeline.
- `nl_inbox` sincroniza igual que el resto de las tablas: una fila recién creada suma al badge "N pendientes de sincronizar" aunque todavía esté `status: "pending"` (sin parsear) — son dos contadores distintos, uno de sync y otro de inbox sin procesar.

## Estado de esta fase

Fase 5 de 6: pantalla de comidas (registro por texto/voz con guardado inmediato + enriquecimiento LLM posterior, chip de estado, edición, borrado), peso corporal (alta, delta contra la medición anterior, edición, borrado) y pasos del día. Los 5 tabs de `BottomNav` quedan activos. Export a Excel y pulido de UX/PWA quedan para Fase 6.
