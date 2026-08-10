# Fase 6 (final) — Export a Excel + hardening + pulido PWA

## Contexto

Fase 5 dejó los 5 tabs activos. Esta es la última fase del MVP definido en `Architecture.md` y junta tres cosas: el único ítem transversal que nunca se implementó (**export a Excel client-side con SheetJS**, deferido explícitamente en `PLAN_FASE_1.md`), la deuda anotada en los reviews de fases anteriores (doble tap en escrituras, carrera del parse de comidas, permiso de micrófono sin manejar), y el pulido de PWA/UX que hace que la app instalada se sienta terminada.

**Sin migrations.** El export es solo lectura sobre Dexie; el guard de parse solo agrega condiciones a un `update` existente. Dexie queda en `version(3)`.

Fuera de alcance (post-MVP): gráficos de progresión, macros/calorías, import desde Excel, multi-usuario, pull remoto→local, notificaciones.

## 1. Export a Excel

### 1.1 Dependencia

SheetJS no publica en el registry de npm desde 2022 (`xlsx` ahí está congelado en 0.18.5, con CVEs abiertos). Se instala desde el CDN oficial:

```bash
npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Esto deja una URL fuera del registry en `package-lock.json` — `npm ci` en Vercel necesita alcanzar `cdn.sheetjs.com`. Documentado en el README.

### 1.2 Arquitectura de tres capas

El helper puro no puede importar Dexie (`vitest.config.ts` corre en `environment: "node"`, sin `fake-indexeddb`, y `lib/db/index.ts` instancia `new FitnessDB()` a nivel de módulo). Se parte en tres:

- `lib/export/readExportSnapshot.ts` — lee las tablas relevantes de Dexie a un `ExportSnapshot` plano. Sin lógica, sin tests.
- `lib/export/buildWorkbookData.ts` — **puro**, `buildWorkbookData(snapshot): WorkbookData`. Filtra soft-deleted, arma joins, ordena. Mismo patrón que `weightDeltas` / `derivePortion`. **Con tests.**
- `lib/export/writeWorkbook.ts` — `await import("xlsx")`, arma el `WorkBook` y dispara la descarga. Sin lógica.

### 1.3 Hojas

Tablas planas y filtrables, no réplica visual del Excel original. Métricas del día desnormalizadas para que cada hoja se pueda pivotear sola.

- **Plan** — rutina activa (`is_active && deleted_at === null`), ordenada por `day_order` → `exercise_order`. `rutina | dia | orden | ejercicio | series_objetivo | reps_objetivo | rir_objetivo | descanso_seg | notas_progresion`.
- **Registro** — una fila por set + una fila por sesión de cardio, mezcladas con columna `tipo`. Ordenado por `session_date` → `set_order`. `fecha | tipo | dia_rutina | ejercicio | serie | carga_raw | carga_kg | reps | rir | cardio_tipo | duracion_min | metros | intensidad | sueño_h | sensacion | pasos | notas_sesion`. `carga_raw` es la fuente de verdad; `dia_rutina` es `"Libre"` cuando no hay `routine_day_id`.
- **Comidas** — una fila por comida no borrada, orden por `occurred_at`. `fecha | hora | texto_crudo | texto_estructurado | porcion | porcion_g | entrenamiento | estado_parse | pasos`. Comidas `unparsed` se incluyen (estado terminal legítimo).
- **Peso** — mediciones no borradas, orden cronológico ascendente. `fecha | kg | delta | notas`, reusando `weightDeltas`.
- **Metricas** — una fila por fecha con al menos un campo de `daily_metrics` cargado, para no perder un día sin sets ni comidas. `fecha | sueño_h | sensacion | pasos`.

Exclusiones: `deleted_at !== null` en `routines`/`routine_days`/`routine_day_exercises`/`logged_sets`/`meals`/`body_weight`. `nl_inbox` no se exporta (bandeja de trabajo, no dato del usuario).

### 1.4 Escritura, descarga y offline

`writeWorkbook` usa `XLSX.utils.json_to_sheet` por hoja + `XLSX.writeFile` (dispara la descarga sola en browser). Toda fila de una hoja lleva las mismas claves en el mismo orden, rellenando `""` donde no aplica. Filename `fitness-export-YYYY-MM-DD.xlsx` con `todayLocalDate()`.

El `import("xlsx")` dinámico genera un chunk async — no debe inflar el bundle inicial. Verificación obligatoria post-build: confirmar que ese chunk queda precacheado por Serwist (`public/sw.js`); si no, agregarlo a `additionalPrecacheEntries` en `next.config.ts`. Sin esto, exportar en modo avión falla.

### 1.5 Ubicación en la UI

Pantalla nueva `/ajustes`, mínima, colgada de un ícono `⚙` en la barra sticky de `components/auth/AuthGuard.tsx` junto al `SyncStatusBadge`. **Sin tab nuevo.** Justificación: la app no tenía logout en ningún lado — `/ajustes` le da lugar a eso, a la versión y al export.

Contenido: botón "Exportar a Excel" (estados idle/exportando/error), versión de la app, y "Salir de la cuenta" (con `confirm()`, llama a `supabase.auth.signOut()`). Se llama "Salir de la cuenta" y no "Cerrar sesión" porque ese último string ya significa "terminar el entrenamiento" en `/sesion/[sessionId]`.

## 2. Hardening

### 2.1 Doble tap

Causa raíz real del duplicado de sets: `SessionExerciseCard` calcula `nextSetOrder(sets)` en el render, así que dos taps concurrentes generan dos sets con el mismo `set_order` — el guard de UI solo no alcanza. `lib/db/sessions.ts::createLoggedSet` pasa a calcular su propio `set_order` dentro de una transacción `rw` (mismo patrón que `getOrCreateTrainingSession`), releyendo los sets existentes. Se agrega además un guard de in-flight (`saving` + botón deshabilitado + label cambiante, como ya existe en `NlSetsDraft`) a: `SetDraftRow`, `LoggedSetRow`, `BodyWeightSection`, `CardioForm`, `MealComposer`, y los formularios de alta en `/plan`. `NlSetsDraft.handleConfirm` gana un `catch` que hoy no tiene (una falla a mitad del loop deja sets parciales en silencio).

### 2.2 Carrera del parse de comidas

`lib/parse/mealParseGuard.ts` — `shouldApplyMealParse(meal, expectedRawText)`, puro y testeado: falso si la fila no existe, está soft-deleted, no está en `pending_parse`, o si `raw_text` cambió desde que se envió el parse. `applyMealParse(id, parsed, expectedRawText)` relee la fila en una transacción `rw` y aplica el predicado antes de escribir, descartando en silencio si da falso. Cubre los tres call sites: `MealComposer`, `MealDetailModal`, y el loop de "Procesar pendientes" en `app/comidas/page.tsx` (que hoy itera un snapshot de `useLiveQuery` capturado antes del loop).

### 2.3 Permiso de micrófono denegado

`lib/utils/useSpeechRecognition.ts` tiraba el código de error a la basura (`onerror` sin leer `event.error`). `lib/utils/speechErrors.ts::speechErrorMessage(code)` traduce `not-allowed`/`no-speech`/`audio-capture`/`network`/`aborted`/default a mensajes en rioplatense, con tests. El hook expone `error: string | null`; `NlTextInput` lo renderiza inline en rojo bajo el input.

## 3. Pulido PWA y UX

- **Íconos** — `scripts/build-icons.ts` (sharp) genera `icon-192`, `icon-512`, `icon-512-maskable` (con safe zone real — hoy es un duplicado byte a byte del ícono normal) y `apple-touch-icon`, todos con glifo vectorial (sin `<text>`, no confiable entre plataformas). Se borran los SVG de scaffolding de `create-next-app` que quedaron en `public/`.
- **Metadata** — `app/layout.tsx` no tenía `export const viewport` (sin `themeColor`, sin `viewportFit`, sin `appleWebApp`): se agrega. `app/manifest.ts` gana `id`, `scope`, `lang`, `dir`, `orientation`, `categories`. `app/globals.css` deja de pisar Geist con el boilerplate de Arial/Helvetica.
- **Lighthouse** — verificable por código: manifest completo, SW con precache no vacío, viewport meta, `<html lang>`, `apple-touch-icon`. Chequeos que le tocan al usuario en el dispositivo (instalación sin warnings, ícono correcto tras reinstalar, sin recorte de la maskable, Lighthouse contra el deploy de Vercel — no localhost, modo avión de punta a punta, splash screen oscuro).
- **Estados vacíos** — `components/ui/EmptyState.tsx` nuevo (mensaje + CTA), aplicado a las 5 pantallas: `/plan`, `/plan/[routineId]`, `/plan/[routineId]/[dayId]`, `/sesion` (sin rutina activa, y rutina activa sin días — este último no tenía ningún mensaje), `/sesion/[sessionId]` (sin ejercicios — no tenía ningún mensaje), `/comidas` (ambos tabs), `/historial` (además esconde el buscador cuando no hay nada que buscar).
- **Confirmaciones** — se mantiene `window.confirm` (no se introduce un componente de diálogo nuevo en la última fase). Se agrega a: borrar día de rutina, borrar ejercicio del día, borrar set, borrar comida, borrar peso, descartar entrada del inbox NL.
- **Consistencia** — títulos por ruta vía `metadata`/`layout.tsx` con template `"%s · Fitness"`; barrido de copy a rioplatense consistente (tenés/podés/ingresá, sin "tú").

## Archivos

**Nuevos:** `lib/export/{readExportSnapshot,buildWorkbookData,writeWorkbook}.ts` + `buildWorkbookData.test.ts`, `lib/parse/mealParseGuard.ts` + test, `lib/utils/speechErrors.ts` + test, `components/export/ExportButton.tsx`, `components/ui/EmptyState.tsx`, `app/ajustes/page.tsx`, `scripts/build-icons.ts`.

**Modificados (principales):** `lib/db/meals.ts`, `lib/db/sessions.ts`, `lib/utils/useSpeechRecognition.ts`, `components/nl/NlTextInput.tsx`, componentes de escritura en `components/session/`, `components/meals/`, `components/weight/`, `components/plan/`, `components/auth/AuthGuard.tsx`, `app/{layout,manifest,globals.css}`, pantallas de `/plan`, `/sesion`, `/comidas`, `/historial`, `next.config.ts`, `package.json`, `README.md`, `public/icons/*`.

**No se toca:** `lib/db/schema.ts` (Dexie sigue en v3), `supabase/migrations/`, `lib/sync/*`, los scripts `--webpack`.

## Verificación

- `npm test` y `npm run build` limpios. Cubre `buildWorkbookData` (exclusión de soft-deleted, joins, orden cronológico, hojas vacías), `shouldApplyMealParse` (fila inexistente/soft-deleted/`unparsed`/`parsed`/texto cambiado/caso feliz), `speechErrorMessage`.
- Post-build: confirmar el chunk de `xlsx` dentro de `public/sw.js`; confirmar que no se filtró al bundle de entrada.
- Manual (Chrome/Android): export en modo avión con las 5 hojas pobladas y sin filas borradas, abierto en Sheets/Excel; doble tap en "Registrar serie" crea un solo set; editar una comida justo después de crearla no deja `structured_text` viejo; denegar el micrófono muestra mensaje; reinstalar la PWA muestra el ícono nuevo sin recorte; las 5 pantallas con datos vacíos muestran CTA.

## Al terminar

README con sección de export (layout de hojas + nota de `cdn.sheetjs.com`), estado "MVP completo (Fases 1-6)", backlog post-MVP. Commit final.

## Backlog post-MVP (no implementar en esta fase)

- Gráficos de progresión, macros/calorías, import desde Excel, multi-usuario, pull remoto→local, notificaciones.
- **Selector de rutina activa**: `updateRoutine(id, { is_active })` existe pero ninguna UI lo llama; `createRoutine` hardcodea `is_active: true`. Con dos rutinas, `/sesion` toma la que Dexie devuelva primero.
- **Undo de soft deletes**: todos los borrados son recuperables en la base pero nada en la UI lo expone.
- **Feedback de fallas de escritura**: los helpers de `lib/db/*` no reportan errores; casi toda escritura fallida es silenciosa. Falta un mecanismo de notificación global (toast).
- **Filtrado consistente en lecturas**: algunas pantallas hacen `useLiveQuery` directo sobre Dexie sin filtrar `user_id`/`deleted_at`, a diferencia de los hooks de `lib/db/use*.ts`. Inocuo con un solo usuario.
- **`Modal.tsx`** sin focus trap, sin Escape, sin scroll lock.
- **Renombrar `body_weight.measured_at`**: guarda fecha local `YYYY-MM-DD`, pero el sufijo `_at` en el resto del schema significa instante ISO UTC.
