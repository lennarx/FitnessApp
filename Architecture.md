# Prompt para Claude Code — Gym Tracker PWA (local-first)

> Copiá todo lo que sigue como prompt inicial de Claude Code en el repo vacío.

---

Quiero que diseñes un **plan de implementación detallado** (y luego lo ejecutes por fases) para una PWA de tracking de entrenamiento y alimentación, de uso personal (single-user por ahora), Android-only, en español rioplatense. Primero producí el plan completo (`PLAN.md` en la raíz del repo) con fases, tareas y criterios de aceptación; esperá mi OK antes de escribir código de features.

## Contexto

Soy desarrollador (.NET/Azure de backend, Next.js de frontend). Hoy el tracking se hace en un Excel con tres hojas: (1) plan de entrenamiento Upper/Lower con ejercicios, series, rangos de reps, RIR objetivo, descansos y notas de progresión; (2) registro semanal por sesión: carga, reps por serie (hasta 3 series), RIR final, horas de sueño, sensación post-entrenamiento (1-10) y notas libres — incluye también sesiones de natación (duración, metros, intensidad); (3) registro de comidas en texto libre con hora, peso de porciones cuando se conoce, flag de entrenamiento y pasos del día; más una hoja de peso corporal cada 3 días. La app debe replicar y superar ese flujo con **mínima fricción de carga** — el diferencial clave es el registro por lenguaje natural.

## Stack (decidido, no proponer alternativas)

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. PWA instalable (manifest + service worker vía Serwist o next-pwa; el service worker solo cachea assets, sin lógica custom de sync).
- **Storage local (fuente de verdad de la UI):** Dexie.js sobre IndexedDB. La app lee y escribe SIEMPRE local primero.
- **Backend/réplica:** Supabase — Postgres + Auth con magic link. Todas las tablas con `user_id` desde el día uno aunque hoy haya un solo usuario. RLS activado.
- **Sync:** append-only, unidireccional local → Supabase. Cada registro local tiene flag `synced`. Un hook global escucha el evento `online` y al montar la app: empuja pendientes con retry/backoff. Sin resolución de conflictos (un solo usuario, un solo dispositivo). No usar Background Sync API.
- **Parsing por lenguaje natural:** endpoint API en Next.js (`/api/parse`) que llama a **OpenRouter** (modelo configurable por env var; default un modelo barato tipo DeepSeek o Claude Haiku). Requiere red; **fallback obligatorio:** si no hay señal o falla el parse, el texto crudo se guarda igual en Dexie como registro `pending_parse` y se procesa al sincronizar. Nunca se pierde un registro.
- **Deploy:** Vercel. Env vars: claves de Supabase y OpenRouter.

## Modelo de datos

Derivá vos el schema completo (Dexie + SQL de Supabase con migrations) a partir del dominio descripto. Entidades mínimas: usuario, ejercicio (catálogo), plan/rutina (días con ejercicios y targets: series, rango de reps, RIR objetivo, descanso, notas de progresión), sesión de entrenamiento, set registrado (carga, reps, RIR, orden), sesión de natación/cardio (duración, distancia, intensidad, notas), comida (timestamp, texto original, texto estructurado post-parse, peso de porción opcional, flag entrenamiento), peso corporal, métricas diarias (sueño en horas, sensación 1-10, pasos). Contemplá cargas no numéricas ("+10 kg de lastre", "40 kg/lado", "I10-D10" para unilaterales): guardá siempre el string original además de cualquier normalización numérica.

## Catálogo de ejercicios

- Importá el dataset open source **`yuhonas/free-exercise-db`** (GitHub, ~800 ejercicios en JSON con imágenes, licencia libre). Las imágenes se sirven estáticas o desde el repo raw.
- Los nombres vienen en inglés: incluí un **script one-time** que traduce nombres al español vía el mismo endpoint de OpenRouter y guarda el catálogo traducido como seed (mantener nombre original en inglés como campo secundario para búsqueda).
- Seed adicional "curado": los ejercicios del plan Upper/Lower actual (dominadas lastradas, crunch declinado con lastre, press inclinado Hammer, jalón narrow MAG grip, aperturas en polea, vuelos laterales, prensa inclinada 45°, peso muerto rumano con mancuernas, curl femoral —sentado y parado unilateral—, curl invertido en polea, briefcase carry, crunch en máquina, press inclinado con mancuernas, remo en cable MAG grip, straight-arm pulldown, curl martillo en polea, extensión de tríceps en polea, sentadilla pendular, hack squat, elevación de piernas en silla romana, extensión de cuádriceps), mapeados al catálogo cuando exista equivalente.
- El usuario puede crear ejercicios custom (sin imagen o con imagen del catálogo).
- **Fallback si el dataset diera problemas** (estructura distinta a la esperada, imágenes rotas, etc.): catálogo sin imágenes en v1, solo nombres + grupo muscular; imágenes quedan para v2. No bloquear el MVP por esto.

## Pantallas del MVP (4)

1. **Plan:** vista de la rutina semanal (días Upper/Lower) con ejercicios y targets. CRUD de rutina.
2. **Sesión de hoy:** al abrir un día del plan, log rápido de cada ejercicio. Dos modos de carga: (a) formulario compacto por serie, (b) **input de lenguaje natural** — texto o dictado por voz (Web Speech API del navegador, funciona en Chrome/Android) tipo "prensa 190, 12-11-10, RIR 1" → el endpoint de parse lo estructura y el usuario confirma antes de guardar. Incluye campos de sueño, sensación 1-10 y notas de sesión. Soporta registrar natación/cardio.
3. **Comidas y peso:** registro de comidas por texto libre/voz (mismo flujo de parse → estructura: alimento, cantidad si se menciona, hora; SIN cálculo de macros en v1), flag de entrenamiento, pasos del día; y registro de peso corporal.
4. **Historial:** por ejercicio, listado cronológico de cargas/reps/RIR con indicación simple de progresión (última sesión vs anterior). Sin gráficos elaborados en v1 (v2).

Transversal: **export a Excel** client-side con SheetJS — genera un .xlsx con hojas Plan / Registro / Comidas / Peso replicando la estructura del Excel original.

## UX no negociable

- Mobile-first, uso con una mano, botones grandes: se usa ENTRE series en el gimnasio.
- Registrar una serie por formulario: máximo 3 taps + un número. Por lenguaje natural: un solo campo.
- Autocompletar carga y reps con los valores de la última sesión del mismo ejercicio.
- Offline total para todo excepto el parse (que tiene fallback). Indicador discreto de estado de sync (pendientes / al día).
- Dark mode por defecto.

## Fases sugeridas para el plan (ajustalas si tenés mejor criterio)

1. Scaffold: Next.js + PWA + Dexie + Supabase (auth + schema + migrations) + capa de sync.
2. Catálogo de ejercicios (import + traducción + seed curado) + CRUD de plan.
3. Log de sesión (formulario compacto) + historial.
4. Endpoint de parse + input por lenguaje natural/voz en sesión y comidas + fallback offline.
5. Comidas + peso + métricas diarias.
6. Export a Excel + pulido de UX + PWA installability audit (Lighthouse).

Cada fase con criterios de aceptación verificables. Priorizá que desde la fase 3 la app ya sea usable en el gimnasio aunque falte el resto.

## Fuera de alcance (NO implementar)

Cálculo de macros/calorías, gráficos avanzados, multi-usuario/social, notificaciones push, Background Sync, edición concurrente, App Stores, iOS.
