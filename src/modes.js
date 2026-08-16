// Metadatos del Árbol de la Luz y Árbol de la Sombra
export const SEPHIROTH_NODES = [
  { num: 10, name: 'Malkuth', title: 'Reino', color: '#ca8a04', glow: 'rgba(202, 138, 4, 0.5)', height: 0 },
  { num: 9,  name: 'Yesod',   title: 'Fundación', color: '#9333ea', glow: 'rgba(147, 51, 234, 0.5)', height: 1600 },
  { num: 8,  name: 'Hod',     title: 'Esplendor', color: '#ea580c', glow: 'rgba(234, 88, 12, 0.5)', height: 3200 },
  { num: 7,  name: 'Netzach', title: 'Victoria', color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', height: 4800 },
  { num: 6,  name: 'Tiphereth', title: 'Belleza', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)', height: 6600 },
  { num: 5,  name: 'Geburah', title: 'Severidad', color: '#e11d48', glow: 'rgba(225, 29, 72, 0.5)', height: 8400 },
  { num: 4,  name: 'Chesed',  title: 'Misericordia', color: '#2563eb', glow: 'rgba(37, 99, 235, 0.5)', height: 10200 },
  { num: '•', name: 'Daath',   title: 'Conocimiento', color: '#a5f3fc', glow: 'rgba(165, 243, 252, 0.5)', height: 12000 },
  { num: 3,  name: 'Binah',   title: 'Entendimiento', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.5)', height: 13800 },
  { num: 2,  name: 'Chokmah', title: 'Sabiduría', color: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.5)', height: 15600 },
  { num: 1,  name: 'Kether',  title: 'Corona', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.7)', height: 17600 }
];

export class BaseMode {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.platforms = [];
    this.highestPlatformY = 0;
    this.platformIdCounter = 1;

    // Sistema de Ruta Óptima y Sincronía
    this.optimalRoute = [];
    this.currentRouteIndex = 0;
    this.adherenceHits = 0;
    this.totalJumps = 0;
    this.lastSafePlatform = null; // Última plataforma pisada (punto de respawn)
    // Distancia máxima permitida por encima de la cámara antes de reciclar.
    // Los modos con mapa pre-construido (StageMode) lo amplían para no borrar la cima.
    this.pruneHeightAbove = height * 2.5;

    // Fondo estelar Cyber-Zen (Paralaje)
    this.starsLayer1 = [];
    this.starsLayer2 = [];
    for (let i = 0; i < 45; i++) {
      this.starsLayer1.push({
        x: Math.random() * width,
        y: Math.random() * height * 4,
        size: 1 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1 + Math.random() * 3
      });
    }
    for (let i = 0; i < 25; i++) {
      this.starsLayer2.push({
        x: Math.random() * width,
        y: Math.random() * height * 4,
        size: 2 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 2 + Math.random() * 4
      });
    }

    // Plataforma inicial de origen
    this.addPlatform(width / 2 - 45, height - 50, 90, 16, { isStartingPlatform: true, isOptimal: true });
    this.lastSafePlatform = this.platforms[0];
  }

  // true mientras el modo está en cinemática (el motor pausa las físicas)
  get isSweeping() { return false; }

  addPlatform(x, y, w, h, props = {}) {
    const id = this.platformIdCounter++;
    const p = { id, x, y, width: w, height: h, active: true, isOptimal: false, ...props };
    this.platforms.push(p);
    if (p.isOptimal) {
      this.optimalRoute.push(id);
    }
    if (y < this.highestPlatformY || this.highestPlatformY === 0) {
      this.highestPlatformY = y;
    }
    return p;
  }

  getPlatforms() { return this.platforms; }

  onPlatformStepped(platform, player) {
    this.totalJumps++;
    this.lastSafePlatform = platform;

    if (platform.isOptimal) {
      this.adherenceHits++;
      const indexInRoute = this.optimalRoute.indexOf(platform.id);
      if (indexInRoute !== -1 && indexInRoute >= this.currentRouteIndex) {
        this.currentRouteIndex = indexInRoute + 1;
      }
    }

    const currentSync = this.totalJumps > 0 ? Math.round((this.adherenceHits / this.totalJumps) * 100) : 100;
    player.synchrony = Math.min(100, Math.max(0, currentSync));
  }

  update(dt, cameraY, player) {
    // Reciclar plataformas lejanas por debajo de la cámara
    const lowerBound = this.height - cameraY + 350;
    const upperBound = -cameraY - this.pruneHeightAbove;
    this.platforms = this.platforms.filter(p => p.y < lowerBound && p.y > upperBound);
    this.generatePlatforms(cameraY);
  }

  generatePlatforms(cameraY) {}

  updateCamera(cameraY, player, dt) {
    if (player.gravityDirection === 1) {
      const targetY = -player.y + this.height * 0.45;
      return targetY > cameraY ? targetY : cameraY;
    } else {
      // Invertida: la cámara baja siguiendo al jugador
      const targetY = -player.y + this.height * 0.55;
      return targetY > cameraY ? targetY : cameraY;
    }
  }

  getJumpForce() { return 650; }
  getBackgroundColor() { return '#040714'; }
  getCurrentRealm() { return SEPHIROTH_NODES[0]; }
  getPlatformColor() { return '#fbbf24'; }
  drawBackground(ctx, cameraY) {}
  drawForeground(ctx) {}
}

// ---------------------------------------------------------
// 🌌 Modo Arcade (Juego Continuo con Transición a Entropía Invertida)
// ---------------------------------------------------------
export class ArcadeMode extends BaseMode {
  constructor(width, height) {
    super(width, height);
    this.phase = 'structure'; // 'structure' (Luz) -> 'entropy' (Sombra Invertida)
    this.currentNodeIndex = 0;
    this.platformGapY = 72;
    this.sacredTime = 0;

    this.generatePlatforms(0);
  }

  generatePlatforms(cameraY) {
    const targetY = -cameraY - this.height * 1.8;

    while (this.highestPlatformY > targetY) {
      const isOptimal = Math.random() < 0.65;
      const pWidth = isOptimal ? (60 + Math.random() * 25) : (50 + Math.random() * 30);
      
      // Si es óptima, debe estar a distancia alcanzable desde la última óptima
      let pX;
      if (isOptimal) {
        const lastOptimal = this.platforms.filter(p => p.isOptimal).pop();
        if (lastOptimal) {
          // Distancia horizontal máxima alcanzable durante un salto (~274px teórico)
          // Usamos 280px: el jugador puede usar secundarias como escalones
          const maxHorizontalReach = 280;
          const lastCenterX = lastOptimal.x + lastOptimal.width / 2;
          const minCenterX = Math.max(pWidth / 2, lastCenterX - maxHorizontalReach);
          const maxCenterX = Math.min(this.width - pWidth / 2, lastCenterX + maxHorizontalReach);
          const newCenterX = minCenterX + Math.random() * (maxCenterX - minCenterX);
          pX = newCenterX - pWidth / 2;
        } else {
          pX = Math.random() * (this.width - pWidth);
        }
      } else {
        // Plataformas secundarias pueden estar más lejos (son apoyo, no ruta óptima)
        pX = Math.random() * (this.width - pWidth);
      }
      
      const pY = this.highestPlatformY - this.platformGapY - (Math.random() * 30);

      this.addPlatform(pX, pY, pWidth, 16, {
        isOptimal,
        isSecondary: !isOptimal,
        isHusk: this.phase === 'entropy'
      });
    }
  }

  update(dt, cameraY, player) {
    super.update(dt, cameraY, player);
    this.sacredTime += dt;

    // Transición de Fase al alcanzar 5000m
    if (this.phase === 'structure' && cameraY > 5000) {
      this.phase = 'entropy';
      player.gravityDirection = -1; // Gravedad Invertida
      // Posicionar al jugador en el "suelo" invertido (parte superior del viewport)
      player.y = -cameraY; // Pegado al tope del viewport
      player.vy = 0;
      player.noclip = true; // Activar noclip para atravesar plataformas
    }

    // Actualizar Sefirá / Reino actual
    if (this.phase === 'structure') {
      for (let i = SEPHIROTH_NODES.length - 1; i >= 0; i--) {
        if (cameraY >= SEPHIROTH_NODES[i].height) {
          this.currentNodeIndex = i;
          break;
        }
      }
    }
  }

  getCurrentRealm() {
    if (this.phase === 'entropy') {
      return { name: 'Abismo de Entropía', title: 'Gravedad Invertida', color: '#e11d48', glow: 'rgba(225, 29, 72, 0.6)' };
    }
    return SEPHIROTH_NODES[this.currentNodeIndex] || SEPHIROTH_NODES[0];
  }

  getPlatformColor() {
    return this.phase === 'entropy' ? '#e11d48' : this.getCurrentRealm().color;
  }

  onAllLivesLost(engine) {
    // Transición a Entropía al perder todas las vidas
    if (this.phase === 'structure') {
      this.phase = 'entropy';
      engine.player.gravityDirection = -1;
      engine.lives = 3; // Restaurar vidas para la fase Entropía
      engine.degradationLevel = 0;
      engine.onLivesUpdate(engine.lives);
      // Posicionar al jugador en el "suelo" invertido (parte superior del viewport)
      engine.player.y = -engine.cameraY; // Pegado al tope del viewport
      engine.player.vy = 0;
      engine.player.noclip = true; // Activar noclip para atravesar plataformas
    } else {
      // Si ya estamos en Entropía, game over
      engine.stop();
      engine.onGameOver(engine.score, this.getCurrentRealm(), null);
    }
  }

  drawBackground(ctx, cameraY) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.phase === 'structure') {
      // Árbol de la Luz: Fondo Azul Marino Ultra Oscuro a Celeste
      const grad = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.35, 10,
        this.width * 0.5, this.height * 0.5, this.height * 0.8
      );
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.8)');
      grad.addColorStop(1, '#040714');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Estrellas en Paralaje
      ctx.fillStyle = '#ffffff';
      for (const s of this.starsLayer1) {
        const sy = (s.y - cameraY * 0.2) % this.height;
        const finalY = sy < 0 ? sy + this.height : sy;
        const alpha = s.alpha * (0.6 + 0.4 * Math.sin(this.sacredTime * s.twinkleSpeed));
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(s.x, finalY, s.size, s.size);
      }
      ctx.restore();

      // Hilo Continuo de Luz Dorada (Ruta de Adherencia)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      const optimalPlatforms = this.platforms.filter(p => p.active && p.isOptimal).sort((a, b) => b.y - a.y);
      for (let i = 0; i < optimalPlatforms.length - 1; i++) {
        const p1 = optimalPlatforms[i];
        const p2 = optimalPlatforms[i + 1];
        if (Math.abs(p1.y - p2.y) < 220) {
          ctx.moveTo(p1.x + p1.width / 2, p1.y);
          ctx.lineTo(p2.x + p2.width / 2, p2.y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Árbol de la Sombra: Negro Absoluto con Fuegos Góticos Carmesí
      const grad = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.5, 20,
        this.width * 0.5, this.height * 0.5, this.height * 0.9
      );
      grad.addColorStop(0, 'rgba(225, 29, 72, 0.25)');
      grad.addColorStop(0.7, 'rgba(136, 19, 55, 0.6)');
      grad.addColorStop(1, '#030303');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Chispas de Entropía en Bordes de Pantalla
      ctx.fillStyle = '#e11d48';
      for (let i = 0; i < 6; i++) {
        if (Math.random() < 0.4) {
          const ex = Math.random() < 0.5 ? Math.random() * 25 : this.width - Math.random() * 25;
          const ey = Math.random() * this.height;
          ctx.fillRect(ex, ey, 2 + Math.random() * 3, 2 + Math.random() * 3);
        }
      }
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------
// 🏆 Modo Etapas (Por Niveles con Barrido Inicial y Medallas)
// ---------------------------------------------------------
export class StageMode extends BaseMode {
  constructor(width, height, segmentLength = 6000, repeatCount = 3) {
    super(width, height);
    this.segmentLength = segmentLength;
    this.repeatCount = repeatCount;
    this.stageLength = segmentLength * repeatCount; // 18000px total
    // BUGFIX: el mapa está pre-construido hasta -stageLength; el reciclaje por
    // defecto (height * 2.5 sobre la cámara) borraba los 2/3 superiores del mapa
    // al terminar la cinemática de barrido, haciendo la cima inalcanzable.
    this.pruneHeightAbove = this.stageLength + height;
    this.isSweepingCamera = true;
    this.sweepState = 'UP'; // 'UP' -> 'PAUSE' -> 'DOWN' -> fin de cinemática
    this.sweepY = 0;
    this.sweepSpeed = 9000; // Rápido: ~2s para 18000px
    this.sweepTimer = 0;
    this.sweepComplete = false;
    this.stageComplete = false; // Nuevo: detecta cuando el jugador llega a la cima

    this.buildStageMap();
  }

  get isSweeping() { return this.isSweepingCamera; }

  buildStageMap() {
    // La plataforma inicial del BaseMode está en height - 50
    // Empezamos generando desde ahí hacia arriba
    let startY = this.height - 120;
    
    // Generar cada segmento desde donde terminó el anterior
    for (let repeat = 0; repeat < this.repeatCount; repeat++) {
      const segment = this.buildSingleSegment(this.segmentLength, startY);
      
      for (const platform of segment) {
        this.addPlatform(platform.x, platform.y, platform.width, 16, {
          isOptimal: platform.isOptimal,
          isSecondary: platform.isSecondary
        });
      }
      
      // El siguiente segmento empieza donde terminó este
      if (segment.length > 0) {
        startY = segment[segment.length - 1].y;
      }
    }
  }

  buildSingleSegment(length, startY) {
    // Genera un segmento de plataformas y retorna un array con sus datos
    // startY: posición Y donde comienza este segmento (cerca de la plataforma anterior)
    const platforms = [];
    let currentY = startY;
    const endY = startY - length;
    let lastOptimalX = this.width / 2; // Centro para la primera plataforma

    while (currentY > endY) {
      const isOptimal = Math.random() < 0.6;
      const pWidth = isOptimal ? 70 : 55;
      
      // Si es óptima, debe estar a distancia alcanzable desde la última óptima
      let pX;
      if (isOptimal) {
        const maxHorizontalReach = 280;
        const minCenterX = Math.max(pWidth / 2, lastOptimalX - maxHorizontalReach);
        const maxCenterX = Math.min(this.width - pWidth / 2, lastOptimalX + maxHorizontalReach);
        const newCenterX = minCenterX + Math.random() * (maxCenterX - minCenterX);
        pX = newCenterX - pWidth / 2;
        lastOptimalX = newCenterX;
      } else {
        pX = Math.random() * (this.width - pWidth);
      }
      
      currentY -= 72 + Math.random() * 20;

      platforms.push({
        x: pX,
        y: currentY,
        width: pWidth,
        isOptimal,
        isSecondary: !isOptimal
      });
    }
    
    return platforms;
  }

  update(dt, cameraY, player) {
    if (this.isSweepingCamera) {
      if (this.sweepState === 'UP') {
        this.sweepY += this.sweepSpeed * dt;
        if (this.sweepY >= this.stageLength) {
          this.sweepY = this.stageLength;
          this.sweepState = 'PAUSE';
          this.sweepTimer = 0;
        }
      } else if (this.sweepState === 'PAUSE') {
        this.sweepTimer += dt;
        if (this.sweepTimer > 0.3) {
          this.sweepState = 'DOWN';
        }
      } else if (this.sweepState === 'DOWN') {
        this.sweepY -= this.sweepSpeed * 1.9 * dt;
        if (this.sweepY <= 0) {
          this.sweepY = 0;
          this.isSweepingCamera = false;
          this.sweepComplete = true;
        }
      }
      return;
    }
    
    // Detectar si el jugador alcanzó la cima
    if (cameraY >= this.stageLength && !this.stageComplete) {
      this.stageComplete = true;
      return; // El engine manejará el callback
    }
    
    super.update(dt, cameraY, player);
  }

  updateCamera(cameraY, player, dt) {
    if (this.isSweepingCamera) {
      return this.sweepY;
    }
    return super.updateCamera(cameraY, player, dt);
  }

  calculateMedal(reachedDistance) {
    const percent = (reachedDistance / this.stageLength) * 100;
    if (percent >= 100) return { name: 'Bronce', icon: '🥉', title: 'Cima Alcanzada (Templanza)' };
    if (percent >= 75) return { name: 'Oro', icon: '🥇', title: 'Gran Resistencia (75%+)' };
    if (percent >= 50) return { name: 'Plata', icon: '🥈', title: 'Resistencia Media (50%+)' };
    return { name: 'Sin Medalla', icon: '🛡️', title: 'Sigue Intentándolo' };
  }

  drawBackground(ctx, cameraY) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fondo Cyber-Zen Místico
    const grad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.4, 20,
      this.width * 0.5, this.height * 0.5, this.height * 0.85
    );
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    grad.addColorStop(0.7, 'rgba(15, 23, 42, 0.85)');
    grad.addColorStop(1, '#040714');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    // Hilo Dorado Continuo de la Ruta de Constelación
    // Durante la cinemática de barrido, aumentar brillo y grosor
    const isSweeping = this.isSweepingCamera;
    const lineAlpha = isSweeping ? 0.95 : 0.6;
    const lineWidth = isSweeping ? 3.5 : 2;
    const glowBlur = isSweeping ? 16 : 0;
    
    ctx.strokeStyle = `rgba(251, 191, 36, ${lineAlpha})`;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4, 3]);
    
    if (glowBlur > 0) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = glowBlur;
    }
    
    ctx.beginPath();
    const optimalPlatforms = this.platforms.filter(p => p.active && p.isOptimal).sort((a, b) => b.y - a.y);
    for (let i = 0; i < optimalPlatforms.length - 1; i++) {
      const p1 = optimalPlatforms[i];
      const p2 = optimalPlatforms[i + 1];
      ctx.moveTo(p1.x + p1.width / 2, p1.y);
      ctx.lineTo(p2.x + p2.width / 2, p2.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
}
