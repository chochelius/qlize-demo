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
    if (this.lowestPlatformY === undefined || y > this.lowestPlatformY) {
      this.lowestPlatformY = y;
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
    if (player.gravityDirection === 1) {
      // Normal: reciclar plataformas lejanas por debajo de la cámara
      const lowerBound = this.height - cameraY + 350;
      const upperBound = -cameraY - this.pruneHeightAbove;
      this.platforms = this.platforms.filter(p => p.y < lowerBound && p.y > upperBound);
    } else {
      // Invertida: reciclar plataformas lejanas por encima de la cámara
      const upperBound = -cameraY - 350;
      const lowerBound = -cameraY + this.height + 2500;
      this.platforms = this.platforms.filter(p => p.y > upperBound && p.y < lowerBound);
    }
    this.generatePlatforms(cameraY);
  }

  generatePlatforms(cameraY) {}

  updateCamera(cameraY, player, dt) {
    if (player.gravityDirection === 1) {
      const targetY = -player.y + this.height * 0.45;
      return targetY > cameraY ? targetY : cameraY;
    } else {
      // Invertida: la cámara sigue al jugador hacia abajo
      const targetY = -player.y + this.height * 0.55;
      return targetY < cameraY ? targetY : cameraY;
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
    this.entropySubPhase = null; // 'transition' (subiendo a base) -> 'descent' (bajando)
    this.entropyStartY = 0;
    this.entropyTopPlatform = null;
    this.currentNodeIndex = 0;
    this.platformGapY = 72;
    this.sacredTime = 0;

    this.generatePlatforms(0);
  }

  generatePlatforms(cameraY) {
    if (this.phase === 'structure') {
      const targetY = -cameraY - this.height * 1.8;

      while (this.highestPlatformY > targetY) {
        const isOptimal = Math.random() < 0.65;
        const pWidth = isOptimal ? (60 + Math.random() * 25) : (50 + Math.random() * 30);
        
        let pX;
        if (isOptimal) {
          const lastOptimal = this.platforms.filter(p => p.isOptimal && !p.isHusk).pop();
          if (lastOptimal) {
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
          pX = Math.random() * (this.width - pWidth);
        }
        
        const pY = this.highestPlatformY - this.platformGapY - (Math.random() * 30);

        this.addPlatform(pX, pY, pWidth, 16, {
          isOptimal,
          isSecondary: !isOptimal,
          isHusk: false
        });
      }
    } else if (this.phase === 'entropy') {
      // Generación continua y dinámica de plataformas carmesí hacia abajo durante todo el descenso (5000m)
      const targetY = -cameraY + this.height * 2.2;
      const startY = -this.entropyStartY + 60;
      const maxDescentY = startY + 5200;

      while (this.lowestPlatformY < targetY && this.lowestPlatformY < maxDescentY) {
        const isOptimal = Math.random() < 0.7;
        const pWidth = isOptimal ? (80 + Math.random() * 20) : (65 + Math.random() * 20);

        let pX;
        if (isOptimal) {
          const lastOptimal = this.platforms.filter(p => p.isOptimal && p.isHusk).pop();
          const lastCenterX = lastOptimal ? (lastOptimal.x + lastOptimal.width / 2) : (this.width / 2);
          const maxHorizontalReach = 160;
          const minCenterX = Math.max(pWidth / 2, lastCenterX - maxHorizontalReach);
          const maxCenterX = Math.min(this.width - pWidth / 2, lastCenterX + maxHorizontalReach);
          const newCenterX = minCenterX + Math.random() * (maxCenterX - minCenterX);
          pX = newCenterX - pWidth / 2;
        } else {
          pX = Math.random() * (this.width - pWidth);
        }

        const pY = this.lowestPlatformY + 72 + (Math.random() * 16);
        this.addPlatform(pX, pY, pWidth, 16, {
          isOptimal,
          isSecondary: !isOptimal,
          isHusk: true
        });

        // Añadir ocasionalmente una plataforma de apoyo secundaria paralela
        if (isOptimal && Math.random() < 0.45) {
          const secWidth = 60 + Math.random() * 20;
          const secX = (pX > this.width / 2) ? (Math.random() * (this.width / 2 - secWidth)) : (this.width / 2 + Math.random() * (this.width / 2 - secWidth));
          this.addPlatform(secX, pY + (Math.random() - 0.5) * 20, secWidth, 16, {
            isOptimal: false,
            isSecondary: true,
            isHusk: true
          });
        }
      }
    }
  }

  initiateEntropyTransition(player, currentCameraY) {
    this.phase = 'entropy';
    this.entropySubPhase = 'transition';
    this.entropyStartY = 5000; // Entropía siempre cubre los 5000m completos desde la cima
    player.gravityDirection = -1; // Gravedad Invertida
    player.vy = -600; // Impulso continuo hacia arriba para llegar a la base superior
    player.noclip = true;

    // Limpiar plataformas de la fase previa de Estructura para el nuevo recorrido
    this.platforms = [];
    this.optimalRoute = [];
    this.adherenceHits = 0;
    this.totalJumps = 0;

    // Crear la plataforma base superior central del Árbol Invertido
    const topBaseY = -this.entropyStartY + 60;
    const topBaseWidth = 140;
    const topBaseX = this.width / 2 - topBaseWidth / 2;

    // Agregar la plataforma base superior (raíz del Árbol Invertido)
    this.entropyTopPlatform = this.addPlatform(topBaseX, topBaseY, topBaseWidth, 20, {
      isStartingPlatform: true,
      isOptimal: true,
      isHusk: true
    });
    this.lastSafePlatform = this.entropyTopPlatform;
    this.lowestPlatformY = topBaseY + 20;

    // Primera plataforma óptima justo debajo de la base para iniciar el descenso cómodamente
    const firstPlatformWidth = 85;
    const firstPlatformY = this.lowestPlatformY + 75;
    const firstPlatformX = this.width / 2 - firstPlatformWidth / 2;
    this.addPlatform(firstPlatformX, firstPlatformY, firstPlatformWidth, 16, {
      isOptimal: true,
      isSecondary: false,
      isHusk: true
    });
    this.lowestPlatformY = firstPlatformY;

    // Generar lote inicial de plataformas hacia abajo por delante de la cámara
    this.generatePlatforms(this.entropyStartY);

    if (this.onPhaseChange) {
      this.onPhaseChange('entropy');
    }
  }

  returnToStructure(player) {
    this.phase = 'structure';
    this.entropySubPhase = null;
    this.entropyStartY = 0;
    this.entropyTopPlatform = null;
    player.gravityDirection = 1;
    player.noclip = false;
    this.needsResetToStructure = true;
    if (this.onPhaseChange) {
      this.onPhaseChange('structure');
    }
  }

  update(dt, cameraY, player) {
    super.update(dt, cameraY, player);
    this.sacredTime += dt;

    // Transición de Estructura a Entropía al alcanzar 5000m
    if (this.phase === 'structure' && cameraY >= 5000) {
      this.initiateEntropyTransition(player, 5000);
      return;
    }

    // Sub-fase de transición: jugador sube con noclip hasta la base superior central
    if (this.phase === 'entropy' && this.entropySubPhase === 'transition') {
      const topBaseY = -this.entropyStartY + 60;
      const targetX = this.width / 2 - player.width / 2;

      // Alinear rápidamente hacia el centro horizontal
      player.x += (targetX - player.x) * Math.min(1, dt * 8);

      // Mantener velocidad de ascenso firme durante noclip
      if (player.vy > -300) {
        player.vy = -550;
      }

      // Cuando el jugador alcanza o supera la plataforma base superior
      if (player.y <= topBaseY + 18) {
        this.entropySubPhase = 'descent'; // Ahora comienza el descenso
        player.noclip = false;
        player.x = targetX;
        player.y = topBaseY + 18 + 4; // Cara inferior de la base invertida
        player.vx = 0;
        player.vy = 0;
        this.lastSafePlatform = this.entropyTopPlatform;
        player.jump(this.getJumpForce()); // Salto inicial hacia abajo
      }
      return;
    }

    // Fase de descenso en Entropía: verificar si completó el descenso completo de 5000m
    if (this.phase === 'entropy' && this.entropySubPhase === 'descent') {
      const startY = -this.entropyStartY + 60;
      const distanceDescended = player.y - startY;

      // Completar la distancia total de 5000m antes de volver a Estructura
      if (distanceDescended >= 5000 && cameraY <= 100) {
        this.returnToStructure(player);
        return;
      }
    }

    // Actualizar Sefirá / Reino actual (solo en fase estructura)
    if (this.phase === 'structure') {
      for (let i = SEPHIROTH_NODES.length - 1; i >= 0; i--) {
        if (cameraY >= SEPHIROTH_NODES[i].height) {
          this.currentNodeIndex = i;
          break;
        }
      }
    }
  }

  updateCamera(cameraY, player, dt) {
    // Durante la transición, la cámara permanece fija en la altitud de la cima
    if (this.phase === 'entropy' && this.entropySubPhase === 'transition') {
      return this.entropyStartY || cameraY;
    }
    return super.updateCamera(cameraY, player, dt);
  }

  respawnAtInitialPosition(player) {
    // Reposicionar al jugador en la plataforma inicial
    this.platforms = [];
    this.highestPlatformY = 0;
    this.lowestPlatformY = this.height - 50;
    this.addPlatform(this.width / 2 - 45, this.height - 50, 90, 16, { isStartingPlatform: true, isOptimal: true, isHusk: false });
    this.lastSafePlatform = this.platforms[0];
    this.generatePlatforms(0);

    player.x = this.width / 2 - player.width / 2;
    player.y = this.height - 150;
    player.vx = 0;
    player.vy = 0;
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
    // Transición a Entropía al perder todas las vidas en Estructura (iniciando siempre en la cima 5000m)
    if (this.phase === 'structure') {
      engine.cameraY = 5000;
      this.initiateEntropyTransition(engine.player, 5000);
      engine.lives = 3; // Restaurar vidas para la fase Entropía
      engine.degradationLevel = 0;
      engine.onLivesUpdate(engine.lives);
    } else if (this.phase === 'entropy') {
      // Si perdió todas las vidas durante Entropía, vuelve a Estructura
      this.returnToStructure(engine.player);
      engine.lives = 3;
      engine.degradationLevel = 0;
      engine.onLivesUpdate(engine.lives);
      engine.cameraY = 0;
      this.respawnAtInitialPosition(engine.player);
    } else {
      // Game over
      engine.stop();
      engine.onGameOver(engine.score, this.getCurrentRealm(), null);
    }
  }

  drawBackground(ctx, cameraY) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.phase === 'structure') {
      // Árbol de la Luz: Fondo Azul Marino Ultra Profundo a Celeste Suave
      const grad = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.35, 10,
        this.width * 0.5, this.height * 0.5, this.height * 0.8
      );
      grad.addColorStop(0, 'rgba(100, 181, 246, 0.18)');
      grad.addColorStop(0.55, 'rgba(5, 8, 20, 0.85)');
      grad.addColorStop(1, '#02040a');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Estrellas en Paralaje
      ctx.fillStyle = '#f5f5f7';
      for (const s of this.starsLayer1) {
        const sy = (s.y - cameraY * 0.2) % this.height;
        const finalY = sy < 0 ? sy + this.height : sy;
        const alpha = s.alpha * (0.6 + 0.4 * Math.sin(this.sacredTime * s.twinkleSpeed));
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillRect(s.x, finalY, s.size, s.size);
      }
      ctx.restore();

      // Hilo Continuo y Vibrante de Luz Punteada Dorada y Blanca (Sendero de Adherencia)
      ctx.strokeStyle = 'rgba(226, 177, 60, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
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
      // Árbol de la Sombra: Negro Espacial Ultra Profundo con Fuegos Góticos Carmesí y Púrpura
      const grad = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.5, 20,
        this.width * 0.5, this.height * 0.5, this.height * 0.9
      );
      grad.addColorStop(0, 'rgba(211, 47, 47, 0.25)');
      grad.addColorStop(0.65, 'rgba(74, 20, 140, 0.55)');
      grad.addColorStop(1, '#02040a');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);

      // Chispas de Entropía en Bordes de Pantalla
      ctx.fillStyle = '#d32f2f';
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

  // StageMode no genera plataformas dinámicamente, todo está pre-construido
  generatePlatforms(cameraY) {}

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
          // Reposicionar al jugador en la plataforma inicial después del barrido
          this.needsPlayerReposition = true;
          console.log('[StageMode] Barrido completo, marcando needsPlayerReposition');
          console.log('[StageMode] Plataformas:', this.platforms.length);
          console.log('[StageMode] lastSafePlatform:', this.lastSafePlatform);
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
    grad.addColorStop(0, 'rgba(43, 179, 130, 0.18)');
    grad.addColorStop(0.65, 'rgba(5, 8, 20, 0.88)');
    grad.addColorStop(1, '#02040a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    // Hilo Dorado Continuo de la Ruta de Constelación
    // Durante la cinemática de barrido, aumentar brillo y grosor
    const isSweeping = this.isSweepingCamera;
    const lineAlpha = isSweeping ? 0.95 : 0.65;
    const lineWidth = isSweeping ? 3.5 : 2;
    const glowBlur = isSweeping ? 16 : 4;
    
    ctx.strokeStyle = `rgba(226, 177, 60, ${lineAlpha})`;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([4, 4]);
    
    if (glowBlur > 0) {
      ctx.shadowColor = '#e2b13c';
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
