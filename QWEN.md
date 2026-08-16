# QWEN.md

Contexto para agentes de IA que trabajen en este repositorio.

## Descripción del Proyecto

**QLIZE | Cyber-Zen Vectorial** (GDD v1.2) — juego de escalada vertical en navegador
(canvas 2D, resolución lógica 450×800), JavaScript vanilla (ES modules) + Vite.
Sin frameworks ni dependencias de runtime.

- **Género:** escalador vertical con salto automático al tocar plataforma.
- **Mecánica central:** la *Sincronía* — porcentaje de adherencia a la Ruta Óptima
  (plataformas doradas). Controla el estado visual del avatar, el multiplicador de
  puntuación, Float Fall y el Escudo del Vacío.
- **Modos:**
  - **Arcade** (`ArcadeMode`): ascenso continuo por el Árbol de la Luz. Los reinos
    son las Sefirot (`SEPHIROTH_NODES` en `src/modes.js`, alturas 0 → 17600). A los
    5000m (o al perder las 3 vidas en Estructura) cambia a fase **Entropía**:
    gravedad invertida (`gravityDirection = -1`), el jugador asciende en noclip hasta
    la base del Árbol Invertido y luego **desciende** 5000m rebotando en la cara
    inferior de plataformas carmesí. Completar el descenso (o perder las vidas en
    Entropía) reinicia el ciclo en Estructura.
  - **Etapas** (`StageMode`): 10 etapas de 18000m sobre el grafo del Árbol de la Vida
    (`OVERWORLD_GRAPH` en `src/overworld.js`, desbloqueo progresivo persistido en
    localStorage). Barrido de cámara inicial (UP → PAUSE → DOWN) que revela la Ruta
    de Constelación, 3 vidas y medallas: Bronce (cima 100%), Oro (≥75% en derrota),
    Plata (≥50% en derrota). Esta jerarquía es intencional según el GDD.
  - **Iniciación** (`TutorialMode`): tutorial de 6 zonas (3200m) con textos
    adaptativos según dispositivo y modo de control; se completa al aterrizar en la
    plataforma sagrada de la cima (`isSummit`).

## Arquitectura

    index.html      → contenedor, canvas, HUD Cyber-Zen en esquinas (trigramas ☰ de
                      vidas, medidor circular de Sincronía, barra vertical de
                      distancia), pantallas (menú, overworld, ajustes, pausa, game
                      over, banner tutorial) + CSS inline. Fuentes con stack
                      local/sistema (sin CDN): Cinzel/Trajan/Georgia y
                      Plus Jakarta Sans/system-ui.
    └── src/main.js → entrada: cableado UI ↔ motor, input (teclado/táctil/giroscopio
        │             con permiso iOS), ajustes, navegación universal por teclado
        ├── src/engine.js → Engine: game loop rAF, cámara, colisión bidireccional,
        │                   3 vidas + degradación visual (screen shake, destello
        │                   rojo, viñeta de niebla), partículas
        ├── src/player.js → Player: movimiento horizontal con inercia, screen-wrap,
        │                   gravedad adaptativa, 4 estados visuales por Sincronía
        ├── src/modes.js  → SEPHIROTH_NODES + BaseMode (contrato y cálculo de
        │                   Sincronía) ← ArcadeMode / StageMode / TutorialMode
        ├── src/audio.js  → QlizeAudioManager: música adaptativa Estructura/Entropía
        │                   (pistas invertidas), filtro lowpass de degradación por
        │                   vidas, SFX sintéticos (saltos, daño, victoria, cuenco)
        └── src/overworld.js → OVERWORLD_GRAPH (DAG de 10 Sefirot) +
                               OverworldManager (progreso y medallas en localStorage)

Patrones clave:

- **El motor nunca toca el DOM**: se comunica con `src/main.js` vía callbacks
  (`onScoreUpdate`, `onSyncUpdate`, `onLivesUpdate`, `onRealmUpdate`, `onGameOver`,
  `onJumpEffect`, `onLifeLost`, `onStageComplete`, `onPhaseChange`).
- **Los modos implementan el contrato de `BaseMode`**: `update`, `updateCamera`,
  `onPlatformStepped`, `getPlatforms`, `getJumpForce`, `getBackgroundColor`,
  `getCurrentRealm`, `drawBackground`, `getScoreAndProgress`, y opcionalmente
  `calculateMedal` (`StageMode`/`TutorialMode`) y `get isSweeping` (solo `StageMode`
  devuelve true durante la cinemática inicial; el motor pausa las físicas mientras).
- **Sincronía** = `adherenceHits / totalJumps` sobre la `optimalRoute`, calculada en
  `BaseMode.onPlatformStepped`. `lastSafePlatform` (última plataforma pisada) se usa
  para reaparecer tras perder vida o gastar el escudo.
- **Input compartido por referencia**: objeto `input` (`{left, right, axis}`) de
  `main.js` → `engine.setInput()`. El listener de movimiento solo actúa con
  `engine.isRunning` (evita crosstalk con atajos de menú); `blur` resetea el input.
- Ajustes persistidos en `localStorage` bajo la clave `qlize_jump_settings`
  (presets: soft / balanced / fast). Progreso del Overworld bajo
  `qlize_overworld_progress` (etapas completadas, mejores medallas y puntajes).

## Build y Ejecución

```bash
npm install        # instala dependencias (solo vite)
npm run dev        # servidor de desarrollo (vite --host)
npm run build      # build de producción → dist/
npm run preview    # sirve el build de producción
npm test           # suite de lógica pura (node --test tests/game.test.js)
```

`npm test` cubre física del jugador, Sincronía, transiciones Estructura/Entropía,
StageMode, TutorialMode y Overworld. No hay linter configurado; la verificación
funcional es manual en el navegador (checklist al final de este archivo).

## Parámetros de Balance

- Gravedad base 1400; fuerza de salto 650 (`getJumpForce`); velocidad terminal 900.
- Umbrales de Sincronía (`src/player.js`):
  `<30` estado neutro · `≥30` estela stardust + x1.5 · `≥60` anillos + Float Fall
  (`fallSpeedModifier = 0.4`) + x2.0 · `≥90` Escudo del Vacío hexagonal + x3.0.
- Escudo: salva una caída, se consume y reduce la Sincronía a 70.
- Arcade: transición a Entropía en `cameraY >= 5000`; descenso de 5000m para cerrar
  el ciclo.
- Etapas: `stageLength = 18000` por etapa; `gravityMultiplier` 1.0 → 1.18 según
  Sefirá; barrido a 9000 px/s; 3 vidas; cada error sube `degradationLevel`
  (niebla acumulativa, shake y destello).

## Convenciones de Desarrollo

- Identificadores en inglés; **comentarios, UI y textos del juego en español**.
- Cada archivo abre con un banner de comentario temático (`// === ... ===`).
- Terminología fija (mantener consistente): Estructura/Entropía, Sincronía,
  Ruta Óptima / Ruta de Constelación, Sefirot, Escudo del Vacío, Float Fall,
  medallas Bronce/Oro/Plata.
- Sin dependencias externas en el código de juego: Canvas 2D + Web Audio API.
  Las fuentes usan stacks con fallback del sistema (funciona offline; no hay CDN).
- Canvas lógico fijo 450×800; CSS escala el contenedor (`aspect-ratio: 45/80`).
- `dist/` y `node_modules/` están en `.gitignore`. En Windows, git convierte
  LF→CRLF al tocar archivos (esperado, no "arreglar").

## Checklist de Verificación Manual

1. `npm run build` compila sin errores y `npm test` pasa.
2. Etapas: el barrido sube, pausa y **vuelve** al jugador; no se pierden vidas
   durante la cinemática.
3. Etapas: caer al vacío pierde 1 vida y se reaparece en la última plataforma pisada.
4. Etapas: con Sincronía ≥90, la primera caída la salva el escudo (Sincronía → 70).
5. Arcade: a los ~5000m la gravedad se invierte y se desciende por caras inferiores;
   completar el descenso devuelve a Estructura con Sincronía reiniciada.
6. Tutorial: las 6 zonas avanzan con la altura y la Iniciación se completa al
   aterrizar en la plataforma de la cima.
7. HUD: aro del medidor de Sincronía visible, trigramas se oscurecen al perder vidas,
   barra lateral de distancia avanza.
8. Audio: los SFX respetan el volumen master y el mute; blip al saltar, sonido de
   daño al perder vida, arpegio en victoria (Bronce); cuenco tibetano al elegir etapa.
