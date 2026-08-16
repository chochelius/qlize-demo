import { Engine } from './engine.js';
import { Player } from './player.js';
import { ArcadeMode, StageMode } from './modes.js';

// =========================================================
// SINTETIZADOR DE AUDIO PROCEDIMENTAL (Web Audio API)
// Efectos de sonido dinámicos para salto, chispas, portales y medallas
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

  playSpark() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.06); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
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

// =========================================================
// INICIALIZACIÓN DEL CANVAS & MOTOR
// =========================================================
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
    gyroSens: 22
  },
  balanced: {
    swipeSens: 1.0,
    acceleration: 1400,
    maxSpeed: 340,
    friction: 0.86,
    gyroSens: 20
  },
  fast: {
    swipeSens: 1.4,
    acceleration: 1900,
    maxSpeed: 420,
    friction: 0.89,
    gyroSens: 14
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
const input = {
  left: false,
  right: false,
  axis: 0 // -1 a 1
};

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

// --- Táctil (Swipe Proporcional) ---
let lastTouchX = 0;
let isTouching = false;
let touchTimeout = null;

canvas.addEventListener('touchstart', (e) => {
  sfx.init();
  e.preventDefault();
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

// --- Giroscopio / Inclinación ---
window.addEventListener('deviceorientation', (e) => {
  const tilt = e.gamma;
  if (tilt === null) return;

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

// Elementos de UI
const screenMenu = document.getElementById('screen-menu');
const screenGameover = document.getElementById('screen-gameover');
const screenSettings = document.getElementById('screen-settings');

const btnStages = document.getElementById('btn-stages');
const btnArcade = document.getElementById('btn-arcade');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsReset = document.getElementById('btn-settings-reset');

const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const hudMultTag = document.getElementById('hud-mult-tag');
const hudGem = document.getElementById('hud-gem');
const hudRealmName = document.getElementById('hud-realm-name');
const hudRealmTitle = document.getElementById('hud-realm-title');
const hudLivesContainer = document.getElementById('hud-lives-container');
const lifeOrbs = [
  document.getElementById('life-1'),
  document.getElementById('life-2'),
  document.getElementById('life-3')
];

// Sincronía UI
const syncValEl = document.getElementById('sync-val');
const syncFillEl = document.getElementById('sync-fill');
const perkTrailEl = document.getElementById('perk-trail');
const perkFloatEl = document.getElementById('perk-float');
const perkFlowEl = document.getElementById('perk-flow');

// Modal Game Over / Medallas
const gameoverTitleEl = document.getElementById('gameover-title');
const gameoverRealmEl = document.getElementById('gameover-realm');
const medalBoxEl = document.getElementById('medal-box');
const medalTitleEl = document.getElementById('medal-title');
const medalDescEl = document.getElementById('medal-desc');
const finalScoreEl = document.getElementById('final-score');
const finalDistEl = document.getElementById('final-dist');
const finalSyncEl = document.getElementById('final-sync');
const finalSparksEl = document.getElementById('final-sparks');

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

// Presets
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

  presetSoft.classList.toggle('active', isMatchingPreset(PRESETS.soft));
  presetBalanced.classList.toggle('active', isMatchingPreset(PRESETS.balanced));
  presetFast.classList.toggle('active', isMatchingPreset(PRESETS.fast));
}

function isMatchingPreset(p) {
  return (
    gameSettings.swipeSens === p.swipeSens &&
    gameSettings.acceleration === p.acceleration &&
    gameSettings.maxSpeed === p.maxSpeed
  );
}

function applyPreset(p) {
  Object.assign(gameSettings, p);
  saveSettings();
  updateSettingsUI();
}

presetSoft.addEventListener('click', () => applyPreset(PRESETS.soft));
presetBalanced.addEventListener('click', () => applyPreset(PRESETS.balanced));
presetFast.addEventListener('click', () => applyPreset(PRESETS.fast));

sliderSwipeSens.addEventListener('input', (e) => {
  gameSettings.swipeSens = parseFloat(e.target.value);
  valSwipeSens.innerText = gameSettings.swipeSens.toFixed(1) + 'x';
});
sliderAcceleration.addEventListener('input', (e) => {
  gameSettings.acceleration = parseInt(e.target.value, 10);
  valAcceleration.innerText = gameSettings.acceleration;
});
sliderMaxSpeed.addEventListener('input', (e) => {
  gameSettings.maxSpeed = parseInt(e.target.value, 10);
  valMaxSpeed.innerText = gameSettings.maxSpeed;
});
sliderFriction.addEventListener('input', (e) => {
  gameSettings.friction = parseFloat(e.target.value);
  valFriction.innerText = gameSettings.friction.toFixed(2);
});
sliderGyroSens.addEventListener('input', (e) => {
  gameSettings.gyroSens = parseInt(e.target.value, 10);
  valGyroSens.innerText = gameSettings.gyroSens + '°';
});

btnSettingsToggle.addEventListener('click', () => {
  updateSettingsUI();
  screenSettings.classList.remove('hidden');
});
btnSettingsClose.addEventListener('click', () => {
  saveSettings();
  screenSettings.classList.add('hidden');
});
btnSettingsReset.addEventListener('click', () => {
  Object.assign(gameSettings, DEFAULT_SETTINGS);
  saveSettings();
  updateSettingsUI();
});

let currentModeClass = StageMode;

function updateSynchronyHUD(sync, multiplier) {
  syncValEl.innerText = `${sync}%`;
  syncFillEl.style.width = `${sync}%`;
  hudMultTag.innerText = `x${multiplier.toFixed(1)}`;

  perkTrailEl.classList.toggle('active', sync >= 30);
  perkFloatEl.classList.toggle('active', sync >= 60);
  perkFlowEl.classList.toggle('active', sync >= 90);
}

function updateLivesHUD(lives) {
  lifeOrbs.forEach((orb, idx) => {
    orb.classList.toggle('dead', idx >= lives);
  });
}

function startGame(modeClass) {
  sfx.init();
  currentModeClass = modeClass;

  screenMenu.classList.add('hidden');
  screenGameover.classList.add('hidden');
  screenSettings.classList.add('hidden');
  hud.classList.remove('hidden');

  engine.reset();

  const isStage = modeClass === StageMode;
  hudLivesContainer.classList.toggle('hidden', !isStage);
  if (isStage) updateLivesHUD(3);

  const player = new Player(canvas.width / 2 - 16, canvas.height - 150, gameSettings);
  const mode = new modeClass(canvas.width, canvas.height);

  engine.setPlayer(player);
  engine.setMode(mode);
  engine.setInput(input);

  // Callbacks del Motor de Juego
  engine.onScoreUpdate = (score, sync, mult) => {
    scoreEl.innerText = Math.floor(score);
    updateSynchronyHUD(sync, mult);
  };

  engine.onRealmUpdate = (realm, lives) => {
    if (realm) {
      hudRealmName.innerText = realm.name;
      hudRealmTitle.innerText = realm.title || '';
      hudGem.style.background = realm.color || '#38bdf8';
      hudGem.style.boxShadow = `0 0 10px ${realm.color || '#38bdf8'}`;
    }
    if (lives !== undefined && isStage) {
      updateLivesHUD(lives);
    }
  };

  engine.onJumpEffect = (platform) => {
    sfx.playJump(player.gravityDirection === -1);
  };

  engine.onSparkCollect = () => {
    sfx.playSpark();
  };

  engine.onLifeLost = (lives, corruption, rescued) => {
    if (rescued) {
      sfx.playSpark();
    } else {
      sfx.playLifeLost();
    }
    if (isStage) updateLivesHUD(lives);
  };

  engine.onGameOver = (score, realm, medals, isVictory) => {
    if (isVictory) {
      sfx.playVictory();
      gameoverTitleEl.innerText = '✨ CIMA CONQUISTADA ✨';
      gameoverTitleEl.className = 'title-victory';
    } else {
      sfx.playLifeLost();
      gameoverTitleEl.innerText = 'ASCENSO TERMINADO';
      gameoverTitleEl.className = 'title-defeat';
    }

    finalScoreEl.innerText = Math.floor(score);
    finalSparksEl.innerText = engine.sparksCollected;
    finalSyncEl.innerText = `${player.syncLevel}%`;

    if (medals) {
      finalDistEl.innerText = `${medals.distancePercent}%`;
      medalBoxEl.classList.remove('hidden');
      medalTitleEl.innerText = medals.medalName;
      medalDescEl.innerText = medals.medalDesc;
    } else {
      finalDistEl.innerText = `${Math.floor(engine.distanceReached)}m`;
      medalBoxEl.classList.add('hidden');
    }

    if (realm) {
      gameoverRealmEl.innerText = `Reino / Etapa: ${realm.name}`;
    }

    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };

  engine.start();
}

btnStages.addEventListener('click', () => startGame(StageMode));
btnArcade.addEventListener('click', () => startGame(ArcadeMode));
btnRestart.addEventListener('click', () => startGame(currentModeClass));
btnMenu.addEventListener('click', () => {
  screenGameover.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  hud.classList.add('hidden');
});

