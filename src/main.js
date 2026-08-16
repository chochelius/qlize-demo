import { Engine } from './engine.js';
import { Player } from './player.js';
import { ArcadeMode, StageMode, TutorialMode, getTutorialStepData } from './modes.js';
import { QlizeAudioManager } from './audio.js';
import { OverworldManager, OVERWORLD_GRAPH } from './overworld.js';
import { qa } from './qa.js';

const audio = new QlizeAudioManager();
const overworld = new OverworldManager();

// Claves y nombres centralizados (evita typos en strings mágicos repetidos)
const SETTINGS_STORAGE_KEY = 'qlize_jump_settings';
const MEDAL_NAMES = {
  bronce: 'Bronce',
  oro: 'Oro',
  plata: 'Plata',
  iniciacion: 'Iniciación'
};
const VICTORY_MEDALS = new Set([MEDAL_NAMES.bronce, MEDAL_NAMES.oro, MEDAL_NAMES.plata, MEDAL_NAMES.iniciacion]);
const STAGE_MEDALS = new Set([MEDAL_NAMES.bronce, MEDAL_NAMES.oro, MEDAL_NAMES.plata]);

// Detección de dispositivo
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasGyroscope = 'DeviceOrientationEvent' in window && isMobile;
const isDesktop = !isMobile;

console.log('[QLIZE] Detección de dispositivo:');
console.log('  - isMobile:', isMobile);
console.log('  - hasTouchscreen:', hasTouchscreen);
console.log('  - hasGyroscope:', hasGyroscope);
console.log('  - isDesktop:', isDesktop);

// Frases Místicas Aleatorias para la Pantalla de Inicio
let cachedMysticPhrases = null;

export async function updateMysticSubtitle() {
  const subtitleEl = document.getElementById('game-subtitle');
  if (!subtitleEl) return;

  try {
    if (!cachedMysticPhrases) {
      const res = await fetch('/qlize-frases-misticas.json');
      if (res.ok) {
        cachedMysticPhrases = await res.json();
      }
    }
    if (Array.isArray(cachedMysticPhrases) && cachedMysticPhrases.length > 0) {
      const item = cachedMysticPhrases[Math.floor(Math.random() * cachedMysticPhrases.length)];
      const rawPhrase = item.frase || item;
      subtitleEl.innerText = rawPhrase.replace(/\.$/, '').toUpperCase();
    }
  } catch {
    // Fallback silencioso
  }
}

updateMysticSubtitle();

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const engine = new Engine(canvas, ctx);
engine.setAudio(audio);

// Perfiles Predefinidos (Presets)
const PRESETS = {
  soft: {
    swipeSens: 0.8,
    acceleration: 1100,
    maxSpeed: 280,
    friction: 0.84,
    gyroSens: 22,
    controlMode: isDesktop ? 'keyboard' : 'swipe'
  },
  balanced: {
    swipeSens: 1.0,
    acceleration: 1400,
    maxSpeed: 340,
    friction: 0.86,
    gyroSens: 20,
    controlMode: isDesktop ? 'keyboard' : 'swipe'
  },
  fast: {
    swipeSens: 1.4,
    acceleration: 1900,
    maxSpeed: 420,
    friction: 0.89,
    gyroSens: 14,
    controlMode: isDesktop ? 'keyboard' : 'swipe'
  }
};

const DEFAULT_SETTINGS = {
  ...PRESETS.balanced,
  musicVolume: 0.65
};
export const gameSettings = { ...DEFAULT_SETTINGS };

// Cargar ajustes guardados
const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
if (savedSettings) {
  try {
    Object.assign(gameSettings, JSON.parse(savedSettings));
  } catch (e) {
    console.error('Error cargando configuración:', e);
  }
}
if (gameSettings.musicVolume !== undefined) {
  audio.setMasterVolume(gameSettings.musicVolume);
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(gameSettings));
  } catch (e) {
    console.error('Error guardando configuración:', e);
  }
}

// Controles
const input = { left: false, right: false, axis: 0 };

// --- Teclado ---
window.addEventListener('keydown', (e) => {
  audio.init();
  // Solo mueve al jugador con una partida activa: evita el crosstalk con los
  // atajos de menú (p. ej. KeyA inicia Arcade desde el menú principal y el
  // jugador arrancaba moviéndose a la izquierda)
  if (!engine.isRunning) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    input.left = true;
    input.axis = -1;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    input.right = true;
    input.axis = 1;
  }
});
window.addEventListener('keyup', (e) => {
  // Sin guardia de engine.isRunning a propósito: siempre debe poder limpiarse
  // una tecla aunque se haya soltado con el juego en pausa o en un menú
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    input.left = false;
    input.axis = input.right ? 1 : 0;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    input.right = false;
    input.axis = input.left ? -1 : 0;
  }
});

// Si la ventana pierde el foco (cambio de pestaña/ventana) con una tecla
// pulsada, el keyup nunca llega: resetear el input para no quedar pegado
function resetInputState() {
  input.left = false;
  input.right = false;
  input.axis = 0;
}
window.addEventListener('blur', resetInputState);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetInputState();
});

// --- Táctil (Swipe) ---
let lastTouchX = 0;
let isTouching = false;
let touchTimeout = null;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  audio.init();
  if (gameSettings.controlMode !== 'swipe') return;
  if (e.touches.length > 0) {
    lastTouchX = e.touches[0].clientX;
    isTouching = true;
    input.left = false;
    input.right = false;
    input.axis = 0;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (gameSettings.controlMode !== 'swipe') return;
  if (!isTouching || e.touches.length === 0) return;

  const currentTouchX = e.touches[0].clientX;
  const deltaX = currentTouchX - lastTouchX;

  if (Math.abs(deltaX) > 1.5) {
    const rawIntensity = (Math.abs(deltaX) / 14) * gameSettings.swipeSens;
    const intensity = Math.min(1, Math.max(0.2, rawIntensity));
    input.axis = Math.sign(deltaX) * intensity;

    if (deltaX > 0) {
      input.right = true;
      input.left = false;
    } else {
      input.left = true;
      input.right = false;
    }
  }

  lastTouchX = currentTouchX;

  clearTimeout(touchTimeout);
  touchTimeout = setTimeout(() => {
    input.left = false;
    input.right = false;
    input.axis = 0;
  }, 60);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (e.touches.length === 0) {
    isTouching = false;
    input.left = false;
    input.right = false;
    input.axis = 0;
    clearTimeout(touchTimeout);
  }
}, { passive: false });

// --- Giroscopio ---
window.addEventListener('deviceorientation', (e) => {
  const tilt = e.gamma;
  if (tilt === null) return;
  if (gameSettings.controlMode !== 'gyro') return;

  if (!isTouching) {
    if (Math.abs(tilt) > 4) {
      const intensity = Math.min(1, (Math.abs(tilt) - 4) / gameSettings.gyroSens);
      input.axis = Math.sign(tilt) * intensity;
      if (tilt > 0) {
        input.right = true;
        input.left = false;
      } else {
        input.left = true;
        input.right = false;
      }
    } else {
      input.left = false;
      input.right = false;
      input.axis = 0;
    }
  }
});

async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      await DeviceOrientationEvent.requestPermission();
    } catch(e) {
      console.error(e);
    }
  }
}

// Elementos UI
const screenMenu = document.getElementById('screen-menu');
const screenGameover = document.getElementById('screen-gameover');
const screenSettings = document.getElementById('screen-settings');
const screenPause = document.getElementById('screen-pause');
const pauseMantraEl = document.getElementById('pause-mantra');

const btnArcade = document.getElementById('btn-arcade');
const btnStage = document.getElementById('btn-stage');
const btnTutorial = document.getElementById('btn-tutorial');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsReset = document.getElementById('btn-settings-reset');
const btnSettingsX = document.getElementById('btn-settings-x');
const btnExitGame = document.getElementById('btn-exit-game');

// Elementos del Overworld (El Árbol de la Vida)
const screenOverworld = document.getElementById('screen-overworld');
const overworldViewport = document.getElementById('overworld-viewport');
const btnOverworldBack = document.getElementById('btn-overworld-back');
const overworldLinesSvg = document.getElementById('overworld-lines-svg');
const overworldNodesContainer = document.getElementById('overworld-nodes-container');
const overworldProgressCounter = document.getElementById('overworld-progress-counter');
const overworldStageCard = document.getElementById('overworld-stage-card');
const cardSefiraNum = document.getElementById('card-sefira-num');
const cardSefiraPhonetic = document.getElementById('card-sefira-phonetic');
const cardStageTitle = document.getElementById('card-stage-title');
const cardStageDesc = document.getElementById('card-stage-desc');
const cardStageTrait = document.getElementById('card-stage-trait');
const cardStageDiff = document.getElementById('card-stage-diff');
const cardStageLength = document.getElementById('card-stage-length');
const cardStageGravity = document.getElementById('card-stage-gravity');
const cardStageMedal = document.getElementById('card-stage-medal');
const btnStartStage = document.getElementById('btn-start-stage');

const btnPauseResume = document.getElementById('btn-pause-resume');
const btnPauseRestart = document.getElementById('btn-pause-restart');
const btnPauseSettings = document.getElementById('btn-pause-settings');
const btnPauseMenu = document.getElementById('btn-pause-menu');

const hudTutorialBanner = document.getElementById('hud-tutorial-banner');
const tutorialBadge = document.getElementById('tutorial-badge');
const tutorialTitle = document.getElementById('tutorial-title');
const tutorialText = document.getElementById('tutorial-text');

const controlKeyboard = document.getElementById('control-keyboard');
const controlSwipe = document.getElementById('control-swipe');
const controlGyro = document.getElementById('control-gyro');

const hud = document.getElementById('hud');
const phaseIndicator = document.getElementById('phase-indicator');
const phaseText = document.getElementById('phase-text');
const syncValEl = document.getElementById('sync-val');
const syncMultiplierEl = document.getElementById('sync-multiplier');
const finalScoreEl = document.getElementById('final-score');
const distanceCursorEl = document.getElementById('distance-cursor');

const medalIconEl = document.getElementById('medal-icon');
const medalTitleEl = document.getElementById('medal-title');
const gameoverTitleEl = document.getElementById('gameover-title');

const life1 = document.getElementById('life-1');
const life2 = document.getElementById('life-2');
const life3 = document.getElementById('life-3');

// Sliders de Configuración
const sliderMusicVolume = document.getElementById('slider-music-volume');
const sliderSwipeSens = document.getElementById('slider-swipe-sens');
const sliderAcceleration = document.getElementById('slider-acceleration');
const sliderMaxSpeed = document.getElementById('slider-max-speed');
const sliderFriction = document.getElementById('slider-friction');
const sliderGyroSens = document.getElementById('slider-gyro-sens');

const valMusicVolume = document.getElementById('val-music-volume');
const valSwipeSens = document.getElementById('val-swipe-sens');
const valAcceleration = document.getElementById('val-acceleration');
const valMaxSpeed = document.getElementById('val-max-speed');
const valFriction = document.getElementById('val-friction');
const valGyroSens = document.getElementById('val-gyro-sens');

const presetSoft = document.getElementById('preset-soft');
const presetBalanced = document.getElementById('preset-balanced');
const presetFast = document.getElementById('preset-fast');

function updateSettingsUI() {
  if (sliderMusicVolume && valMusicVolume) {
    const volPercent = Math.round((gameSettings.musicVolume !== undefined ? gameSettings.musicVolume : 0.65) * 100);
    sliderMusicVolume.value = volPercent;
    valMusicVolume.innerText = `${volPercent}%`;
  }

  sliderSwipeSens.value = gameSettings.swipeSens;
  valSwipeSens.innerText = gameSettings.swipeSens.toFixed(1) + 'x';

  sliderAcceleration.value = gameSettings.acceleration;
  valAcceleration.innerText = gameSettings.acceleration;

  sliderMaxSpeed.value = gameSettings.maxSpeed;
  valMaxSpeed.innerText = gameSettings.maxSpeed;

  sliderFriction.value = gameSettings.friction;
  valFriction.innerText = gameSettings.friction.toFixed(2);

  sliderGyroSens.value = gameSettings.gyroSens;
  valGyroSens.innerText = gameSettings.gyroSens + '°';

  controlKeyboard.classList.toggle('active', gameSettings.controlMode === 'keyboard');
  controlSwipe.classList.toggle('active', gameSettings.controlMode === 'swipe');
  controlGyro.classList.toggle('active', gameSettings.controlMode === 'gyro');

  if (isDesktop) {
    controlKeyboard.disabled = false;
    controlKeyboard.style.opacity = '1';
    controlKeyboard.style.cursor = 'pointer';
    controlKeyboard.innerHTML = '<span class="ming-icon">K</span> Teclado';
  } else {
    controlKeyboard.disabled = true;
    controlKeyboard.style.opacity = '0.4';
    controlKeyboard.style.cursor = 'not-allowed';
    controlKeyboard.innerHTML = '<span class="ming-icon">K</span> Teclado (No disponible)';
  }

  if (isMobile || hasTouchscreen) {
    controlSwipe.disabled = false;
    controlSwipe.style.opacity = '1';
    controlSwipe.style.cursor = 'pointer';
    controlSwipe.innerHTML = '<span class="ming-icon">S</span> Swipe';
  } else {
    controlSwipe.disabled = true;
    controlSwipe.style.opacity = '0.4';
    controlSwipe.style.cursor = 'not-allowed';
    controlSwipe.innerHTML = '<span class="ming-icon">S</span> Swipe (No disponible)';
  }

  if (hasGyroscope) {
    controlGyro.disabled = false;
    controlGyro.style.opacity = '1';
    controlGyro.style.cursor = 'pointer';
    controlGyro.innerHTML = '<span class="ming-icon">G</span> Giroscopio';
  } else {
    controlGyro.disabled = true;
    controlGyro.style.opacity = '0.4';
    controlGyro.style.cursor = 'not-allowed';
    controlGyro.innerHTML = '<span class="ming-icon">G</span> Giroscopio (No disponible)';
  }

  updatePresetButtonsState();
}

function isMatchingPreset(p) {
  // Comparación con tolerancia para los valores flotantes (parseFloat de los
  // sliders puede introducir artefactos de precisión)
  const approx = (a, b) => Math.abs(a - b) < 0.001;
  return (
    approx(gameSettings.swipeSens, p.swipeSens) &&
    gameSettings.acceleration === p.acceleration &&
    gameSettings.maxSpeed === p.maxSpeed &&
    approx(gameSettings.friction, p.friction) &&
    gameSettings.gyroSens === p.gyroSens &&
    gameSettings.controlMode === p.controlMode
  );
}

function applyPreset(p) {
  Object.assign(gameSettings, p);
  saveSettings();
  updateSettingsUI();
}

function updatePresetButtonsState() {
  presetSoft.classList.toggle('active', isMatchingPreset(PRESETS.soft));
  presetBalanced.classList.toggle('active', isMatchingPreset(PRESETS.balanced));
  presetFast.classList.toggle('active', isMatchingPreset(PRESETS.fast));
}

presetSoft.addEventListener('click', () => applyPreset(PRESETS.soft));
presetBalanced.addEventListener('click', () => applyPreset(PRESETS.balanced));
presetFast.addEventListener('click', () => applyPreset(PRESETS.fast));

updateSettingsUI();

if (sliderMusicVolume) {
  sliderMusicVolume.addEventListener('input', (e) => {
    const volPercent = parseInt(e.target.value, 10);
    gameSettings.musicVolume = volPercent / 100;
    if (valMusicVolume) valMusicVolume.innerText = `${volPercent}%`;
    audio.setMasterVolume(gameSettings.musicVolume);
  });
}

sliderSwipeSens.addEventListener('input', (e) => {
  gameSettings.swipeSens = parseFloat(e.target.value);
  valSwipeSens.innerText = gameSettings.swipeSens.toFixed(1) + 'x';
  updatePresetButtonsState();
});

sliderAcceleration.addEventListener('input', (e) => {
  gameSettings.acceleration = parseInt(e.target.value, 10);
  valAcceleration.innerText = gameSettings.acceleration;
  updatePresetButtonsState();
});

sliderMaxSpeed.addEventListener('input', (e) => {
  gameSettings.maxSpeed = parseInt(e.target.value, 10);
  valMaxSpeed.innerText = gameSettings.maxSpeed;
  updatePresetButtonsState();
});

sliderFriction.addEventListener('input', (e) => {
  gameSettings.friction = parseFloat(e.target.value);
  valFriction.innerText = gameSettings.friction.toFixed(2);
  updatePresetButtonsState();
});

sliderGyroSens.addEventListener('input', (e) => {
  gameSettings.gyroSens = parseInt(e.target.value, 10);
  valGyroSens.innerText = gameSettings.gyroSens + '°';
  updatePresetButtonsState();
});

controlKeyboard.addEventListener('click', () => {
  if (isDesktop) {
    gameSettings.controlMode = 'keyboard';
    updateSettingsUI();
  }
});

controlSwipe.addEventListener('click', () => {
  if (hasTouchscreen) {
    gameSettings.controlMode = 'swipe';
    updateSettingsUI();
  }
});

controlGyro.addEventListener('click', () => {
  if (hasGyroscope) {
    gameSettings.controlMode = 'gyro';
    updateSettingsUI();
  }
});

btnSettingsToggle.addEventListener('click', () => {
  updateSettingsUI();
  screenSettings.classList.remove('hidden');
});

btnSettingsClose.addEventListener('click', () => {
  saveSettings();
  screenSettings.classList.add('hidden');
});

btnSettingsX.addEventListener('click', () => {
  saveSettings();
  screenSettings.classList.add('hidden');
});

btnSettingsReset.addEventListener('click', () => {
  Object.assign(gameSettings, DEFAULT_SETTINGS);
  saveSettings();
  updateSettingsUI();
});

let currentModeClass = ArcadeMode;
let currentStageKey = 'stage_1';
let currentStageConfig = OVERWORLD_GRAPH.stage_1;
let selectedStageKey = 'stage_1';

const ZEN_MANTRAS = [
  "Respira. Recalibra. Asciende.",
  "En el centro del octágono habita el silencio.",
  "Fluye con el vector, domina la inercia.",
  "El orden y el caos son dos caras del mismo salto."
];

// ---------------------------------------------------------
// Controlador del Overworld: El Árbol de la Vida
// ---------------------------------------------------------
function openOverworld() {
  screenMenu.classList.add('hidden');
  screenGameover.classList.add('hidden');
  screenPause.classList.add('hidden');
  hud.classList.add('hidden');
  if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
  screenOverworld.classList.remove('hidden');
  
  renderOverworld();
  selectOverworldNode(selectedStageKey || 'stage_1', false);

  if (overworldViewport) {
    // Si estamos en Malkuth o etapa inicial, posicionar al inicio del árbol (abajo)
    if (selectedStageKey === 'stage_1') {
      setTimeout(() => {
        overworldViewport.scrollTop = overworldViewport.scrollHeight;
      }, 50);
    }
  }
}

function closeOverworld() {
  screenOverworld.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  updateMysticSubtitle();
  updateMenuSelection();
}

function renderOverworld() {
  if (!overworldLinesSvg || !overworldNodesContainer) return;
  
  // 1. Contador de progreso
  const completedCount = overworld.getCompletedCount();
  if (overworldProgressCounter) {
    overworldProgressCounter.innerText = `${completedCount} / 10 REINOS ARMONIZADOS`;
  }

  // 2. Renderizar líneas SVG del Árbol de la Estructura (Tiāndào)
  let svgHtml = '';
  Object.keys(OVERWORLD_GRAPH).forEach(srcKey => {
    const srcNode = OVERWORLD_GRAPH[srcKey];
    const srcUnlocked = overworld.isUnlocked(srcKey);
    const srcCompleted = overworld.isCompleted(srcKey);

    srcNode.connections.forEach(tgtKey => {
      const tgtNode = OVERWORLD_GRAPH[tgtKey];
      if (!tgtNode) return;

      const tgtUnlocked = overworld.isUnlocked(tgtKey);
      const tgtCompleted = overworld.isCompleted(tgtKey);

      const x1 = srcNode.x * 450;
      const y1 = srcNode.y * 820;
      const x2 = tgtNode.x * 450;
      const y2 = tgtNode.y * 820;

      let lineClass = 'locked';
      if (srcCompleted && tgtUnlocked) {
        lineClass = tgtCompleted ? 'completed' : 'active';
      } else if (srcUnlocked && tgtUnlocked) {
        lineClass = 'active';
      }

      svgHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="overworld-line ${lineClass}" />`;
    });
  });
  overworldLinesSvg.innerHTML = svgHtml;

  // 3. Renderizar Nodos Octogonales
  overworldNodesContainer.innerHTML = '';
  Object.keys(OVERWORLD_GRAPH).forEach(stageKey => {
    const node = OVERWORLD_GRAPH[stageKey];
    const isUnlocked = overworld.isUnlocked(stageKey);
    const isCompleted = overworld.isCompleted(stageKey);
    const medal = overworld.getMedal(stageKey);

    const nodeBtn = document.createElement('button');
    nodeBtn.className = 'overworld-node';
    nodeBtn.id = `node-${stageKey}`;
    nodeBtn.style.left = `${node.x * 100}%`;
    nodeBtn.style.top = `${node.y * 100}%`;
    nodeBtn.setAttribute('data-key', stageKey);
    nodeBtn.setAttribute('aria-label', `${node.id}. ${node.name} (${node.phonetic})`);

    if (isCompleted) {
      nodeBtn.classList.add('node-completed');
      nodeBtn.innerHTML = `
        <span class="node-num">${node.id}</span>
        <span class="node-concept-label">${node.shortName}</span>
        ${medal ? `<span class="node-medal-badge">${medal.icon || 'M'}</span>` : ''}
      `;
    } else if (isUnlocked) {
      nodeBtn.classList.add('node-active');
      nodeBtn.innerHTML = `
        <span class="node-num">${node.id}</span>
        <span class="node-concept-label">${node.shortName}</span>
      `;
    } else {
      nodeBtn.classList.add('node-locked');
      nodeBtn.innerHTML = `<span class="node-icon">C</span>`;
    }

    if (selectedStageKey === stageKey) {
      nodeBtn.classList.add('keyboard-selected');
    }

    nodeBtn.addEventListener('click', () => {
      if (isUnlocked) {
        selectOverworldNode(stageKey, true);
      }
    });

    overworldNodesContainer.appendChild(nodeBtn);
  });
}

function selectOverworldNode(stageKey, playSound = true) {
  const node = OVERWORLD_GRAPH[stageKey];
  if (!node) return;

  selectedStageKey = stageKey;
  currentStageKey = stageKey;
  currentStageConfig = node;

  if (playSound) audio.playNodeHover();

  // Actualizar estado visual de selección en botones
  document.querySelectorAll('.overworld-node').forEach(btn => {
    const isSelected = btn.getAttribute('data-key') === stageKey;
    btn.classList.toggle('keyboard-selected', isSelected);
    if (isSelected && playSound) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  // Poblar tarjeta flotante del Reino
  if (overworldStageCard) {
    overworldStageCard.classList.remove('hidden');
    if (cardSefiraNum) cardSefiraNum.innerText = `REINO ${node.id < 10 ? '0' + node.id : node.id}`;
    if (cardSefiraPhonetic) cardSefiraPhonetic.innerText = node.phonetic;
    if (cardStageTitle) cardStageTitle.innerText = `${node.id}. ${node.name} • ${node.title}`;
    if (cardStageDesc) cardStageDesc.innerText = node.desc;
    if (cardStageTrait) {
      cardStageTrait.innerText = node.trait || 'Reino Celestial';
      if (node.theme?.primaryColor) {
        cardStageTrait.style.borderColor = node.theme.primaryColor;
        cardStageTrait.style.color = node.theme.primaryColor;
        cardStageTrait.style.background = node.theme.glowColor || 'rgba(43, 179, 130, 0.12)';
      }
    }
    if (cardStageDiff) {
      cardStageDiff.innerText = node.difficultyStars || '★☆☆☆☆';
    }
    if (cardStageLength) cardStageLength.innerText = `${Math.floor(node.stageLength / 1000)}.000m`;
    if (cardStageGravity) cardStageGravity.innerText = `${node.gravityMultiplier.toFixed(2)}x`;
    
    const bestMedal = overworld.getMedal(stageKey);
    if (cardStageMedal) {
      cardStageMedal.innerText = bestMedal ? `${bestMedal.icon} ${bestMedal.name}` : '— Sin Medalla';
    }
  }
}

function startSelectedStage() {
  if (!overworld.isUnlocked(currentStageKey)) return;
  audio.playTibetanBowl();
  screenOverworld.classList.add('hidden');
  startGame(StageMode, currentStageConfig);
}

function startGame(modeClass, customConfig = null) {
  audio.init();
  requestOrientationPermission();
  currentModeClass = modeClass;

  screenMenu.classList.add('hidden');
  screenOverworld.classList.add('hidden');
  screenGameover.classList.add('hidden');
  screenSettings.classList.add('hidden');
  screenPause.classList.add('hidden');
  hud.classList.remove('hidden');
  phaseIndicator.classList.add('hidden');
  phaseIndicator.classList.remove('entropy');
  phaseText.innerText = 'ESTRUCTURA';

  engine.reset();

  const player = new Player(canvas.width / 2 - 16, canvas.height - 150, gameSettings);
  let mode;
  if (modeClass === TutorialMode) {
    mode = new TutorialMode(canvas.width, canvas.height, isDesktop, gameSettings.controlMode);
  } else if (modeClass === StageMode) {
    mode = new StageMode(canvas.width, canvas.height, customConfig || currentStageConfig || OVERWORLD_GRAPH.stage_1);
  } else {
    mode = new modeClass(canvas.width, canvas.height);
  }

  engine.setPlayer(player);
  engine.setMode(mode);
  engine.setInput(input);

  // Configuración especial de Tutorial Mode (Iniciación Guiada)
  if (modeClass === TutorialMode) {
    const initialStep = getTutorialStepData(1, isDesktop, gameSettings.controlMode);
    if (hudTutorialBanner) {
      hudTutorialBanner.classList.remove('hidden');
      if (tutorialBadge) tutorialBadge.innerText = initialStep.badge;
      if (tutorialTitle) tutorialTitle.innerText = initialStep.title;
      if (tutorialText) tutorialText.innerText = initialStep.text;
    }
    mode.onTutorialStepChange = (stepData) => {
      if (tutorialBadge) tutorialBadge.innerText = stepData.badge;
      if (tutorialTitle) tutorialTitle.innerText = stepData.title;
      if (tutorialText) tutorialText.innerText = stepData.text;
      if (hudTutorialBanner) {
        hudTutorialBanner.style.animation = 'none';
        hudTutorialBanner.offsetHeight; // forzar reflow
        hudTutorialBanner.style.animation = 'fadeInTutorial 0.4s ease-out';
      }
    };
  } else {
    if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
  }

  // Iniciar banda sonora adaptativa con intro_tema (1).mp3
  audio.startMusic();

  // Callbacks del Motor
  engine.onPhaseChange = (phase) => {
    if (modeClass === ArcadeMode) {
      phaseIndicator.classList.remove('hidden');
      if (phase === 'entropy') {
        phaseIndicator.classList.add('entropy');
        phaseText.innerText = 'ENTROPÍA';
        audio.setPhase('entropy');
      } else {
        phaseIndicator.classList.remove('entropy');
        phaseText.innerText = 'ESTRUCTURA';
        audio.setPhase('structure');
      }
    }
  };

  const modeName = modeClass === TutorialMode ? 'Iniciación' : (modeClass === StageMode ? 'Modo Historia' : 'Modo Arcade');
  const stageName = modeClass === StageMode ? (customConfig || currentStageConfig)?.name || 'Wángguó' : 'N/A';

  qa.logEvent('game_start', { mode: modeName, stage: stageName });

  engine.onGameOver = (score, realm, medal) => {
    if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
    if (medal && VICTORY_MEDALS.has(medal.name)) {
      audio.playVictory();
    } else {
      audio.playLifeLost();
    }

    const syncRatio = engine.mode?.getSynchronyRatio ? engine.mode.getSynchronyRatio() : 1.0;
    qa.logEvent('game_over', {
      mode: modeName,
      stage: stageName,
      score,
      syncRatio,
      lives: engine.lives,
      medal: medal?.name || 'Sin Medalla'
    });

    if (modeClass === StageMode && medal && STAGE_MEDALS.has(medal.name)) {
      overworld.completeStage(currentStageKey, score, medal);
    }

    finalScoreEl.innerText = Math.floor(score);
    if (medal) {
      medalIconEl.innerText = medal.icon;
      medalTitleEl.innerText = `${medal.name} • ${medal.title}`;
      medalIconEl.classList.remove('hidden');
      medalTitleEl.classList.remove('hidden');
      gameoverTitleEl.innerText = medal.name === MEDAL_NAMES.iniciacion ? '¡INICIACIÓN COMPLETADA!' : (medal.name === MEDAL_NAMES.bronce ? '¡CIMA CONQUISTADA!' : 'ETAPA FINALIZADA');
    } else {
      medalIconEl.classList.add('hidden');
      medalTitleEl.classList.add('hidden');
      gameoverTitleEl.innerText = 'RECORRIDO TERMINADO';
    }
    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  engine.onScoreUpdate = (score, currentProgress) => {
    const progress = currentProgress !== undefined ? currentProgress : 0;
    distanceCursorEl.style.top = `${100 - progress}%`;
  };

  engine.onSyncUpdate = (sync) => {
    syncValEl.innerText = `${sync}%`;
    let mult = 'x1.0';
    if (sync >= 90) mult = 'x3.0';
    else if (sync >= 60) mult = 'x2.0';
    else if (sync >= 30) mult = 'x1.5';
    syncMultiplierEl.innerText = mult;
  };

  engine.onLivesUpdate = (lives) => {
    life1.classList.toggle('lost', lives < 1);
    life2.classList.toggle('lost', lives < 2);
    life3.classList.toggle('lost', lives < 3);
  };

  engine.onStageComplete = (score, medal) => {
    if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
    audio.playVictory();
    
    const syncRatio = engine.mode?.getSynchronyRatio ? engine.mode.getSynchronyRatio() : 1.0;
    qa.logEvent('stage_complete', {
      mode: 'Modo Historia',
      stage: currentStageConfig?.name || 'Wángguó',
      score,
      syncRatio,
      medal: medal?.name || 'Bronce'
    });

    if (modeClass === StageMode) {
      overworld.completeStage(currentStageKey, score, medal);
    }

    finalScoreEl.innerText = Math.floor(score);
    medalIconEl.innerText = medal.icon;
    medalTitleEl.innerText = `${medal.name} • ${medal.title}`;
    medalIconEl.classList.remove('hidden');
    medalTitleEl.classList.remove('hidden');
    gameoverTitleEl.innerText = medal.name === MEDAL_NAMES.iniciacion ? '¡INICIACIÓN COMPLETADA!' : '¡CIMA SAGRADA CONQUISTADA!';
    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  engine.start();
}

btnArcade.addEventListener('click', () => startGame(ArcadeMode));
btnStage.addEventListener('click', () => openOverworld());
if (btnTutorial) btnTutorial.addEventListener('click', () => startGame(TutorialMode));
btnRestart.addEventListener('click', () => {
  if (currentModeClass === StageMode) {
    startGame(StageMode, currentStageConfig);
  } else {
    startGame(currentModeClass);
  }
});

btnMenu.addEventListener('click', () => {
  audio.stopMusic();
  if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
  screenGameover.classList.add('hidden');

  const executeExit = () => {
    if (currentModeClass === StageMode) {
      openOverworld();
    } else {
      screenMenu.classList.remove('hidden');
      updateMysticSubtitle();
    }
    hud.classList.add('hidden');
  };

  if (qa.isEnabled() && (currentModeClass === StageMode || currentModeClass === ArcadeMode)) {
    const curStage = currentModeClass === StageMode ? (currentStageConfig?.name || 'Wángguó') : 'Infinito';
    const curMode = currentModeClass === StageMode ? 'Modo Historia' : 'Modo Arcade';
    const syncRatio = engine.mode?.getSynchronyRatio ? engine.mode.getSynchronyRatio() : 1.0;
    qa.showFeedbackPrompt({
      mode: curMode,
      stage: curStage,
      score: engine.score || 0,
      syncRatio,
      onComplete: executeExit
    });
  } else {
    executeExit();
  }
});

if (btnOverworldBack) {
  btnOverworldBack.addEventListener('click', () => closeOverworld());
}
if (btnStartStage) {
  btnStartStage.addEventListener('click', () => startSelectedStage());
}

// Menú de Pausa ("El Silencio Creativo")
function openPauseMenu() {
  if (!engine.isRunning) return;
  engine.stop();
  audio.pauseMusic();
  if (pauseMantraEl) {
    const randomMantra = ZEN_MANTRAS[Math.floor(Math.random() * ZEN_MANTRAS.length)];
    pauseMantraEl.innerText = randomMantra;
  }
  screenPause.classList.remove('hidden');
}

function resumeGame() {
  screenPause.classList.add('hidden');
  screenSettings.classList.add('hidden');
  audio.resumeMusic();
  engine.start();
}

function exitToMenu() {
  screenPause.classList.add('hidden');
  screenSettings.classList.add('hidden');
  hud.classList.add('hidden');
  if (hudTutorialBanner) hudTutorialBanner.classList.add('hidden');
  engine.stop();
  audio.stopMusic();
  input.left = false;
  input.right = false;
  input.axis = 0;

  const executeExit = () => {
    if (currentModeClass === StageMode) {
      openOverworld();
    } else {
      screenMenu.classList.remove('hidden');
      updateMysticSubtitle();
    }
  };

  if (qa.isEnabled() && (currentModeClass === StageMode || currentModeClass === ArcadeMode) && engine.score > 100) {
    const curStage = currentModeClass === StageMode ? (currentStageConfig?.name || 'Wángguó') : 'Infinito';
    const curMode = currentModeClass === StageMode ? 'Modo Historia' : 'Modo Arcade';
    const syncRatio = engine.mode?.getSynchronyRatio ? engine.mode.getSynchronyRatio() : 1.0;
    qa.showFeedbackPrompt({
      mode: curMode,
      stage: curStage,
      score: engine.score || 0,
      syncRatio,
      onComplete: executeExit
    });
  } else {
    executeExit();
  }
}

btnPauseResume.addEventListener('click', resumeGame);
btnPauseRestart.addEventListener('click', () => {
  screenPause.classList.add('hidden');
  if (currentModeClass === StageMode) {
    startGame(StageMode, currentStageConfig);
  } else {
    startGame(currentModeClass);
  }
});
btnPauseSettings.addEventListener('click', () => {
  updateSettingsUI();
  screenSettings.classList.remove('hidden');
});
btnPauseMenu.addEventListener('click', exitToMenu);

if (btnExitGame) {
  btnExitGame.addEventListener('click', () => {
    saveSettings();
    screenSettings.classList.add('hidden');
    exitToMenu();
  });
}

// Cableado de Botones de Modal QA Feedback
document.querySelectorAll('.qa-star-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = parseInt(btn.getAttribute('data-val') || '5', 10);
    qa.updateRatingUI(val);
  });
});

const btnQaSubmit = document.getElementById('btn-qa-submit');
const btnQaOmit = document.getElementById('btn-qa-omit');
const btnQaSuppress = document.getElementById('btn-qa-suppress');
const qaCommentInput = document.getElementById('qa-feedback-comment');

if (btnQaSubmit) {
  btnQaSubmit.addEventListener('click', () => {
    qa.submitFeedback(qaCommentInput ? qaCommentInput.value : '');
  });
}
if (btnQaOmit) {
  btnQaOmit.addEventListener('click', () => {
    qa.omitFeedback();
  });
}
if (btnQaSuppress) {
  btnQaSuppress.addEventListener('click', () => {
    qa.suppressSessionFeedback();
  });
}

// ---------------------------------------------------------
// Botón "Atrás" del Sistema (Android / gestos de retroceso)
// ---------------------------------------------------------
// Se captura el botón atrás del navegador para que nunca abandone la
// página: en partida abre el menú de pausa y en cada menú sube un nivel
// (Ajustes → cerrar · Overworld → menú principal · Pausa → reanudar ·
// Game Over → menú que corresponda). En el menú principal no hay nivel
// superior, así que simplemente se retiene la navegación.
// Mecanismo: una entrada de historial centinela que se repone en cada
// popstate, de modo que toda pulsación de "atrás" queda interceptada.
function navigateBack() {
  if (!screenSettings.classList.contains('hidden')) {
    saveSettings();
    screenSettings.classList.add('hidden');
    return;
  }
  if (!screenOverworld.classList.contains('hidden')) {
    closeOverworld();
    return;
  }
  if (!screenPause.classList.contains('hidden')) {
    resumeGame();
    return;
  }
  if (!screenGameover.classList.contains('hidden')) {
    btnMenu.click();
    return;
  }
  if (engine.isRunning) {
    openPauseMenu();
  }
}

function armBackGuard() {
  history.pushState({ qlize: 'back-guard' }, '');
}

armBackGuard();
window.addEventListener('popstate', () => {
  navigateBack();
  armBackGuard();
});

// ---------------------------------------------------------
// Navegación Universal por Teclado (Cyber-Zen Octogonal)
// ---------------------------------------------------------
const menuButtons = [btnArcade, btnStage, btnTutorial].filter(Boolean);
const pauseButtons = [btnPauseResume, btnPauseRestart, btnPauseSettings, btnPauseMenu].filter(Boolean);
const gameoverButtons = [btnRestart, btnMenu].filter(Boolean);

let menuFocusIdx = 0;
let pauseFocusIdx = 0;
let gameoverFocusIdx = 0;

function clearSelections() {
  document.querySelectorAll('.keyboard-selected').forEach(el => el.classList.remove('keyboard-selected'));
}

function setSelection(buttonList, index) {
  clearSelections();
  if (buttonList[index]) {
    buttonList[index].classList.add('keyboard-selected');
    buttonList[index].focus();
  }
}

function updateMenuSelection() {
  if (!screenMenu.classList.contains('hidden')) {
    setSelection(menuButtons, menuFocusIdx);
  }
}

// Limpiar selección de teclado cuando el usuario usa el ratón
window.addEventListener('mousemove', () => {
  clearSelections();
});

window.addEventListener('keydown', (e) => {
  // 1. Manejo de Escape: comparte jerarquía con el botón atrás del sistema
  //    (navigateBack decide el nivel superior según la pantalla activa)
  if (e.code === 'Escape') {
    navigateBack();
    return;
  }

  // 2. Navegación en Pantalla de Overworld (El Árbol de la Vida)
  if (!screenOverworld.classList.contains('hidden')) {
    const stageKeys = Object.keys(OVERWORLD_GRAPH);
    const currentIdx = stageKeys.indexOf(selectedStageKey);

    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      // Subir en el árbol (hacia Kether / id superior)
      const nextIdx = Math.min(stageKeys.length - 1, currentIdx + 1);
      const nextKey = stageKeys[nextIdx];
      if (overworld.isUnlocked(nextKey)) {
        selectOverworldNode(nextKey, true);
      }
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      // Bajar en el árbol (hacia Malkuth / id inferior)
      const prevIdx = Math.max(0, currentIdx - 1);
      selectOverworldNode(stageKeys[prevIdx], true);
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      // Alternar columnas (e.g. Hod (3) <-> Netzach (4), Gevurah (6) <-> Chesed (7), Binah (8) <-> Chokhmah (9))
      let counterpart = null;
      if (selectedStageKey === 'stage_3') counterpart = 'stage_4';
      else if (selectedStageKey === 'stage_4') counterpart = 'stage_3';
      else if (selectedStageKey === 'stage_6') counterpart = 'stage_7';
      else if (selectedStageKey === 'stage_7') counterpart = 'stage_6';
      else if (selectedStageKey === 'stage_8') counterpart = 'stage_9';
      else if (selectedStageKey === 'stage_9') counterpart = 'stage_8';

      if (counterpart && overworld.isUnlocked(counterpart)) {
        selectOverworldNode(counterpart, true);
      }
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      startSelectedStage();
    }
    return;
  }

  // 3. Navegación en Menú de Pausa
  if (!screenPause.classList.contains('hidden')) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      pauseFocusIdx = (pauseFocusIdx + 1) % pauseButtons.length;
      setSelection(pauseButtons, pauseFocusIdx);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      pauseFocusIdx = (pauseFocusIdx - 1 + pauseButtons.length) % pauseButtons.length;
      setSelection(pauseButtons, pauseFocusIdx);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (pauseButtons[pauseFocusIdx]) pauseButtons[pauseFocusIdx].click();
    } else if (e.code === 'Digit1' || e.code === 'KeyR') {
      resumeGame();
    } else if (e.code === 'Digit2' || e.code === 'KeyN') {
      startGame(currentModeClass);
    } else if (e.code === 'Digit3' || e.code === 'KeyA') {
      updateSettingsUI();
      screenSettings.classList.remove('hidden');
    } else if (e.code === 'Digit4' || e.code === 'KeyM') {
      exitToMenu();
    }
    return;
  }

  // 4. Navegación en Pantalla de Game Over
  if (!screenGameover.classList.contains('hidden')) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      gameoverFocusIdx = (gameoverFocusIdx + 1) % gameoverButtons.length;
      setSelection(gameoverButtons, gameoverFocusIdx);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (gameoverButtons[gameoverFocusIdx]) gameoverButtons[gameoverFocusIdx].click();
    } else if (e.code === 'Digit1' || e.code === 'KeyR') {
      btnRestart.click();
    } else if (e.code === 'Digit2' || e.code === 'KeyM') {
      btnMenu.click();
    }
    return;
  }

  // 5. Pantalla de Configuración abierta (Escape cierra)
  if (!screenSettings.classList.contains('hidden')) {
    if (e.code === 'Escape') {
      saveSettings();
      screenSettings.classList.add('hidden');
    }
    return;
  }

  // 6. Navegación en Menú Principal (cuando no estamos en partida activa)
  if (!screenMenu.classList.contains('hidden') && !engine.isRunning) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      menuFocusIdx = (menuFocusIdx + 1) % menuButtons.length;
      setSelection(menuButtons, menuFocusIdx);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      menuFocusIdx = (menuFocusIdx - 1 + menuButtons.length) % menuButtons.length;
      setSelection(menuButtons, menuFocusIdx);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (menuButtons[menuFocusIdx]) menuButtons[menuFocusIdx].click();
    } else if (e.code === 'Digit1' || e.code === 'KeyA') {
      startGame(ArcadeMode);
    } else if (e.code === 'Digit2' || e.code === 'KeyE') {
      openOverworld();
    } else if (e.code === 'Digit3' || e.code === 'KeyI' || e.code === 'KeyT') {
      if (btnTutorial) startGame(TutorialMode);
    } else if (e.code === 'Digit4' || e.code === 'KeyC') {
      updateSettingsUI();
      screenSettings.classList.remove('hidden');
    }
  }
});
