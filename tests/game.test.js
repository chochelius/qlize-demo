// Tests de lógica pura (sin DOM) con node:test — correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/player.js';
import { BaseMode, ArcadeMode, StageMode, TutorialMode, getTutorialStepData, SEPHIROTH_NODES } from '../src/modes.js';
import { OverworldManager, OVERWORLD_GRAPH } from '../src/overworld.js';
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

// =========================================================
// Overworld: El Árbol de la Vida (Grafo, Nomenclatura Fonética y Progreso)
// =========================================================
test('Overworld: grafo contiene 10 Sefirot con nombres fonéticos occidentales y conexiones válidas', () => {
  const keys = Object.keys(OVERWORLD_GRAPH);
  assert.equal(keys.length, 10, 'debe contener exactamente 10 etapas (Sefirot)');
  
  // Validar Malkuth (inicio)
  const malkuth = OVERWORLD_GRAPH.stage_1;
  assert.equal(malkuth.name, 'Malkuth');
  assert.equal(malkuth.code, 'MALKUTH');
  assert.equal(malkuth.phonetic, 'MAL-KOOTH');
  assert.equal(malkuth.shortName, 'MAL');
  assert.deepEqual(malkuth.connections, ['stage_2']);

  // Validar Kether (cima final)
  const kether = OVERWORLD_GRAPH.stage_10;
  assert.equal(kether.name, 'Kether');
  assert.equal(kether.code, 'KETHER');
  assert.equal(kether.phonetic, 'KEH-THER');
  assert.equal(kether.shortName, 'KET');
  assert.deepEqual(kether.connections, []);

  // Validar que todas las conexiones apuntan a etapas existentes
  keys.forEach(k => {
    const node = OVERWORLD_GRAPH[k];
    assert.ok(node.name, `la etapa ${k} debe tener nombre`);
    assert.ok(node.phonetic, `la etapa ${k} debe tener pronunciación fonética`);
    assert.ok(node.shortName, `la etapa ${k} debe tener nombre corto`);
    node.connections.forEach(targetKey => {
      assert.ok(OVERWORLD_GRAPH[targetKey], `la conexión ${targetKey} desde ${k} debe existir en el grafo`);
    });
  });
});

test('OverworldManager: desbloqueo progresivo y registro de medallas', () => {
  // Mock simple de localStorage para el test
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  const mgr = new OverworldManager();
  assert.ok(mgr.isUnlocked('stage_1'), 'Malkuth debe estar desbloqueado por defecto');
  assert.ok(!mgr.isUnlocked('stage_2'), 'Yesod debe estar bloqueado inicialmente');
  assert.equal(mgr.getCompletedCount(), 0);

  // Completar etapa 1 (Malkuth)
  const newlyUnlocked = mgr.completeStage('stage_1', 18000, { name: 'Bronce', icon: '🥉' });
  assert.deepEqual(newlyUnlocked, ['stage_2'], 'debe desbloquear Yesod al superar Malkuth');
  assert.ok(mgr.isCompleted('stage_1'), 'Malkuth debe figurar como completada');
  assert.ok(mgr.isUnlocked('stage_2'), 'Yesod debe estar ahora desbloqueado');
  assert.equal(mgr.getCompletedCount(), 1);
  assert.equal(mgr.getMedal('stage_1').name, 'Bronce');

  // Completar etapa 2 (Yesod) -> bifurcación hacia Hod y Netzach
  const unlock2 = mgr.completeStage('stage_2', 15000, { name: 'Oro', icon: '🥇' });
  assert.deepEqual(unlock2, ['stage_3', 'stage_4'], 'debe desbloquear Hod (3) y Netzach (4)');
  assert.ok(mgr.isUnlocked('stage_3'));
  assert.ok(mgr.isUnlocked('stage_4'));

  // Test de persistencia
  const mgr2 = new OverworldManager();
  assert.ok(mgr2.isCompleted('stage_1'), 'debe persistir Malkuth completada');
  assert.ok(mgr2.isUnlocked('stage_3'), 'debe persistir Hod desbloqueada');
});

test('StageMode: acepta stageConfig personalizada y renderiza marca de agua fonética', () => {
  const customConfig = OVERWORLD_GRAPH.stage_5; // Tiphereth
  const stage = new StageMode(450, 800, customConfig);
  assert.equal(stage.stageKey, 'stage_5');
  assert.equal(stage.stageName, 'Tiphereth');
  assert.equal(stage.code, 'TIPHERETH');
  assert.equal(stage.phonetic, 'TI-FEH-RET');
  assert.equal(stage.gravityMultiplier, 1.08);

  // Verificar llamada segura a drawBackground sin fallos
  const dummyCtx = new Proxy({}, { get: () => () => dummyCtx });
  assert.doesNotThrow(() => {
    stage.drawBackground(dummyCtx, 0);
  });
});

// =========================================================
// Regresiones CODE_REVIEW (2026-08-16)
// =========================================================
test('BUGFIX TutorialMode: la Iniciación se completa al aterrizar en la plataforma de la cima', () => {
  const tut = new TutorialMode(450, 800, true, 'keyboard');
  const summit = tut.platforms.find(p => p.isSummit);
  assert.ok(summit, 'debe existir una plataforma de cima (isSummit)');

  const p = new Player(225, summit.y - 32);
  assert.equal(tut.stageComplete, false);
  tut.onPlatformStepped(summit, p);
  assert.equal(tut.stageComplete, true, 'debe completarse al pisar la cima');
  assert.equal(tut.calculateMedal().name, 'Iniciación');

  // En el aire por encima del umbral NO debe completarse (solo al aterrizar)
  const tut2 = new TutorialMode(450, 800, true, 'keyboard');
  const airborne = new Player(225, 800 - 50 - 2900);
  airborne.vy = -200;
  tut2.update(0.016, 0, airborne);
  assert.equal(tut2.stageComplete, false, 'no debe completarse en el aire');
});

test('BUGFIX TutorialMode: optimalRoute no conserva IDs huérfanos tras el rebuild del mapa', () => {
  const tut = new TutorialMode(450, 800, true, 'keyboard');
  const aliveIds = new Set(tut.platforms.map(p => p.id));
  tut.optimalRoute.forEach(id => {
    assert.ok(aliveIds.has(id), `el ID ${id} de optimalRoute debe existir en platforms`);
  });
});

test('BUGFIX ArcadeMode: volver a Estructura reinicia Sincronía y Ruta Óptima', () => {
  const arcade = new ArcadeMode(450, 800);
  const p = new Player(225, 750);

  // Simular progreso previo en Estructura
  const plat = arcade.platforms.find(pl => pl.isOptimal && !pl.isStartingPlatform);
  arcade.onPlatformStepped(plat, p);
  assert.ok(arcade.totalJumps > 0, 'debe registrar saltos antes del ciclo');

  // Ciclo completo: Entropía y retorno a Estructura
  arcade.initiateEntropyTransition(p, 5000);
  arcade.returnToStructure(p);
  arcade.respawnAtInitialPosition(p);

  assert.equal(arcade.adherenceHits, 0, 'los aciertos deben reiniciarse');
  assert.equal(arcade.totalJumps, 0, 'los saltos deben reiniciarse');
  const aliveIds = new Set(arcade.platforms.map(pl => pl.id));
  arcade.optimalRoute.forEach(id => {
    assert.ok(aliveIds.has(id), 'la ruta no debe conservar IDs de fases anteriores');
  });
});

test('Modos: getScoreAndProgress delega puntuación y progreso al modo', () => {
  const stage = new StageMode(450, 800, 6000, 3); // 18000px total
  let r = stage.getScoreAndProgress(9000, 0);
  assert.equal(r.score, 9000);
  assert.equal(r.progress, 50);

  // El score nunca baja
  r = stage.getScoreAndProgress(4000, 9000);
  assert.equal(r.score, 9000);

  // Arcade en Entropía congela el score y refleja el descenso
  const arcade = new ArcadeMode(450, 800);
  const p = new Player(225, 750);
  arcade.initiateEntropyTransition(p, 5000);
  arcade.entropySubPhase = 'descent';
  const ra = arcade.getScoreAndProgress(2500, 4321);
  assert.equal(ra.score, 4321, 'el score no cambia durante la Entropía');
  assert.equal(ra.progress, 50);
});

test('BaseMode: getOptimalPlatforms cachea y se invalida al añadir plataformas', () => {
  const stage = new StageMode(450, 800, 6000, 3);
  const first = stage.getOptimalPlatforms();
  const second = stage.getOptimalPlatforms();
  assert.equal(first, second, 'debe devolver la misma referencia cacheada');
  assert.ok(first.length > 0, 'el mapa debe tener plataformas óptimas');
  for (let i = 0; i < first.length - 1; i++) {
    assert.ok(first[i].y >= first[i + 1].y, 'orden descendente por Y');
  }

  stage.addPlatform(10, -20000, 70, 16, { isOptimal: true });
  const third = stage.getOptimalPlatforms();
  assert.notEqual(third, first, 'el caché debe invalidarse al añadir plataformas');
  assert.equal(third.length, first.length + 1);
});

test('OverworldManager: persiste el mejor puntaje por etapa', () => {
  const storageMap = new Map();
  globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
  };

  const mgr = new OverworldManager();
  mgr.completeStage('stage_1', 12000, { name: 'Oro', icon: '🥇' });
  assert.equal(mgr.getBestScore('stage_1'), 12000);

  // Un puntaje menor no debe reemplazar al mejor
  mgr.completeStage('stage_1', 9000, null);
  assert.equal(mgr.getBestScore('stage_1'), 12000);

  // Uno mayor sí lo reemplaza
  mgr.completeStage('stage_1', 15500, { name: 'Bronce', icon: '🥉' });
  assert.equal(mgr.getBestScore('stage_1'), 15500);

  // Persistencia entre instancias
  const mgr2 = new OverworldManager();
  assert.equal(mgr2.getBestScore('stage_1'), 15500);
});

