# Fase 4 — Parse por lenguaje natural (LLM) + entrada por voz

## Contexto

Fase 3 dejó la sesión registrable pero por formulario: expandir el acordeón del ejercicio y cargar carga/reps/RIR campo por campo. El diferencial del brief (`Architecture.md` líneas 19, 37, 46) todavía no existía: registrar una serie con un solo campo de texto libre o dictado por voz, con el resultado estructurado por un LLM y confirmado por el usuario antes de guardar.

El endpoint `/api/parse` no existía (`app/` no tenía carpeta `api/`; el único route handler del repo era `app/auth/callback/route.ts`). OpenRouter se usaba solo offline, desde `scripts/build-exercise-seed.ts` — `.env.local.example` documentaba `OPENROUTER_API_KEY` como "not used by the app at runtime". Esta fase lo promueve a runtime server-only.

El punto delicado es que el parse es lo único de la app que requiere red, y el gimnasio es justamente donde no hay señal. Por eso la contraparte obligatoria del endpoint es la tabla `nl_inbox`: si el parse falla, el texto crudo se guarda igual y se procesa después. "Nunca se pierde un registro."

Fuera de alcance: pantalla de comidas y peso (Fase 5 — el modo `kind: "meal"` queda implementado y testeado a nivel endpoint, sin UI), export (Fase 6), macros/calorías, parse automático sin confirmación, streaming de respuestas del LLM, procesamiento en background del inbox.

## 1. Schema

### Migration `supabase/migrations/0015_nl_inbox.sql`

Mismo patrón que `0008_meals.sql`: `id`/`user_id`/`created_at` primero, `kind`/`raw_text`/`status` como `text` con `check`, RLS con una sola policy `nl_inbox_owner_access`, índices en `user_id` y `status`. Sin FKs a propósito: la fila sobrevive aunque no se sepa todavía a qué ejercicio o comida corresponde.

Aplicada vía MCP de Supabase y verificada con `list_tables`.

### `types/entities.ts`

`NlInbox extends BaseEntity` con `kind: "sets" | "meal"`, `raw_text: string`, `status: "pending" | "processed" | "discarded"`. Sin `deleted_at` — `status: "discarded"` ya cumple ese rol, y el sync es push-only igual. `LocalNlInbox = LocalRecord<NlInbox>`.

### Dexie — bump a `version(3)`

Store nuevo ⇒ sí requiere bump (a diferencia de `deleted_at` en Fase 3, que era columna no indexada): `db.version(3).stores({ nl_inbox: "id, synced, user_id, status, created_at" })` en `lib/db/schema.ts`, más la propiedad tipada en `lib/db/index.ts`.

### `lib/sync/registry.ts`

`"nl_inbox"` agregado a `SYNCED_TABLES`. Sin FKs ⇒ la posición en el array es indistinta.

El motor de sync pushea todos los campos de la fila salvo `synced`, así que el shape Dexie es idéntico a las columnas de Postgres. Como `nl_inbox` entra a `SYNCED_TABLES`, una fila recién creada suma al badge "N pendientes de sincronizar" — correcto, está pendiente de sync. El contador de *inbox sin procesar* es otra cosa y se cuenta aparte por `status === "pending"`.

## 2. Helpers puros (con tests en vitest)

- `lib/parse/validateParseResult.ts` — `stripJsonFences` (saca fences ```json / ``` y whitespace) y `validateParseResult(kind, value)`, validación estructural a mano (sin zod, no vale la pena para dos shapes). Devuelve `null` ante cualquier desvío del shape esperado; el endpoint traduce `null` a 422.
- `lib/parse/matchExercise.ts` — `normalizeText` (minúsculas + NFD sin diacríticos + puntuación a espacio), `scoreExercise` (proporción de tokens de la query que matchean tokens del candidato, con bonus por match exacto y penalización por tokens sobrantes) y `resolveExerciseMatch` (`single` / `candidates` / `none` según umbral y separación del segundo mejor). Nuevo y puro porque `useExercises` (el buscador del catálogo) hace substring match sin plegado de acentos y no sirve para resolver la salida del LLM.
- `lib/utils/setOrder.ts` — `nextSetOrder(sets)` extraído de la lógica `max(set_order)+1` que antes vivía inline en `SessionExerciseCard`, para que el borrador de NL calcule el mismo número de serie sin duplicar la lógica de huecos por soft delete. `SessionExerciseCard` refactorizado para consumirlo.

Tests table-driven con `it.each`, mismo estilo que `parseLoad.test.ts`: casos válidos/inválidos de `validateParseResult` y `stripJsonFences`, casos de matching con acentos/ambigüedad/sin resultado para `matchExercise`, y el caso trivial de huecos para `setOrder`.

## 3. Endpoint `app/api/parse/route.ts`

Primera ruta bajo `app/api/`. `POST`, runtime Node (sin Edge).

- Auth obligatoria: `lib/supabase/server.ts` + `getUser()` (no `getSession()` — en el server no hay sesión local persistida que respetar, y sí conviene la validación contra el servidor). Sin user → 401.
- Body `{ kind: "sets" | "meal", text: string }`, `text` no vacío y ≤1000 chars, si no 400.
- Prompts en `lib/parse/prompts.ts`, separados del handler: exigen solo JSON sin prosa ni fences, codifican las reglas del brief (series por rango de reps con la misma carga, RIR global si no hay uno por serie, carga siempre verbatim como string, cargas distintas por serie soportadas; para comidas, español rioplatense sin "corregir" marcas/comidas argentinas, resumen en `structured_text`, sin macros).
- Llamada a OpenRouter (`temperature: 0`, `max_tokens` acotado, timeout ~15s vía `AbortSignal.timeout`), modelo por `OPENROUTER_MODEL` con default barato.
- Errores: falta la key → 500; upstream no-ok → 502; timeout → 504; JSON malformado o `validateParseResult` devuelve `null` → 422 con mensaje claro.
- La key es server-only, sin prefijo `NEXT_PUBLIC_`, leída únicamente acá.

### Middleware — 401 en `/api/*`

`proxy.ts` matchea todo salvo assets y `lib/supabase/middleware.ts` redirigía (307) cualquier ruta no pública sin sesión, incluido `/api/*`. Ajustado: si no hay user y el path arranca con `/api/`, `updateSession` devuelve `NextResponse.json({ error: "unauthorized" }, { status: 401 })` en vez del redirect. El resto de las rutas sigue redirigiendo a `/login` igual que antes.

## 4. Write helpers y hooks (`lib/db/`, `lib/sync/`)

- `lib/db/nlInbox.ts` — `createNlInboxEntry` (nace `status: "pending"`), `markNlInboxProcessed`, `discardNlInboxEntry`. Mismo contrato que el resto de los write helpers: `getLocalUserId()` con early return, `newId()`, campos explícitos, `synced: 0`, `requestSync()`.
- `lib/db/useNlInbox.ts` — `usePendingNlInbox(kind)`, `useLiveQuery` sobre `status === "pending"` filtrado por kind y ordenado por `created_at` desc.
- `lib/sync/useOnline.ts` — no existía ningún signal de conectividad en la UI (`navigator.onLine` se leía solo dentro de `pushPending`). Hook nuevo con el mismo patrón de listeners que `useSyncTrigger` (`online`/`offline`), inicializado en `true` para no romper hidratación.

## 5. Voz — `lib/utils/useSpeechRecognition.ts`

Web Speech API vía `webkitSpeechRecognition`/`SpeechRecognition`, `lang: "es-AR"`, `interimResults: true`, `continuous: false`. Sin dependencia nueva — las interfaces mínimas de `SpeechRecognition` se declaran en el propio archivo. `supported` se evalúa en un efecto, no en render. La transcripción alimenta el input de texto existente; el usuario la ve y la puede editar antes de parsear, nunca dispara el parse sola.

## 6. Pantalla Sesión

`components/session/NlQuickLog.tsx` montado en `app/sesion/[sessionId]/page.tsx` arriba de `DailyMetricsPanel`, gateado por `editable` — lo primero que se ve sin scrollear. Estilos con los tokens Tailwind ya establecidos en el proyecto; sin sistema de toasts (no existía ninguno) — el feedback es una línea de estado inline.

- `components/session/NlSetsDraft.tsx` — borrador confirmable dentro de `Modal`: ejercicio resuelto vía `resolveExerciseMatch` (precargado / candidatos / picker completo, reusando `ExercisePickerModal`) y series propuestas editables (mismos campos que `SetDraftRow`). Al confirmar, `nextSetOrder()` sobre los sets no borrados de ese ejercicio en la sesión y un `createLoggedSet` por serie. Nada se guarda sin pasar por este modal.
- `components/session/NlInboxList.tsx` — lista de `usePendingNlInbox("sets")`, con "Procesar" (mismo flujo de parse + borrador, deshabilitado sin conexión) y "Descartar". Sin procesamiento automático en background.
- Manejo de fallos: offline, fetch caído, 502/504 → se guarda solo en el inbox (`createNlInboxEntry`) con confirmación inline. 422 (el LLM devolvió algo malformado) → no se guarda solo, ofrece reintentar / guardar para después / cargar manual. 401 → mensaje de sesión vencida.

## 7. Env vars y docs

`.env.local.example` actualizado: `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` ya no son build-only, las usa también `/api/parse`. Agregadas a Vercel (Production y Preview) — paso manual, sin CLI de Vercel disponible en este entorno.

`README.md`: estructura de carpetas (`app/api/parse/`, `lib/parse/`, componentes `session/Nl*`), sección nueva de parse por lenguaje natural con ejemplo de `curl`, sección nueva de inbox offline, y las referencias a "Fase 4" actualizadas.

## Verificación

- `npm test` — verde, incluyendo `validateParseResult.test.ts`, `matchExercise.test.ts` y `setOrder.test.ts` además de los casos ya existentes de `parseLoad`.
- `npm run build` y `npm run lint` limpios.
- Migration `0015` aplicada y verificada con `list_tables`.
- Manual (Chrome/Android): "prensa 190, 12-11-10, RIR 1" → 3 sets correctos y sincronizados; carga no numérica preserva `load_raw` y deja `load_normalized_kg` en `null`; dictado por voz funciona y es editable antes de parsear; en modo avión el texto se guarda en el inbox y se puede procesar al volver la señal; `curl` sin sesión devuelve 401.
