import { Engine } from './engine.js';
import { Player } from './player.js';
import { SephirothMode, QliphothMode } from './modes.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const engine = new Engine(canvas, ctx);

// Controles
const input = {
  left: false,
  right: false,
  axis: 0 // -1 (izquierda total) a 1 (derecha total)
};

// --- Teclado ---
window.addEventListener('keydown', (e) => {
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

// --- Táctil (Deslizar / Drag continuo tipo Swipe con sensibilidad suave) ---
let lastTouchX = 0;
let isTouching = false;
let touchTimeout = null;

canvas.addEventListener('touchstart', (e) => {
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
  
  // Umbral mínimo de movimiento para filtrar temblores
  if (Math.abs(deltaX) > 1.5) {
    // Escala la intensidad de forma progresiva según la distancia/velocidad del arrastre
    const intensity = Math.min(1, Math.max(0.25, Math.abs(deltaX) / 14));
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
  
  // Desacelerar suavemente cuando el dedo deja de deslizarse
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

// --- Acelerómetro (Móvil) ---
window.addEventListener('deviceorientation', (e) => {
  const tilt = e.gamma; // inclinación izq/der en grados (-90 a 90)
  if (tilt === null) return;
  
  // Si no se está usando la pantalla táctil activamente
  if (!isTouching) {
    if (Math.abs(tilt) > 4) {
      const intensity = Math.min(1, (Math.abs(tilt) - 4) / 20);
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

// Solicitar permisos en iOS 13+
async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission();
      if (response !== 'granted') {
        console.warn('Permiso de giroscopio denegado');
      }
    } catch(e) {
      console.error(e);
    }
  }
}

// Interfaz de Usuario
const screenMenu = document.getElementById('screen-menu');
const screenGameover = document.getElementById('screen-gameover');
const btnSephiroth = document.getElementById('btn-sephiroth');
const btnQliphoth = document.getElementById('btn-qliphoth');
const btnRestart = document.getElementById('btn-restart');
const btnMenu = document.getElementById('btn-menu');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');

let currentModeType = null;

function startGame(modeClass) {
  requestOrientationPermission();
  screenMenu.classList.add('hidden');
  screenGameover.classList.add('hidden');
  hud.classList.remove('hidden');
  
  engine.reset();
  
  // Posición inicial
  const player = new Player(canvas.width / 2 - 15, canvas.height - 150);
  const mode = new modeClass(canvas.width, canvas.height);
  
  engine.setPlayer(player);
  engine.setMode(mode);
  engine.setInput(input);
  
  engine.onGameOver = (score) => {
    finalScoreEl.innerText = Math.floor(score);
    screenGameover.classList.remove('hidden');
    hud.classList.add('hidden');
  };
  
  engine.onScoreUpdate = (score) => {
    scoreEl.innerText = Math.floor(score);
  };
  
  engine.start();
}

btnSephiroth.addEventListener('click', () => { currentModeType = SephirothMode; startGame(SephirothMode); });
btnQliphoth.addEventListener('click', () => { currentModeType = QliphothMode; startGame(QliphothMode); });
btnRestart.addEventListener('click', () => startGame(currentModeType));
btnMenu.addEventListener('click', () => {
  screenGameover.classList.add('hidden');
  screenMenu.classList.remove('hidden');
  hud.classList.add('hidden');
});
