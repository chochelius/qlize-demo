import { Engine } from './engine.js';
import { Player } from './player.js';
import { SephirothMode, QliphothMode } from './modes.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const engine = new Engine(canvas, ctx);

// Controles
const input = {
  left: false,
  right: false
};

// --- Teclado ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
});

// --- Táctil ---
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); 
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    if (x < rect.width / 2) input.left = true;
    else input.right = true;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  // Al soltar un dedo, detenemos el movimiento. 
  // Para multitouch complejo se trackearía el ID, pero esto es funcional y directo.
  if (e.touches.length === 0) {
    input.left = false;
    input.right = false;
  }
}, { passive: false });

// --- Acelerómetro (Móvil) ---
window.addEventListener('deviceorientation', (e) => {
  const tilt = e.gamma; // inclinación izq/der en grados (-90 a 90)
  if (tilt === null) return;
  // Zona muerta de 5 grados
  if (tilt > 5) {
    input.right = true; input.left = false;
  } else if (tilt < -5) {
    input.left = true; input.right = false;
  } else {
    // Si no se presiona la pantalla, detener
    if(e.touches && e.touches.length === 0) {
      input.left = false; input.right = false;
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
