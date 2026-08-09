# Fase 3 — Pantalla Sesión + Historial

## Contexto

Fases 1 y 2 dejaron la base (Dexie + Supabase + sync push-only) y el contenido estático de la app: catálogo de ~870 ejercicios y CRUD de rutina. Pero la app no registraba nada de lo que pasa en el gimnasio: `training_sessions`, `logged_sets`, `cardio_sessions` y `daily_metrics` existían como tablas y como tipos, y estaban en `SYNCED_TABLES`, pero ninguna línea de código escribía en ellas. Los tabs Sesión e Historial eran `<span>` deshabilitados.

Esta fase cierra ese hueco y es la que convierte el proyecto en algo usable: desde acá el Excel se puede empezar a abandonar, aunque falten comidas (Fase 5), parse por LLM (Fase 4) y export (Fase 6). El objetivo operativo es concreto — poder loggear una sesión Upper completa en modo avión, entre serie y serie, con ≤3 taps por serie.

Fuera de alcance: parse por LLM y voz, comidas/peso, export, gráficos, y edición de sets de sesiones ya cerradas.

## 1. Schema

### Migration `supabase/migrations/0014_logged_sets_soft_delete.sql`

```sql
alter table public.logged_sets add column deleted_at timestamptz;
```

Aplicada vía MCP y verificada con `list_tables`.

### Decisión: editar vs. borrar sets

- Editar → `update` in place, mismo `id`, `synced: 0`.
- Borrar → soft delete con `deleted_at`, mismo patrón que `routines`/`routine_days`/`routine_day_exercises` (el motor de sync es push-only, sin canal de DELETE).
- Ambas operaciones solo se ofrecen en la UI mientras `training_sessions.ended_at === null`. Sesión cerrada = solo lectura ("solo se registra hacia adelante en v1").

### `types/entities.ts`

`LoggedSet.deleted_at: string | null` agregado.

### Dexie — sin bump de versión

`deleted_at` no se indexa en ningún store del proyecto (los filtros de soft delete se hacen en memoria), así que `lib/db/schema.ts` no se toca. Los índices de v1 ya alcanzan: `training_sessions.session_date`, `logged_sets.training_session_id`, `logged_sets.exercise_id`, `daily_metrics.[user_id+metric_date]`. `lib/sync/registry.ts` tampoco se toca — las cuatro tablas ya estaban en `SYNCED_TABLES`.

## 2. Helpers puros

- `lib/utils/parseLoad.ts` — normalización sin LLM: `"190"` → `190`, `"62,5"`/`"62.5"` → `62.5`, `"40 kg"` → `40`; cualquier otra forma (`"+10 kg de lastre"`, `"40 kg/lado"`, `"I10-D10"`) → `null`.
- `lib/utils/dates.ts` — `todayLocalDate()` (fecha local, no UTC — una sesión nocturna en Argentina no debe cruzar de día) y `formatSessionDate()`.

## 3. Tests — vitest

Agregado solo para helpers puros (`lib/**/*.test.ts`, `environment: "node"`, sin jsdom). `npm test` corre `parseLoad.test.ts` con los casos numéricos y no-numéricos del brief.

## 4. Write helpers (`lib/db/`)

- `dailyMetrics.ts` — `upsertDailyMetrics(metricDate, patch)`: get-or-create por `(user_id, metric_date)` dentro de una transacción, usando el índice compuesto `[user_id+metric_date]`. Evita el duplicado que rompería el `unique` de Postgres si sueño y sensación se guardan por separado en sucesión rápida.
- `sessions.ts` — `getOrCreateTrainingSession(routineDayId)` (match exacto de `routine_day_id`, incluido `null`, para que sesión libre y de rutina coexistan el mismo día), `updateTrainingSession`, `endTrainingSession`, `createLoggedSet` (calcula `load_normalized_kg` con `parseLoad`), `updateLoggedSet` (recalcula el normalizado si cambia `load_raw`), `deleteLoggedSet` (soft delete), `createCardioSession` (`training_session_id` siempre `null` — el cardio es del día, no de la sesión de pesas).

## 5. Hooks de lectura (`lib/db/`)

- `useSessionLog(sessionId)` — ejercicios del día + sets de la sesión, join manual con `Promise.all` dentro de `useLiveQuery`.
- `useLastSessionSets(exerciseId, currentSessionId)` — sets de la última sesión anterior (excluye la actual), para el autocompletado.
- `useExerciseHistory(exerciseId)` — sesiones descendentes con `maxLoad` y `trend` (vs. la sesión inmediatamente anterior, `null` si cualquiera de las dos carece de carga numérica).
- `useLoggedExerciseIds()` — set de `exercise_id` con al menos un set no borrado, para acotar el picker de Historial.

## 6. Pantalla Sesión

- `app/sesion/page.tsx` — elegir día de la rutina activa o "Sesión libre"; retoma la sesión de hoy si ya existe; acceso directo a cardio.
- `app/sesion/[sessionId]/page.tsx` — métricas del día (colapsable), lista de `SessionExerciseCard`, notas, agregar ejercicio (reusa `ExercisePickerModal`), cardio, cerrar sesión.
- `SessionExerciseCard` — acordeón con targets, sets registrados (editables/borrables solo si la sesión sigue abierta) y un `SetDraftRow` con carga/reps precargados como `value` editable (match por número de serie contra la última sesión, cae a la última serie si faltan). Registrar una serie precargada: expandir + tocar "Registrar serie" = 2 taps.

## 7. Pantalla Historial

`app/historial/page.tsx` — selector de ejercicio acotado a los que tienen sets registrados, listado descendente agrupado por sesión, indicador de progresión (▲/▼/=) basado en `load_normalized_kg` máximo por sesión, sin indicador cuando la carga no es numérica.

## 8. Navegación

`/sesion` e `/historial` habilitados en `BottomNav`. `SyncStatusBadge` (existía desde Fase 1, huérfano) se monta por primera vez en `AuthGuard`, como header fino sobre todas las pantallas.

## Verificación

- `npm test` — 11 casos de `parseLoad` en verde.
- `npm run build` y `npm run lint` limpios.
- Migration `0014` aplicada y verificada en Supabase.
- Manual (Chrome/Android, modo avión): loggear una sesión completa, cargar métricas del día, cerrar sesión, reabrir offline, confirmar sync al recuperar señal, confirmar que editar la sensación dos veces no duplica fila en `daily_metrics`.
