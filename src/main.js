import { Engine } from './engine.js';
import { Player } from './player.js';
import { ArcadeMode, StageMode } from './modes.js';

// =========================================================
// SINTETIZADOR DE AUDIO PROCEDIMENTAL (Web Audio API)
// Efectos de sonido dinámicos para salto, pérdida de vida y victoria
// =========================================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump(isEntropy = false) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isEntropy ? 'sawtooth' : 'sine';

      const now = this.ctx.currentTime;
      const startFreq = isEntropy ? 240 : 380;
      const endFreq = isEntropy ? 120 : 620;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playLifeLost() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playVictory() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C - E - G - C
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        const startTime = this.ctx.currentTime + idx * 0.12;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// Detección de dispositivo
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasGyroscope = 'DeviceOrientationEvent' in window;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const engine = new Engine(canvas, ctx);

// Perfiles Predefinidos (Presets)
const PRESETS = {
  soft: {
    swipeSens: 0.8,
    acceleration: 1100,
    maxSpeed: 280,
    friction: 0.84,
    gyroSens: 22,
    controlMode: 'swipe'
  },
  balanced: {
    swipeSens: 1.0,
    acceleration: 1400,
    maxSpeed: 340,
    friction: 0.86,
    gyroSens: 20,
    controlMode: 'swipe'
  },
  fast: {
    swipeSens: 1.4,
    acceleration: 1900,
    maxSpeed: 420,
    friction: 0.89,
    gyroSens: 14,
    controlMode: 'swipe'
  }
};

const DEFAULT_SETTINGS = { ...PRESETS.balanced };
export const gameSettings = { ...DEFAULT_SETTINGS };

// Cargar ajustes guardados
const savedSettings = localStorage.getItem('qlize_jump_settings');
if (savedSettings) {
  try {
    Object.assign(gameSettings, JSON.parse(savedSettings));
  } catch (e) {
    console.error('Error cargando configuración:', e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('qlize_jump_settings', JSON.stringify(gameSettings));
  } catch (e) {
    console.error('Error guardando configuración:', e);
  }
}

// Controles
const input = { left: false, right: false, axis: 0 };

// --- Teclado ---
window.addEventListener('keydown', (e) => {
  sfx.init();
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
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    input.left = false;
    input.axis = input.right ? 1 : 0;
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    input.right = false;
    input.axis = input.left ? -1 : 0;
  }
});

// --- Táctil (Swipe) ---
let lastTouchX = 0;
let isTouching = false;
let touchTimeout = null;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sfx.init();
  if (gameSettings.controlMode !== 'swipe') return; // Solo si modo swipe está activo
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
  if (gameSettings.controlMode !== 'swipe') return; // Solo si modo swipe está activo
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
  
  // Solo responder si el modo giroscopio está activo
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
const screenExitConfirm = document.getElementById('screen-exit-confirm');

const btnArcade = document.getElementById('btn-arcade');
const btnStage = document.getElementById('btn-stage');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsReset = document.getElementById('btn-settings-reset');
const btnSettingsX = document.getElementById('btn-settings-x');
const btnExitGame = document.getElementById('btn-exit-game');
const btnExitCancel = document.getElementById('btn-exit-cancel');
const btnExitToMenu = document.getElementById('btn-exit-to-menu');
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
const sliderSwipeSens = document.getElementById('slider-swipe-sens');
const sliderAcceleration = document.getElementById('slider-acceleration');
const sliderMaxSpeed = document.getElementById('slider-max-speed');
const sliderFriction = document.getElementById('slider-friction');
const sliderGyroSens = document.getElementById('slider-gyro-sens');

const valSwipeSens = document.getElementById('val-swipe-sens');
const valAcceleration = document.getElementById('val-acceleration');
const valMaxSpeed = document.getElementById('val-max-speed');
const valFriction = document.getElementById('val-friction');
const valGyroSens = document.getElementById('val-gyro-sens');

const presetSoft = document.getElementById('preset-soft');
const presetBalanced = document.getElementById('preset-balanced');
const presetFast = document.getElementById('preset-fast');

function updateSettingsUI() {
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

  // Update control mode buttons
  controlSwipe.classList.toggle('active', gameSettings.controlMode === 'swipe');
  controlGyro.classList.toggle('active', gameSettings.controlMode === 'gyro');

  // Deshabilitar giroscopio si no está disponible
  if (!hasGyroscope) {
    controlGyro.disabled = true;
    controlGyro.style.opacity = '0.4';
    controlGyro.style.cursor = 'not-allowed';
    controlGyro.textContent = '📱 Giroscopio (No disponible)';
  }

  updatePresetButtonsState();
}

function isMatchingPreset(p) {
  return (
    gameSettings.swipeSens === p.swipeSens &&
    gameSettings.acceleration === p.acceleration &&
    gameSettings.maxSpeed === p.maxSpeed &&
    gameSettings.friction === p.friction &&
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

controlSwipe.addEventListener('click', () => {
  gameSettings.controlMode = 'swipe';
  updateSettingsUI();
});

controlGyro.addEventListener('click', () => {
  gameSettings.controlMode = 'gyro';
  updateSettingsUI();
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

function startGame(modeClass) {
  sfx.init();
  requestOrientationPermission();
  currentModeClass = modeClass;

  screenMenu.classList.add('hidden');
  screenGameover.classList.add('hidden');
  screenSettings.classList.add('hidden');
  screenExitConfirm.classList.add('hidden');
  hud.classList.remove('hidden');

  engine.reset();

  const player = new Player(canvas.width / 2 - 16, canvas.height - 150, gameSettings);
  const mode = new modeClass(canvas.width, canvas.height);
  const distanceTarget = mode.stageLength || 6000;

  engine.setPlayer(player);
  engine.setMode(mode);
  engine.setInput(input);

  // Callbacks del Motor
  engine.onGameOver = (score, realm, medal) => {
    if (medal && medal.name === 'Bronce') {
      sfx.playVictory();
    } else {
      sfx.playLifeLost();
    }
    finalScoreEl.innerText = Math.floor(score);
    if (medal) {
      medalIconEl.innerText = medal.icon;
      medalTitleEl.innerText = `${medal.name} • ${medal.title}`;
      medalIconEl.classList.remove('hidden');
      medalTitleEl.classList.remove('hidden');
      gameoverTitleEl.innerText = medal.name === 'Bronce' ? '¡ETAPA COMPLETADA!' : 'ETAPA FINALIZADA';
    } else {
      medalIconEl.classList.add('hidden');
      medalTitleEl.classList.add('hidden');
      gameoverTitleEl.innerText = 'RECORRIDO TERMINADO';
    }
    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  engine.onScoreUpdate = (score) => {
    // Actualizar indicador lateral de distancia
    const progressPercent = Math.min(100, Math.max(0, (score / distanceTarget) * 100));
    distanceCursorEl.style.top = `${100 - progressPercent}%`;
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

  engine.onJumpEffect = () => {
    sfx.playJump(player.gravityDirection === -1);
  };

  engine.onLifeLost = () => {
    sfx.playLifeLost();
  };

  engine.onStageComplete = (score, medal) => {
    sfx.playVictory();
    finalScoreEl.innerText = Math.floor(score);
    medalIconEl.innerText = medal.icon;
    medalTitleEl.innerText = `${medal.name} • ${medal.title}`;
    medalIconEl.classList.remove('hidden');
    medalTitleEl.classList.remove('hidden');
    gameoverTitleEl.innerText = '¡ETAPA COMPLETADA!';
    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  engine.start();
}

btnArcade.addEventListener('click', () => startGame(ArcadeMode));
btnStage.addEventListener('click', () => startGame(StageMode));
btnRestart.addEventListener('click', () => startGame(currentModeClass));
btnMenu.addEventListener('click', () => {
  screenGameover.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  hud.classList.add('hidden');
});

// ---------------------------------------------------------
// Flujo de Salir / Retroceder (in-game)
// ---------------------------------------------------------
function openExitConfirm() {
  if (!engine.isRunning) return; // solo durante partida activa
  engine.stop(); // pausa el juego mientras decide
  screenExitConfirm.classList.remove('hidden');
}

function resumeGame() {
  screenExitConfirm.classList.add('hidden');
  engine.start(); // retoma el bucle (start() resetea lastTime)
}

function exitToMenu() {
  screenExitConfirm.classList.add('hidden');
  hud.classList.add('hidden');
  engine.stop();
  // limpiar input para no arrastrar movimiento residual
  input.left = false;
  input.right = false;
  input.axis = 0;
  screenMenu.classList.remove('hidden');
}

btnExitGame.addEventListener('click', openExitConfirm);
btnExitCancel.addEventListener('click', resumeGame);
btnExitToMenu.addEventListener('click', exitToMenu);

// Tecla Escape: abre la confirmación durante el juego; la cierra si está abierta
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (!screenExitConfirm.classList.contains('hidden')) {
    resumeGame();
  } else if (engine.isRunning) {
    openExitConfirm();
  }
});
