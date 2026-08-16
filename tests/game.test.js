// Tests de lógica pura (sin DOM) con node:test — correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/player.js';
import { BaseMode, ArcadeMode, StageMode, SEPHIROTH_NODES } from '../src/modes.js';
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

test('ArcadeMode: fase Entropía invierte gravedad a los 5000m', () => {
  const m = new ArcadeMode(450, 800);
  const player = new Player(0, 0);

  m.update(0.016, 4900, player);
  assert.equal(m.phase, 'structure');
  assert.equal(player.gravityDirection, 1);

  m.update(0.016, 5100, player);
  assert.equal(m.phase, 'entropy', 'debe cambiar de fase sobre 5000');
  assert.equal(player.gravityDirection, -1, 'gravedad invertida en Entropía');
});

test('ArcadeMode: genera plataformas por encima de la cámara', () => {
  const m = new ArcadeMode(450, 800);
  const before = m.highestPlatformY;
  // Con cámara en 5000, debe generar plataformas hasta -cameraY - height*1.8 = -6440
  m.update(0.016, 5000, new Player(0, 0));
  assert.ok(m.highestPlatformY < before, 'debe generar plataformas más altas');
  assert.ok(m.highestPlatformY < -6440, `debe llegar hasta -6440 o más arriba (quedó en ${m.highestPlatformY})`);
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
  const m = new StageMode(450, 800, 6000);
  assert.equal(m.calculateMedal(6000).name, 'Bronce', 'cima 100% = Bronce');
  assert.equal(m.calculateMedal(4600).name, 'Oro', '>=75% en derrota = Oro');
  assert.equal(m.calculateMedal(3100).name, 'Plata', '>=50% en derrota = Plata');
  assert.equal(m.calculateMedal(1000).name, 'Sin Medalla', '<50% sin medalla');
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

test('Engine: caer fuera de pantalla sin vidas dispara onGameOver', () => {
  const { e, player, mode } = makeEngine();
  let over = null;
  e.onGameOver = (score) => { over = score; };

  // onGameOver se dispara desde update(), no desde triggerDegradation().
  e.lives = 1;                  // una sola vida restante
  mode.lastSafePlatform = null; // sin respawn disponible
  player.y = 100000;            // fuera de pantalla (caída al abismo)

  e.update(0.016);
  assert.equal(e.lives, 0);
  assert.notEqual(over, null, 'onGameOver debe dispararse al agotar vidas');
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
