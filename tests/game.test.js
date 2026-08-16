// Tests de lógica pura (sin DOM) con node:test — correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/player.js';
import { BaseMode, ArcadeMode, StageMode, TutorialMode, getTutorialStepData, SEPHIROTH_NODES } from '../src/modes.js';
import { Engine } from '../src/engine.js';

// ---------- mocks mínimos ----------
const mockCanvas = { width: 450, height: 800 };
const noopCtx = new Proxy({}, { get: () => () => noopCtx });

globalThis.requestAnimationFrame = (cb) => {
  const id = setTimeout(() => cb(performance.now()), 16);
  return id;
};
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const idleInput = { left: false, right: false, axis: 0 };

// =========================================================
// Player
// =========================================================
test('Player: movimiento horizontal acelera hacia la derecha', () => {
  const p = new Player(200, 400);
  p.update(0.1, { left: false, right: true, axis: 1 }, 450);
  assert.ok(p.vx > 0, 'debe tener velocidad positiva');
  assert.ok(p.x > 200, 'debe haberse movido a la derecha');
});

test('Player: screen-wrap por ambos lados', () => {
  const p = new Player(0, 400);
  p.x = -p.width - 5; // fuera por la izquierda
  p.update(0.001, idleInput, 450);
  assert.equal(p.x, 450, 'debe reaparecer por la derecha');

  p.x = 451; // fuera por la derecha
  p.update(0.001, idleInput, 450);
  assert.equal(p.x, -p.width, 'debe reaparecer por la izquierda');
});

test('Player: Sincronía alta activa Float Fall y Escudo del Vacío', () => {
  const p = new Player(200, 400);
  p.synchrony = 95;
  p.update(0.001, idleInput, 450);
  assert.equal(p.fallSpeedModifier, 0.4, 'Float Fall activo con sync >= 60');
  assert.ok(p.hasVoidShield, 'Escudo del Vacío activo con sync >= 90');

  p.synchrony = 10;
  p.update(0.001, idleInput, 450);
  assert.equal(p.fallSpeedModifier, 1.0, 'sin Float Fall con sync baja');
  assert.ok(!p.hasVoidShield, 'sin escudo con sync baja');
});

test('Player: jump respeta la dirección de gravedad', () => {
  const p = new Player(200, 400);
  p.jump(650); // gravedad normal
  assert.equal(p.vy, -650, 'salto hacia arriba con gravedad normal');

  p.gravityDirection = -1; // Entropía
  p.jump(650);
  assert.equal(p.vy, 650, 'salto hacia abajo con gravedad invertida');
});

test('Player: velocidad horizontal limitada a maxSpeed', () => {
  const p = new Player(200, 400);
  for (let i = 0; i < 200; i++) {
    p.update(0.05, { left: false, right: true, axis: 1 }, 10000);
  }
  assert.ok(Math.abs(p.vx) <= p.maxSpeed + 0.01, `vx ${p.vx} no debe superar ${p.maxSpeed}`);
});

// =========================================================
// Modos: Sincronía y reciclaje
// =========================================================
test('BaseMode: Sincronía = aciertos óptimos / saltos totales', () => {
  const m = new BaseMode(450, 800);
  const player = new Player(0, 0);
  const optimal = { id: m.platforms[0].id, isOptimal: true };
  const secondary = { id: 999, isOptimal: false };

  m.onPlatformStepped(optimal, player); // 1/1 = 100%
  assert.equal(player.synchrony, 100);

  m.onPlatformStepped(secondary, player); // 1/2 = 50%
  assert.equal(player.synchrony, 50);

  m.onPlatformStepped(optimal, player); // 2/3 = 67%
  assert.equal(player.synchrony, 67);

  assert.equal(m.lastSafePlatform, optimal, 'lastSafePlatform debe actualizarse');
});

test('ArcadeMode: fase Entropía invierte gravedad y genera plataforma base superior a los 5000m', () => {
  const m = new ArcadeMode(450, 800);
  const player = new Player(0, 0);

  m.update(0.016, 4900, player);
  assert.equal(m.phase, 'structure');
  assert.equal(player.gravityDirection, 1);

  m.update(0.016, 5000, player);
  assert.equal(m.phase, 'entropy', 'debe cambiar de fase a los 5000m');
  assert.equal(m.entropySubPhase, 'transition', 'debe iniciar en sub-fase transition');
  assert.equal(player.gravityDirection, -1, 'gravedad invertida en Entropía');
  assert.equal(player.noclip, true, 'noclip activo durante transición');
  assert.ok(m.entropyTopPlatform, 'debe generar la plataforma base superior');
  assert.equal(m.entropyTopPlatform.x, 450 / 2 - 140 / 2, 'base superior centrada horizontalmente');
  assert.equal(m.entropyTopPlatform.y, -5000 + 60, 'base superior en el borde superior visible');
});

test('ArcadeMode: cámara se mantiene fija durante sub-fase transition', () => {
  const m = new ArcadeMode(450, 800);
  const player = new Player(0, 0);

  m.initiateEntropyTransition(player, 5000);
  player.y = -6000; // el jugador se mueve muy arriba

  const cam = m.updateCamera(5000, player, 0.016);
  assert.equal(cam, 5000, 'cámara debe quedarse fija en entropyStartY durante la transición');
});

test('ArcadeMode: jugador aterriza en plataforma base superior y comienza descenso', () => {
  const m = new ArcadeMode(450, 800);
  const player = new Player(100, -4500);

  m.initiateEntropyTransition(player, 5000);
  assert.equal(m.entropySubPhase, 'transition');
  assert.equal(player.noclip, true);

  // Simular que el jugador asciende hasta alcanzar la plataforma base superior (-5000 + 60)
  player.y = -5000 + 60;
  m.update(0.016, 5000, player);

  assert.equal(m.entropySubPhase, 'descent', 'debe pasar a sub-fase descent');
  assert.equal(player.noclip, false, 'noclip debe desactivarse');
  assert.equal(player.x, 450 / 2 - player.width / 2, 'jugador centrado en la plataforma base');
  assert.equal(player.y, -5000 + 60 + 18 + 4, 'jugador colocado en la cara inferior');
});

test('ArcadeMode: cámara sigue hacia abajo durante descenso en Entropía', () => {
  const m = new ArcadeMode(450, 800);
  const player = new Player(0, 0);

  m.initiateEntropyTransition(player, 5000);
  m.entropySubPhase = 'descent';
  player.gravityDirection = -1;

  // Jugador desciende hacia y = -4000 (cámara debe bajar de 5000 a 4000 + 800*0.55 = 4440 o menor)
  player.y = -4000;
  const targetCam = -player.y + 800 * 0.55; // 4000 + 440 = 4440
  const cam = m.updateCamera(5000, player, 0.016);
  assert.equal(cam, targetCam, 'cámara debe descender con el jugador');
});

test('ArcadeMode: genera plataformas por encima de la cámara en Estructura', () => {
  const m = new ArcadeMode(450, 800);
  const before = m.highestPlatformY;
  // Con cámara en 5000, debe generar plataformas hasta -cameraY - height*1.8 = -6440
  m.update(0.016, 5000, new Player(0, 0));
  assert.ok(m.highestPlatformY < before, 'debe generar plataformas más altas');
});

test('ArcadeMode: plataformas óptimas consecutivas están a distancia alcanzable', () => {
  const m = new ArcadeMode(450, 800);
  // Generar suficientes plataformas para tener varias óptimas
  m.update(0.016, 2000, new Player(0, 0));
  
  const optimalPlatforms = m.platforms.filter(p => p.isOptimal).sort((a, b) => b.y - a.y);
  assert.ok(optimalPlatforms.length >= 3, 'debe haber al menos 3 plataformas óptimas');
  
  // Verificar que la distancia horizontal entre óptimas consecutivas sea alcanzable
  const maxHorizontalReach = 280;
  for (let i = 1; i < optimalPlatforms.length; i++) {
    const prev = optimalPlatforms[i - 1];
    const curr = optimalPlatforms[i];
    const prevCenterX = prev.x + prev.width / 2;
    const currCenterX = curr.x + curr.width / 2;
    const distance = Math.abs(currCenterX - prevCenterX);
    assert.ok(distance <= maxHorizontalReach + 1,
      `óptimas consecutivas a distancia ${distance}px (máx ${maxHorizontalReach}px)`);
  }
});

test('BUGFIX StageMode: las plataformas de la cima sobreviven al reciclaje', () => {
  const m = new StageMode(450, 800, 6000);
  const before = m.platforms.length;
  assert.ok(before > 40, `mapa inicial debe tener plataformas (hay ${before})`);

  // Tras la cinemática, update() con cámara en 0 no debe borrar la cima (-6000)
  m.isSweepingCamera = false;
  m.update(0.016, 0, new Player(0, 0));

  const summitStillThere = m.platforms.some(p => p.y < -4500);
  assert.ok(summitStillThere,
    'BUGFIX: la cima del mapa no debe reciclarse con pruneHeightAbove = stageLength + height');
});

test('StageMode: la medalla respeta la jerarquía del GDD', () => {
  const m = new StageMode(450, 800, 6000, 3); // 18000px total
  assert.equal(m.calculateMedal(18000).name, 'Bronce', 'cima 100% = Bronce');
  assert.equal(m.calculateMedal(13600).name, 'Oro', '>=75% en derrota = Oro');
  assert.equal(m.calculateMedal(9100).name, 'Plata', '>=50% en derrota = Plata');
  assert.equal(m.calculateMedal(1000).name, 'Sin Medalla', '<50% sin medalla');
});

test('StageMode: genera 3 tramos secuenciales (GDD §2.2)', () => {
  const m = new StageMode(450, 800, 6000, 3);
  assert.equal(m.stageLength, 18000, 'longitud total = 3 × segmento');
  
  // Verificar que hay plataformas distribuidas en los 3 tramos
  const tramo1 = m.platforms.filter(p => p.y <= 0 && p.y > -6000);
  const tramo2 = m.platforms.filter(p => p.y <= -6000 && p.y > -12000);
  const tramo3 = m.platforms.filter(p => p.y <= -12000 && p.y > -18000);
  
  assert.ok(tramo1.length > 30, `tramo 1 debe tener plataformas (hay ${tramo1.length})`);
  assert.ok(tramo2.length > 30, `tramo 2 debe tener plataformas (hay ${tramo2.length})`);
  assert.ok(tramo3.length > 30, `tramo 3 debe tener plataformas (hay ${tramo3.length})`);
});

test('SEPHIROTH_NODES: alturas ascendentes hacia Kether', () => {
  for (let i = 1; i < SEPHIROTH_NODES.length; i++) {
    assert.ok(SEPHIROTH_NODES[i].height > SEPHIROTH_NODES[i - 1].height,
      `${SEPHIROTH_NODES[i].name} debe estar por encima de ${SEPHIROTH_NODES[i - 1].name}`);
  }
});

// =========================================================
// Engine
// =========================================================
function makeEngine() {
  const e = new Engine(mockCanvas, noopCtx);
  const player = new Player(200, 400);
  const mode = new ArcadeMode(450, 800);
  e.setPlayer(player);
  e.setMode(mode);
  e.setInput(idleInput);
  return { e, player, mode };
}

test('Engine: ArcadeMode transiciona a Entropía al perder todas las vidas', () => {
  const { e, player, mode } = makeEngine();
  let over = null;
  e.onGameOver = (score) => { over = score; };

  // Configurar estado inicial
  e.lives = 1;                  // una sola vida restante
  mode.lastSafePlatform = { x: 100, y: 300, width: 60, height: 16 };
  player.y = 100000;            // fuera de pantalla (caída al abismo)
  assert.equal(mode.phase, 'structure', 'debe empezar en fase structure');

  e.update(0.016);
  
  // Verificar transición a Entropía
  assert.equal(mode.phase, 'entropy', 'debe transicionar a entropy');
  assert.equal(e.lives, 3, 'vidas deben restaurarse a 3');
  assert.equal(player.gravityDirection, -1, 'gravedad debe invertirse');
  assert.equal(e.degradationLevel, 0, 'degradación debe resetearse');
  assert.equal(over, null, 'NO debe disparar onGameOver en transición');
});

test('Engine: ArcadeMode retorna a Estructura al perder todas las vidas en Entropía', () => {
  const { e, player, mode } = makeEngine();
  let over = null;
  e.onGameOver = (score) => { over = score; };

  // Configurar estado en fase Entropía
  mode.phase = 'entropy';
  mode.entropySubPhase = 'descent';
  player.gravityDirection = -1;
  e.lives = 1;                  // una sola vida restante
  mode.lastSafePlatform = { x: 100, y: -4000, width: 60, height: 16 };
  player.y = -100000;           // fuera de pantalla en gravedad invertida (caída hacia arriba)

  e.update(0.016);
  
  // Verificar ciclo de vuelta a Estructura
  assert.equal(mode.phase, 'structure', 'debe retornar a fase structure');
  assert.equal(e.lives, 3, 'vidas deben restaurarse a 3');
  assert.equal(player.gravityDirection, 1, 'gravedad debe volver a normal (1)');
  assert.equal(e.cameraY, 0, 'cámara debe resetearse a 0');
  assert.equal(over, null, 'NO debe ser game over directo sino ciclo');
});

test('Engine: triggerDegradation resta una vida y llama callbacks', () => {
  const { e } = makeEngine();
  let lostCalled = 0;
  let livesUpdate = 0;
  e.onLifeLost = () => { lostCalled++; };
  e.onLivesUpdate = () => { livesUpdate++; };

  e.triggerDegradation();
  assert.equal(e.lives, 2);
  assert.equal(lostCalled, 1, 'onLifeLost debe llamarse');
  assert.equal(livesUpdate, 1, 'onLivesUpdate debe llamarse');
});

test('Engine: triggerDegradation respawnea en la última plataforma segura', () => {
  const { e, player, mode } = makeEngine();
  e.onLifeLost = () => {};
  e.onLivesUpdate = () => {};

  const safe = { x: 100, y: 300, width: 60, height: 16 };
  mode.lastSafePlatform = safe;
  e.triggerDegradation();

  assert.equal(e.lives, 2);
  assert.equal(player.x, safe.x + safe.width / 2 - player.width / 2,
    'jugador centrado sobre la plataforma segura');
  assert.ok(player.vy < 0, 'impulso inicial hacia arriba');
});

test('Engine: Escudo del Vacío salva de la caída sin perder vida', () => {
  const { e, player, mode } = makeEngine();
  let lost = 0;
  e.onLifeLost = () => { lost++; };
  e.onLivesUpdate = () => {};
  mode.lastSafePlatform = { x: 100, y: 300, width: 60, height: 16 };

  player.hasVoidShield = true;
  player.synchrony = 100;
  player.y = 100000; // fuera de pantalla

  e.update(0.016);
  assert.equal(e.lives, 3, 'el escudo no debe costar una vida');
  assert.equal(lost, 0);
  assert.equal(player.synchrony, 70, 'sincronía reducida tras usar el escudo');
});

test('Engine: reset restaura el estado inicial', () => {
  const { e } = makeEngine();
  e.score = 500;
  e.cameraY = 500;
  e.lives = 1;
  e.degradationLevel = 2;
  e.reset();
  assert.equal(e.score, 0);
  assert.equal(e.cameraY, 0);
  assert.equal(e.lives, 3);
  assert.equal(e.degradationLevel, 0);
});

// =========================================================
// TutorialMode
// =========================================================
test('TutorialMode: genera mapa espaciado, adapta textos al dispositivo y avanza zonas', () => {
  const tutDesktop = new TutorialMode(450, 800, true, 'keyboard');
  assert.ok(tutDesktop.isTutorial, 'debe ser modo tutorial');
  assert.ok(tutDesktop.platforms.length >= 20, 'debe tener un mapa amplio con 20+ plataformas');
  
  // Validar textos adaptativos
  const step1Desktop = getTutorialStepData(1, true, 'keyboard');
  assert.ok(step1Desktop.text.includes('teclas A / D'), 'debe mencionar teclas en desktop');

  const step1MobileSwipe = getTutorialStepData(1, false, 'swipe');
  assert.ok(step1MobileSwipe.text.includes('Desliza tu pulgar'), 'debe mencionar swipe en móvil');

  const step1MobileGyro = getTutorialStepData(1, false, 'gyro');
  assert.ok(step1MobileGyro.text.includes('Inclina suavemente'), 'debe mencionar giro en móvil');

  let stepReceived = null;
  tutDesktop.onTutorialStepChange = (data) => {
    stepReceived = data;
  };

  const p = new Player(225, 750);
  tutDesktop.update(0.016, 0, p);
  assert.equal(tutDesktop.currentStep, 1);

  // Simular ascenso a la Zona 2 (Sincronía)
  p.y = 800 - 50 - 650; // progressY = 650 > 580 -> zona 2
  tutDesktop.update(0.016, 0, p);
  assert.equal(tutDesktop.currentStep, 2);
  assert.ok(stepReceived);
  assert.equal(stepReceived.step, 2);

  // Reclamar medalla de iniciación
  const medal = tutDesktop.calculateMedal();
  assert.equal(medal.name, 'Iniciación');
});

