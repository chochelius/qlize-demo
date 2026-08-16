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
    son las Sefirot (`SEPHIROTH_NODES` en `src/modes.js`, alturas 0 → 17600).
    A los 5000m cambia a fase **Entropía**: gravedad invertida
    (`gravityDirection = -1`) — por diseño es un **ascenso invertido** rebotando en
    la cara inferior de plataformas, con estética gótica carmesí.
  - **Etapas** (`StageMode`): mapa procedural de 6000m, barrido de cámara inicial
    (UP → PAUSE → DOWN) que revela la Ruta de Constelación, 3 vidas y medallas:
    Bronce (cima 100%), Oro (≥75% en derrota), Plata (≥50% en derrota).
    Esta jerarquía es intencional según el GDD.

## Arquitectura

    index.html      → contenedor, canvas, HUD Cyber-Zen en esquinas (trigramas ☰ de
                      vidas, medidor circular de Sincronía, barra vertical de
                      distancia), pantallas (menú, ajustes, game over) + CSS inline
    └── src/main.js → entrada: SoundFX (audio procedural Web Audio), input
                      (teclado/táctil/giroscopio con permiso iOS), ajustes
                      (localStorage), cableado UI ↔ motor
        ├── src/engine.js → Engine: game loop rAF, cámara, colisión bidireccional,
        │                   3 vidas + degradación visual (screen shake, destello
        │                   rojo, viñeta de niebla), partículas
        ├── src/player.js → Player: movimiento horizontal con inercia, screen-wrap,
        │                   gravedad adaptativa, 4 estados visuales por Sincronía
        └── src/modes.js  → SEPHIROTH_NODES + BaseMode (contrato y cálculo de
                            Sincronía) ← ArcadeMode / StageMode

Patrones clave:

- **El motor nunca toca el DOM**: se comunica con `src/main.js` vía callbacks
  (`onScoreUpdate`, `onSyncUpdate`, `onLivesUpdate`, `onRealmUpdate`, `onGameOver`,
  `onJumpEffect`, `onLifeLost`).
- **Los modos implementan el contrato de `BaseMode`**: `update`, `updateCamera`,
  `onPlatformStepped`, `getPlatforms`, `getJumpForce`, `getBackgroundColor`,
  `getCurrentRealm`, `drawBackground`, y opcionalmente `calculateMedal`
  (solo `StageMode`) y `get isSweeping` (solo `StageMode` devuelve true durante la
  cinemática inicial; el motor pausa las físicas mientras tanto).
- **Sincronía** = `adherenceHits / totalJumps` sobre la `optimalRoute`, calculada en
  `BaseMode.onPlatformStepped`. `lastSafePlatform` (última plataforma pisada) se usa
  para reaparecer tras perder vida o gastar el escudo.
- **Input compartido por referencia**: objeto `input` (`{left, right, axis}`) de
  `main.js` → `engine.setInput()`.
- Ajustes persistidos en `localStorage` bajo la clave `qlize_jump_settings`
  (presets: soft / balanced / fast).

## Build y Ejecución

```bash
npm install        # instala dependencias (solo vite)
npm run dev        # servidor de desarrollo (vite --host)
npm run build      # build de producción → dist/
npm run preview    # sirve el build de producción
```

No hay tests ni linter configurados; la verificación es manual en el navegador
(checklist al final de este archivo).

## Parámetros de Balance

- Gravedad base 1400; fuerza de salto 650 (`getJumpForce`); velocidad terminal 900.
- Umbrales de Sincronía (`src/player.js`):
  `<30` estado neutro · `≥30` estela stardust + x1.5 · `≥60` anillos + Float Fall
  (`fallSpeedModifier = 0.4`) + x2.0 · `≥90` Escudo del Vacío hexagonal + x3.0.
- Escudo: salva una caída, se consume y reduce la Sincronía a 70.
- Arcade: transición a Entropía en `cameraY > 5000`.
- Etapas: `stageLength = 6000`; 3 vidas; cada error sube `degradationLevel`
  (niebla acumulativa, shake y destello).

## Convenciones de Desarrollo

- Identificadores en inglés; **comentarios, UI y textos del juego en español**.
- Cada archivo abre con un banner de comentario temático (`// === ... ===`).
- Terminología fija (mantener consistente): Estructura/Entropía, Sincronía,
  Ruta Óptima / Ruta de Constelación, Sefirot, Escudo del Vacío, Float Fall,
  medallas Bronce/Oro/Plata.
- Sin dependencias externas en el código de juego: Canvas 2D + Web Audio API.
  Las fuentes (Cinzel, Plus Jakarta Sans) se cargan por CDN desde `index.html`.
- Canvas lógico fijo 450×800; CSS escala el contenedor (`aspect-ratio: 45/80`).
- `dist/` y `node_modules/` están en `.gitignore`. En Windows, git convierte
  LF→CRLF al tocar archivos (esperado, no "arreglar").

## Checklist de Verificación Manual

1. `npm run build` compila sin errores.
2. Etapas: el barrido sube, pausa y **vuelve** al jugador; no se pierden vidas
   durante la cinemática.
3. Etapas: caer al vacío pierde 1 vida y se reaparece en la última plataforma pisada.
4. Etapas: con Sincronía ≥90, la primera caída la salva el escudo (Sincronía → 70).
5. Arcade: a los ~5000m la gravedad se invierte y se asciende por caras inferiores.
6. HUD: aro del medidor de Sincronía visible, trigramas se oscurecen al perder vidas,
   barra lateral de distancia avanza.
7. Audio: blip al saltar, sonido de daño al perder vida, arpegio en victoria (Bronce).
