import { Engine } from './engine.js';
import { Player } from './player.js';
import { ArcadeMode, StageMode } from './modes.js';
import { QlizeAudioManager } from './audio.js';

const audio = new QlizeAudioManager();

// Detección de dispositivo
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasGyroscope = 'DeviceOrientationEvent' in window && isMobile;
const isDesktop = !isMobile;

console.log('🎮 Detección de dispositivo:');
console.log('  - isMobile:', isMobile);
console.log('  - hasTouchscreen:', hasTouchscreen);
console.log('  - hasGyroscope:', hasGyroscope);
console.log('  - isDesktop:', isDesktop);

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
const savedSettings = localStorage.getItem('qlize_jump_settings');
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
    localStorage.setItem('qlize_jump_settings', JSON.stringify(gameSettings));
  } catch (e) {
    console.error('Error guardando configuración:', e);
  }
}

// Controles
const input = { left: false, right: false, axis: 0 };

// --- Teclado ---
window.addEventListener('keydown', (e) => {
  audio.init();
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
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnSettingsClose = document.getElementById('btn-settings-close');
const btnSettingsReset = document.getElementById('btn-settings-reset');
const btnSettingsX = document.getElementById('btn-settings-x');
const btnExitGame = document.getElementById('btn-exit-game');

const btnPauseResume = document.getElementById('btn-pause-resume');
const btnPauseRestart = document.getElementById('btn-pause-restart');
const btnPauseSettings = document.getElementById('btn-pause-settings');
const btnPauseMenu = document.getElementById('btn-pause-menu');

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
    controlKeyboard.textContent = '⌨️ Teclado';
  } else {
    controlKeyboard.disabled = true;
    controlKeyboard.style.opacity = '0.4';
    controlKeyboard.style.cursor = 'not-allowed';
    controlKeyboard.textContent = '⌨️ Teclado (No disponible)';
  }

  if (isMobile || hasTouchscreen) {
    controlSwipe.disabled = false;
    controlSwipe.style.opacity = '1';
    controlSwipe.style.cursor = 'pointer';
    controlSwipe.textContent = '👆 Swipe';
  } else {
    controlSwipe.disabled = true;
    controlSwipe.style.opacity = '0.4';
    controlSwipe.style.cursor = 'not-allowed';
    controlSwipe.textContent = '👆 Swipe (No disponible)';
  }

  if (hasGyroscope) {
    controlGyro.disabled = false;
    controlGyro.style.opacity = '1';
    controlGyro.style.cursor = 'pointer';
    controlGyro.textContent = '📱 Giroscopio';
  } else {
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

const ZEN_MANTRAS = [
  "Respira. Recalibra. Asciende.",
  "En el centro del octágono habita el silencio.",
  "Fluye con el vector, domina la inercia.",
  "El orden y el caos son dos caras del mismo salto."
];

function startGame(modeClass) {
  audio.init();
  requestOrientationPermission();
  currentModeClass = modeClass;

  screenMenu.classList.add('hidden');
  screenGameover.classList.add('hidden');
  screenSettings.classList.add('hidden');
  screenPause.classList.add('hidden');
  hud.classList.remove('hidden');
  phaseIndicator.classList.add('hidden');
  phaseIndicator.classList.remove('entropy');
  phaseText.innerText = 'ESTRUCTURA';

  engine.reset();

  const player = new Player(canvas.width / 2 - 16, canvas.height - 150, gameSettings);
  const mode = new modeClass(canvas.width, canvas.height);

  engine.setPlayer(player);
  engine.setMode(mode);
  engine.setInput(input);

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

  engine.onGameOver = (score, realm, medal) => {
    if (medal && medal.name === 'Bronce') {
      audio.playVictory();
    } else {
      audio.playLifeLost();
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
    audio.playVictory();
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
  audio.stopMusic();
  screenGameover.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  hud.classList.add('hidden');
});

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
  engine.stop();
  audio.stopMusic();
  input.left = false;
  input.right = false;
  input.axis = 0;
  screenMenu.classList.remove('hidden');
}

btnExitGame.addEventListener('click', openPauseMenu);
if (btnPauseResume) btnPauseResume.addEventListener('click', resumeGame);
if (btnPauseRestart) btnPauseRestart.addEventListener('click', () => startGame(currentModeClass));
if (btnPauseSettings) {
  btnPauseSettings.addEventListener('click', () => {
    updateSettingsUI();
    screenSettings.classList.remove('hidden');
  });
}
if (btnPauseMenu) btnPauseMenu.addEventListener('click', exitToMenu);

window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (!screenSettings.classList.contains('hidden')) {
    screenSettings.classList.add('hidden');
  } else if (!screenPause.classList.contains('hidden')) {
    resumeGame();
  } else if (engine.isRunning) {
    openPauseMenu();
  }
});
