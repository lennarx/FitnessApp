# Fase 5 — Comidas + peso corporal + métricas del día

## Contexto

Fase 4 dejó el parse por LLM (`/api/parse`) funcionando con los dos modos del endpoint, pero solo `kind: "sets"` tiene UI. El modo `kind: "meal"` está implementado y testeado a nivel endpoint y sin pantalla — el README lo decía explícitamente ("la pantalla de comidas llega en Fase 5"). El tab **Comidas** del `BottomNav` era un `<span>` deshabilitado, y las tablas `meals`, `body_weight` y el campo `daily_metrics.steps` existían en Postgres y en Dexie desde Fase 1 sin que nada escribiera en ellas.

Esta fase cierra la tercera hoja del Excel original (comidas en texto libre con hora, porción, flag de entrenamiento y pasos) más la de peso corporal, y deja los 5 tabs activos.

**Decisión de diseño heredada del brief (no se rediscute):** las comidas **no** pasan por `nl_inbox`. `meals` ya tiene `raw_text NOT NULL` y `parse_status` nativos, así que una comida se guarda SIEMPRE e inmediatamente como fila de `meals` con el texto crudo, haya señal o no. El parse es un paso de **enriquecimiento posterior** que completa `structured_text` (+ `portion_raw`/`portion_grams`) y pasa `parse_status` a `parsed`. `nl_inbox` queda exclusivamente para sets, donde el registro sí necesita estructura (ejercicio + carga + reps) antes de poder existir como fila. Ver la sección "Comidas vs. inbox" del README para el detalle.

Fuera de alcance: macros/calorías, gráficos, recordatorios, fotos, export (Fase 6).

## Decisiones de diseño

1. **Peso corporal vive en `/comidas`**, detrás de un segmented control `Día | Peso` en el header. Sin tab nuevo (los 5 ya están asignados) y sin ensuciar el flujo diario de comidas.
2. **`training_day_flag` se maneja como valor del día**: un toggle en el header escribe el campo en todas las comidas no borradas del día, y las comidas nuevas de ese día nacen con ese valor. Un día sin comidas todavía guarda el toggle solo en estado local — no hay dónde persistirlo y aún no aplica a ninguna fila.
3. **`body_weight` recibe `deleted_at`** en la misma migration que `meals`: edit in-place no cubre el caso real de una medición duplicada por doble tap.
4. **`parse_status`**: la comida nace `pending_parse` (chip "pendiente") y pasa a `parsed`. `unparsed` se reusa como estado terminal "no procesar" (acción explícita en el detalle de la comida), para no reintentar para siempre un texto que el LLM nunca va a parsear.

## 1. Schema

### `supabase/migrations/0016_meals_soft_delete.sql`

```sql
alter table public.meals add column deleted_at timestamptz;
alter table public.body_weight add column deleted_at timestamptz;
```

Mismo patrón que `0013_routine_soft_delete.sql` / `0014_logged_sets_soft_delete.sql`: el sync es push-only (upsert on `id`, sin canal de delete), así que "borrar" es un update de campo más. Aplicada vía MCP de Supabase y verificada con `list_tables`.

### `types/entities.ts`

`deleted_at: string | null` agregado a `Meal` y a `BodyWeight`.

### Dexie — sin bump de versión

Columna no indexada en tablas existentes, mismo caso que Fase 3 (`deleted_at` en `logged_sets`). `lib/db/schema.ts` no se toca. `SYNCED_TABLES` ya incluía `meals`, `body_weight` y `daily_metrics`.

## 2. Helpers puros (con tests)

- `lib/utils/dates.ts` — `addLocalDays(date, n)` y `localDayRangeIso(date)` agregados, con `dates.test.ts` nuevo.
- `lib/parse/mealPortion.ts` — `derivePortion(items)`: un solo ítem con cantidad → `portion_raw`/`portion_grams`; varios ítems con cantidad → ambos `null` (ya vive en `structured_text`).
- `lib/utils/parseWeight.ts` — `parseBodyWeightKg(raw)` (reusa `parseLoad`, rango de plausibilidad 20–400 kg) y `weightDeltas(rows)`.

## 3. Cliente de parse compartido

`lib/parse/requestMealParse.ts` — envuelve `POST /api/parse` con `kind: "meal"`, resultado discriminado `{ ok, parsed | reason }`. Consumido por el composer y por "procesar pendientes".

## 4. Reuso del input de texto/voz

`components/nl/NlTextInput.tsx` — extraído de `NlQuickLog`: input + micrófono + submit, presentacional. `NlQuickLog` refactorizado para consumirlo; su máquina de estados (parse → inbox → borrador confirmable) no cambia. `MealComposer` lo usa con su propio flujo (guardar ya, enriquecer después).

## 5. Write helpers y hooks

- `lib/db/meals.ts` — `createMeal`, `applyMealParse`, `updateMealRawText` (resetea a `pending_parse`), `updateMealOccurredAt`, `skipMealParse`, `deleteMeal`, `setDayTrainingFlag`.
- `lib/db/bodyWeight.ts` — `createBodyWeight`, `updateBodyWeight`, `deleteBodyWeight`.
- `lib/db/useMeals.ts` — `useMealsForDay(date)`, `usePendingParseMeals()`.
- `lib/db/useBodyWeight.ts` — `useBodyWeightLog()`.
- Pasos del día: `upsertDailyMetrics(date, { steps })` existente, sin tocar.

## 6. Pantalla `/comidas`

- `app/comidas/page.tsx` — segmented control `Día | Peso`.
- `components/meals/DayHeader.tsx` — navegación de fecha, toggle de día de entrenamiento, input de pasos.
- `components/meals/MealComposer.tsx` — guarda ya (`createMeal`), enriquece después si hay señal.
- `components/meals/MealListItem.tsx` + `components/meals/MealDetailModal.tsx` — lista del día, ver/editar/borrar.
- Botón "Procesar pendientes (N)" — recorre `usePendingParseMeals()` secuencialmente.
- `components/weight/BodyWeightSection.tsx` — alta, lista con delta, edit in-place, borrar.

## 7. Navegación

`components/nav/BottomNav.tsx` — `/comidas` habilitado, los 5 tabs activos. Flag `enabled` y su rama muerta eliminados.

## Verificación

- `npm test`, `npm run build`, `npm run lint` limpios.
- Migration `0016` aplicada y verificada con `list_tables`.
- Manual: modo avión (comida guardada con chip "pendiente", persiste offline), "procesar pendientes" al volver la señal, voz de punta a punta, pasos no duplica fila en `daily_metrics`, peso `82,5` → `82.5` con delta correcto, borrar comida deja `deleted_at` en Supabase, toggle de día de entrenamiento aplica a todas las comidas del día.
