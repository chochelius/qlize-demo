// =========================================================
// QLIZE AUDIO MANAGER (Web Audio API & intro_tema (1).mp3)
// Banda sonora adaptativa con filtro de degradación y SFX sintéticos
// =========================================================
export class QlizeAudioManager {
  constructor() {
    this.ctx = null;
    this.audioElement = null;
    this.sourceNode = null;
    this.degradationFilter = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.volume = 0.65;
    this.isMuted = false;
  }

  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();

      // Cargar elemento de audio para intro_tema.mp3 normalizado
      this.audioElement = new Audio('/intro_tema.mp3');
      this.audioElement.loop = true;
      this.audioElement.crossOrigin = 'anonymous';

      // Fuente de Audio y Cadena de Procesamiento
      this.sourceNode = this.ctx.createMediaElementSource(this.audioElement);
      
      // Filtro de Paso Bajo para Niebla Sonora (Degradación de Vidas)
      this.degradationFilter = this.ctx.createBiquadFilter();
      this.degradationFilter.type = 'lowpass';
      this.degradationFilter.frequency.value = 22000; // Abierto por defecto

      // Control de Ganancia Master
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      // Conexión: Source -> Degradation Filter -> Master Gain -> Output
      this.sourceNode.connect(this.degradationFilter);
      this.degradationFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API no pudo inicializarse:', e);
    }
  }

  startMusic() {
    this.init();
    if (!this.audioElement) return;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.audioElement.playbackRate = 1.0;
    this.audioElement.currentTime = 0;
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
      }).catch(err => {
        console.warn('Reproducción de audio bloqueada por el navegador:', err);
      });
    }
  }

  pauseMusic() {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    }
  }

  resumeMusic() {
    if (this.audioElement && !this.isPlaying) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.audioElement.play().then(() => {
        this.isPlaying = true;
      }).catch(() => {});
    }
  }

  stopMusic() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }

  setMasterVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  setMute(isMuted) {
    this.isMuted = !!isMuted;
    if (this.ctx && this.masterGain) {
      const targetGain = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
  }

  setDegradationState(livesRemaining) {
    if (!this.ctx || !this.degradationFilter) return;

    const now = this.ctx.currentTime;
    if (livesRemaining >= 3) {
      // Estado de gracia: filtro completamente abierto
      this.degradationFilter.frequency.setTargetAtTime(22000, now, 0.4);
    } else if (livesRemaining === 2) {
      // 2 Vidas: Corte suave de agudos
      this.degradationFilter.frequency.setTargetAtTime(3000, now, 0.4);
    } else if (livesRemaining <= 1) {
      // 1 Vida: Niebla sonora (sonido profundamente ahogado)
      this.degradationFilter.frequency.setTargetAtTime(800, now, 0.4);
    }
  }

  setPhase(phase) {
    if (!this.audioElement) return;
    if (phase === 'entropy') {
      // Fase Entropía: Aumentar tempo/velocidad a 1.18x
      this.audioElement.playbackRate = 1.18;
    } else {
      // Fase Estructura: Velocidad normal 1.0x
      this.audioElement.playbackRate = 1.0;
    }
  }

  // SFX: Salto en Plataforma Óptima (Ping Cristalino Agudo)
  playOptimalJump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  // SFX: Salto en Plataforma Secundaria (Golpe Seco Inerte - Thud)
  playSecondaryJump() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // SFX: Pérdida de Vida / Caída (Sub-Drop de Sub-graves)
  playLifeLost() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  // SFX: Victoria / Arpegio de Etapa Completa
  playVictory() {
    if (!this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        const startTime = this.ctx.currentTime + idx * 0.12;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {}
  }
}
