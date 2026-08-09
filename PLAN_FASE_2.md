# Fase 2 — Catálogo de ejercicios + CRUD de plan

Prerequisito: Fase 1 completa y verificada en dispositivo (PWA instalada, offline OK, sync OK).

Leé `Architecture.md` (brief maestro) y `PLAN_FASE_1.md`. Esta es la Fase 2. Respetá las convenciones ya establecidas en el código: tipos en `types/entities.ts` como única fuente, write helpers que setean `user_id` (vía `getLocalUserId()`), `synced: 0`, `id` con `newId()`, y `requestSync()` tras cada escritura. Migrations nuevas aplicadas vía MCP de Supabase y versionadas en `/supabase/migrations`.

## Alcance de esta fase

### 1. Limpieza de Fase 1

- Eliminar `test_records`: migration `0012_drop_test_records.sql` aplicada vía MCP, quitarla de `lib/sync/registry.ts`, y bump de Dexie a `version(2)` con `test_records: null` (así se borra el store local sin romper las DBs ya existentes en dispositivos — NO editar la `version(1)`). Borrar `components/dev/`.
- Resolver la inconsistencia documental `middleware.ts` vs `proxy.ts`: verificar cuál existe realmente y alinear README y PLAN_FASE_1.

### 2. Catálogo de ejercicios (seed)

- Fuente: dataset `yuhonas/free-exercise-db` (GitHub, ~800 ejercicios, JSON con imágenes, licencia libre).
- Script one-time (`scripts/build-exercise-seed.ts`, corrible con `npx tsx`, NO parte del bundle de la app): descarga el JSON del dataset, traduce los nombres al español vía OpenRouter (`OPENROUTER_API_KEY` en `.env.local`, modelo barato, traducir en batches de ~50 nombres por request para minimizar llamadas), y emite `data/exercises.seed.json` commiteado al repo con: `name_es`, `name_en`, `muscle_group` (normalizado a un set fijo en español: pecho, espalda, hombros, bíceps, tríceps, cuádriceps, isquios, glúteos, gemelos, core, antebrazos, otro), `equipment`, `image_url`. La traducción corre UNA vez en dev; la app solo consume el JSON estático.
- Imágenes: usar directamente las URLs de `raw.githubusercontent.com` del dataset como `image_url` — sin hostear nada. En la UI, `loading="lazy"` y un placeholder si la imagen falla. (Las imágenes requieren red; offline se muestra solo el nombre.)
- Seed en la app: al iniciar sesión, si el usuario no tiene ejercicios con `source: 'seed'` en Dexie, importar el JSON con `bulkAdd` en una sola transacción. Los ~800 registros quedan `synced: 0` y el sync los empuja; `pushTable` en `syncEngine.ts` chunquea los upserts a Supabase en lotes de 500 filas.
- Ejercicios custom: creación mínima desde la UI (nombre + grupo muscular), `source: 'custom'`, `is_custom: true`.
- Fallback: si el dataset tiene estructura distinta a la esperada o las imágenes no resuelven, seed sin imágenes (solo nombres + grupo) y seguir — no bloquear la fase por esto.

### 3. Seed curado

Incluir en `data/exercises.seed.json` (o un archivo hermano `data/exercises.curated.json` que se mergea en el seed) los ejercicios del plan actual con nombres en español exactos, mapeados al catálogo cuando exista equivalente (heredan su imagen) y como entradas propias cuando no: dominadas lastradas, crunch declinado con lastre, press inclinado Hammer, jalón narrow MAG grip, aperturas en polea, vuelos laterales, prensa inclinada 45°, peso muerto rumano con mancuernas, curl femoral sentado, curl femoral parado unilateral, curl invertido en polea, briefcase carry, crunch en máquina, press inclinado con mancuernas, remo en cable MAG grip, straight-arm pulldown, curl martillo en polea, extensión de tríceps en polea, sentadilla pendular, hack squat, elevación de piernas en silla romana, extensión de cuádriceps.

### 4. Pantalla: Catálogo

- Ruta `/ejercicios`: lista con imagen chica + nombre + grupo muscular. Búsqueda por texto (matchea `name_es` y `name_en`) y filtro por grupo muscular. Todo contra Dexie con `liveQuery` — funciona offline.
- Botón "Nuevo ejercicio" (custom).

### 5. Pantalla: Plan (CRUD de rutina)

- Ruta `/plan`: CRUD completo de `routines` → `routine_days` → `routine_day_exercises` sobre el schema existente.
- Flujo: crear rutina (ej. "Upper/Lower 2.0") → agregar días con etiqueta y orden (Upper 1, Lower 1, …) → dentro de cada día, agregar ejercicios desde el catálogo (picker con la misma búsqueda de `/ejercicios`) con targets: series, rango de reps (min-max), RIR objetivo, descanso en segundos, notas de progresión. Reordenar ejercicios (botones subir/bajar alcanza, sin drag&drop).
- UX del brief: mobile-first, botones grandes, dark mode. Al agregar un ejercicio, defaults razonables precargados (3 series, 8-12 reps, RIR 2) para minimizar taps.

### 6. Navegación

Layout con navegación inferior fija (bottom tabs) con las secciones: Plan, Sesión (placeholder deshabilitado hasta Fase 3), Comidas (placeholder), Historial (placeholder), Ejercicios. Home (`/`) redirige a `/plan` por ahora.

## Fuera de alcance en esta fase

Log de sesión, historial, comidas, parse por LLM, export a Excel. Los placeholders de navegación NO tienen contenido.

## Criterios de aceptación (verificados en Chrome/Android)

- [x] `npm run build` limpio; `test_records` no existe ni en Supabase ni en Dexie (y la app no rompe en un dispositivo que ya tenía la DB v1).
- [x] Primer login post-deploy: el catálogo se seedea solo (~800+ ejercicios visibles) y el sync lo empuja completo a Supabase sin errores (contar filas en Table Editor).
- [x] Búsqueda y filtro del catálogo funcionan en modo avión (sin imágenes, con nombres).
- [x] Puedo crear una rutina con 2 días y 5 ejercicios por día con targets, cerrar la app, reabrirla offline y verla intacta; al volver la señal, está en Supabase.
- [x] Crear un ejercicio custom y usarlo en un día del plan.
- [x] El seed NO se re-ejecuta en logins subsiguientes (sin duplicados).

## Al terminar

Actualizar README (sección catálogo: cómo regenerar el seed con el script, y la licencia del dataset citada). Commit al final de la fase.
