# CODE_REVIEW — Qlize Jump

> Revisión completa de los 6 módulos fuente, tests, HTML y documentación.
> Fecha: 2026-08-16

---

## Resumen Ejecutivo

Qlize Jump es un escalador vertical 2D en Canvas con mecánicas de Sincronía, dualidad Estructura/Entropía y progresión Cabalística (Árbol de la Vida). La arquitectura es **sólida y bien pensada**: JavaScript vanilla modular, sin dependencias de runtime externas, con separación clara de responsabilidades. El code style es consistente y el GDD está bien implementado.

Sin embargo, hay **bugs críticos** que afectan directamente la jugabilidad, problemas de rendimiento en el render loop, inconsistencias de audio, y desfases en la documentación que deben corregirse.

---

## Mapa de la Arquitectura

```
index.html (1200+ líneas CSS inline)
    └── src/main.js          — Orchestrator / UI Shell
            ├── src/engine.js    — Game Loop + Physics + Render
            │       ├── src/player.js    — Kinematic Entity
            │       └── src/modes.js     — ArcadeMode / StageMode / TutorialMode
            ├── src/audio.js     — Web Audio DSP Manager
            └── src/overworld.js — DAG de 10 Sefirot + localStorage
```

---

## 🔴 Bugs Críticos — Rompen la jugabilidad

### Bug 1 — Tutorial nunca completa
**Archivo:** `src/modes.js` línea 864

```js
// ACTUAL (incorrecto):
if (progressY >= 2800 && !this.stageComplete && player.vy === 0) {

// PROBLEMA: Al aterrizar en la plataforma cumbre, engine.js aplica
// inmediatamente player.jump(), así que player.vy nunca es exactamente 0.
// El tutorial queda bloqueado permanentemente.

// FIX propuesto:
if (progressY >= 2800 && !this.stageComplete) {
```

---

### Bug 2 — `entropyCompleteTriggered` no se inicializa ni resetea
**Archivo:** `src/engine.js` — constructor y `reset()`

`engine.js` chequea `this.entropyCompleteTriggered` en línea 219, pero la propiedad **nunca se declara** en el `constructor` ni se resetea en `reset()`. Al reiniciar tras una partida donde se llegó a Entropía, la condición nunca vuelve a dispararse.

```js
// En constructor() y reset() agregar:
this.entropyCompleteTriggered = false;
```

---

### Bug 3 — `entropyComplete` nunca se setea en `ArcadeMode`
**Archivo:** `src/modes.js` — método `returnToStructure()` (línea 332)

`engine.js` espera que `this.mode.entropyComplete` sea `true` para disparar el evento de completar entropía. `ArcadeMode` cicla de vuelta a Estructura mediante `returnToStructure()` pero **nunca asigna** `this.entropyComplete = true`. Código muerto / lógica desincronizada entre engine y mode.

---

### Bug 4 — Plataforma huérfana en `TutorialMode.optimalRoute`
**Archivo:** `src/modes.js` líneas 779–782

`BaseMode` constructor crea la plataforma con ID `1` y la pushea a `this.optimalRoute`. `TutorialMode.buildTutorialMap()` luego resetea `this.platforms = []` pero **no resetea** `this.optimalRoute`. El array conserva una referencia a una plataforma que ya no existe, corrompiendo el cálculo de Sincronía.

---

## 🔴 Bugs de Audio Críticos

### Bug 5 — SFX de gameplay bypasean el volumen master
**Archivo:** `src/audio.js` líneas 204, 227, 250, 274

`playOptimalJump`, `playSecondaryJump`, `playLifeLost` y `playVictory` conectan el gain node directamente a `ctx.destination`, **ignorando** `masterGain`, el volumen configurado y el estado de mute. El jugador puede silenciar la música, pero los SFX suenan al 100%.

```js
// ACTUAL (incorrecto — en los 4 métodos):
gain.connect(this.ctx.destination);

// FIX propuesto:
gain.connect(this.masterGain || this.ctx.destination);
```

---

### Bug 6 — Doble atenuación de volumen en SFX del Overworld
**Archivo:** `src/audio.js` líneas 298, 302, 321, 324

`playTibetanBowl` y `playNodeHover` aplican `this.volume` manualmente al gain node Y luego conectan a `this.masterGain` (que ya aplica `this.volume` internamente). Resultado: volumen efectivo = `volume²`, haciendo los sonidos del Overworld significativamente más silenciosos de lo esperado.

---

## 🟡 Bugs Medianos — Comportamiento incorrecto

### Bug 7 — Event listeners duplicados
**Archivo:** `src/main.js` líneas 443–446 y 861–864

`btnSettingsToggle` y `btnSettingsX` tienen sus listeners registrados **dos veces**, causando que la acción se dispare dos veces por cada click.

---

### Bug 8 — Crosstalk de input: `KeyA` activa Arcade Y mueve al jugador
**Archivo:** `src/main.js` líneas 87–107 vs. 990

El listener global de teclado activa `input.left = true` con `KeyA` sin verificar si hay un menú abierto. En el menú principal, `KeyA` también actúa como shortcut para abrir el Modo Arcade. Al abrir Arcade desde el teclado, el jugador arranca moviéndose a la izquierda involuntariamente.

---

### Bug 9 — Input no se resetea al perder foco de ventana
**Archivo:** `src/main.js` líneas 87–107

Si el usuario cambia de pestaña mientras presiona una tecla, `input.left` / `input.right` permanece en `true` indefinidamente porque no hay listener de `blur` o `visibilitychange`.

```js
// Agregar:
window.addEventListener('blur', () => {
  input.left = false;
  input.right = false;
  input.axis = 0;
});
```

---

### Bug 10 — Navegación lateral del Overworld incompleta
**Archivo:** `src/main.js` líneas 952–965

La navegación horizontal con teclado (`KeyA`/`KeyD`) en el Overworld está hardcodeada solo para los pares `stage_3`/`stage_4`, `stage_6`/`stage_7` y `stage_8`/`stage_9`. Las etapas 1, 2, 5 y 10 no manejan inputs laterales.

---

### Bug 11 — SVG dibuja líneas del Overworld duplicadas
**Archivo:** `src/main.js` líneas 517–544

`OVERWORLD_GRAPH` contiene conexiones bidireccionales. Al iterar por todos los nodos y cada una de sus conexiones, cada enlace se dibuja **dos veces** como `<line>` en el SVG.

---

### Bug 12 — Comparación flotante exacta en preset matching
**Archivo:** `src/main.js` líneas 354–363

```js
gameSettings.friction === p.friction  // valores: 0.84, 0.86, 0.89
```
Los sliders usan `parseFloat()`, que puede generar artefactos de precisión flotante. Los presets pueden desactivarse visualmente aunque estén aplicados.

**Fix propuesto:** Comparar con tolerancia: `Math.abs(gameSettings.friction - p.friction) < 0.001`

---

## 🟡 Problemas de Rendimiento

### Perf 1 — `createLinearGradient` dentro del loop de plataformas
**Archivo:** `src/engine.js` líneas 369–373

Se crean nuevos objetos `CanvasGradient` en cada frame para cada plataforma visible. A 60 FPS con 20+ plataformas ≈ 1,200+ allocations/segundo. Cachear los gradients por tipo de plataforma reduciría drásticamente la presión sobre el GC.

---

### Perf 2 — `.filter().sort()` en cada frame de render
**Archivo:** `src/modes.js` líneas 438, 685, 895

```js
// Ejecutado ~60 veces/segundo en los 3 modos:
const optimalPlatforms = this.platforms
  .filter(p => p.active && p.isOptimal)
  .sort((a, b) => b.y - a.y);
```
Esto crea y descarta dos arrays nuevos por frame. Mantener una lista ordenada que se actualice solo cuando cambia el estado de las plataformas sería más eficiente.

---

### Perf 3 — `this.optimalRoute` crece indefinidamente
**Archivo:** `src/modes.js` líneas 69, 103, 108

Las plataformas se cullan y eliminan de `this.platforms` a lo largo del juego, pero sus IDs permanecen en `this.optimalRoute` para siempre. En sesiones largas de Arcade, `indexOf()` sobre este array se vuelve O(N) creciente. Hay que limpiar IDs viejos junto con las plataformas culadas.

---

### Perf 4 — `ctx.save()` / `ctx.restore()` dentro del loop de partículas
**Archivo:** `src/player.js` líneas 144–152

Canvas state stack se opera por cada partícula de la estela en cada frame. Mover `save()`/`restore()` fuera del loop y usar `globalAlpha` directamente reduciría el overhead.

---

### Perf 5 — `starsLayer2` — dead memory
**Archivo:** `src/modes.js` líneas 47–54

25 objetos estrella se instancian en el constructor de `BaseMode` y se almacenan en `this.starsLayer2`, pero **nunca se dibujan** en ningún `drawBackground` de ningún modo. Eliminar o implementar.

---

## 🟡 Robustez y Calidad de Código

### Calidad 1 — Null safety ausente al iniciar el engine
**Archivo:** `src/engine.js` líneas 156, 183, 334

Si `start()` se llama antes de `setPlayer()` o `setMode()`, el engine crashea con `TypeError: Cannot read properties of null`. Validar en `start()` o en el inicio de `loop()`.

---

### Calidad 2 — Lógica de modo específica hardcodeada en Engine
**Archivo:** `src/engine.js` líneas 193–224

El engine contiene strings literales `'entropy'`, distancias hardcodeadas `5000`, y branching específico de `ArcadeMode` vs `StageMode`. Esta lógica debería vivir dentro de los métodos del modo (ej. `mode.isComplete()`, `mode.getProgress()`), manteniendo el engine agnóstico al modo.

---

### Calidad 3 — `arguments[3]` en clase ES6
**Archivo:** `src/modes.js` línea 486

```js
// Patrón ES5 dentro de una clase ES6:
const repeatCount = arguments[3] || 3;

// Fix: usar parámetro explícito
constructor(canvas, ctx, config, repeatCount = 3) {
```

---

### Calidad 4 — `score` ignorado en `OverworldManager.completeStage`
**Archivo:** `src/overworld.js` línea 210

El parámetro `score` se recibe en `completeStage(stageKey, score, medal)` pero nunca se almacena ni persiste en `localStorage`. Los mejores puntajes por etapa no se guardan nunca.

---

### Calidad 5 — `stageCompleteTriggered` vs `entropyCompleteTriggered` inconsistencia
**Archivo:** `src/engine.js` línea 63

`this.stageCompleteTriggered` existe y se resetea en `reset()`. `this.entropyCompleteTriggered` no está declarado en el constructor ni en `reset()` (ver Bug 2). Ambas flags deberían seguir el mismo patrón.

---

### Calidad 6 — Magic strings sin constantes centralizadas
**Archivo:** `src/main.js` — múltiples líneas

Strings como `'stage_1'`, `'Bronce'`, `'Oro'`, `'Plata'`, `'entropy'`, `'structure'`, `'qlize_jump_settings'` aparecen repetidos en múltiples funciones. Centralizar en un objeto de constantes reduciría errores de typo.

---

## 🟢 Accesibilidad (`index.html`)

| # | Problema | Impacto |
|---|---|---|
| A1 | `user-scalable=no, maximum-scale=1.0` bloquea el zoom del usuario | Viola WCAG 1.4.4 |
| A2 | `* { user-select: none; }` impide seleccionar texto informativo | Usabilidad / a11y |
| A3 | Emojis en botones sin `aria-hidden="true"` | Lectores de pantalla los leen como descripciones largas |
| A4 | Colores de bajo contraste: `#94a3b8` y `rgba(245,245,247,0.25)` sobre fondos oscuros | Viola WCAG 1.4.3 |

---

## 📋 Estado de la Documentación

| Archivo | Estado | Problema |
|---|---|---|
| `QWEN.md` | ⚠️ Desactualizado | Dice *"No hay tests ni linter configurados"* — existe suite completa en `tests/game.test.js` ejecutada con `npm test` |
| `QWEN.md` | ⚠️ Desactualizado | Menciona fuentes Google Fonts vía CDN — `index.html` usa stacks de fuentes del sistema (funciona offline) |
| `MODO_ETAPAS.md` | ✅ Preciso | Documenta correctamente GDD, medallas, Sefirot y cinemática de barrido |

---

## 🧪 Cobertura de Tests (`tests/game.test.js`)

La suite existente es sólida. Cubre:

| Área | Estado |
|---|---|
| Física del jugador (aceleración, wrap, maxSpeed, salto con gravedad invertida) | ✅ |
| Sincronía (Float Fall, Escudo del Vacío, cálculo de porcentaje) | ✅ |
| Transición Estructura → Entropía y retorno | ✅ |
| StageMode (segmentos, medallas, barrido de cámara) | ✅ |
| TutorialMode (textos adaptativos por dispositivo, avance de zonas) | ✅ |
| Overworld (grafo 10 Sefirot, desbloqueo progresivo, localStorage) | ✅ |
| Audio sintético (Web Audio API) | ❌ Difícil de testear en Node.js |
| Eventos táctiles y giroscopio (`main.js`) | ❌ Sin cobertura |
| Colisiones laterales y variaciones de fricción | ❌ Sin cobertura |

---

## Tabla de Prioridades

| Prioridad | ID | Descripción | Archivo |
|---|---|---|---|
| 🔴 Crítico | Bug 1 | Tutorial nunca completa (`player.vy === 0`) | `modes.js:864` |
| 🔴 Crítico | Bug 2 | `entropyCompleteTriggered` no inicializado | `engine.js` constructor/reset |
| 🔴 Crítico | Bug 3 | `entropyComplete` nunca asignado en ArcadeMode | `modes.js:332` |
| 🔴 Crítico | Bug 4 | ID huérfana en `TutorialMode.optimalRoute` | `modes.js:779` |
| 🔴 Crítico | Bug 5 | SFX bypasean volumen master | `audio.js:204,227,250,274` |
| 🟡 Alto | Bug 6 | Doble atenuación volumen Overworld SFX | `audio.js:298,302,321,324` |
| 🟡 Alto | Bug 7 | Event listeners duplicados (double-fire) | `main.js:443,861` |
| 🟡 Alto | Bug 8 | Crosstalk `KeyA` activa Arcade + mueve jugador | `main.js:87,990` |
| 🟡 Alto | Bug 9 | Input stuck al perder foco de ventana | `main.js:87` |
| 🟡 Medio | Bug 10 | Navegación lateral Overworld incompleta | `main.js:952` |
| 🟡 Medio | Bug 11 | SVG líneas duplicadas en Overworld | `main.js:517` |
| 🟡 Medio | Bug 12 | Comparación flotante exacta en presets | `main.js:354` |
| 🟡 Medio | Perf 1–5 | Optimizaciones en render loop | `engine.js`, `modes.js`, `player.js` |
| 🟢 Bajo | Calidad 1–6 | Code smells, dead code, null safety | Varios |
| 🟢 Bajo | A1–A4 | Issues de accesibilidad | `index.html` |
| 🟢 Bajo | Doc | Actualizar `QWEN.md` | `QWEN.md` |
