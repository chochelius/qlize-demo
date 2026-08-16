// Metadatos de los 10 Reinos Celestiales (Árbol de la Estructura / Tiāndào)
export const REALM_NODES = [
  { num: 1,  name: 'Wángguó',  title: 'El Reino', color: '#ca8a04', glow: 'rgba(202, 138, 4, 0.5)', height: 0 },
  { num: 2,  name: 'Jīchǔ',    title: 'Fundamento', color: '#9333ea', glow: 'rgba(147, 51, 234, 0.5)', height: 1600 },
  { num: 3,  name: 'Guānghuī', title: 'Esplendor', color: '#ea580c', glow: 'rgba(234, 88, 12, 0.5)', height: 3200 },
  { num: 4,  name: 'Shènglì',  title: 'Victoria', color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', height: 4800 },
  { num: 5,  name: 'Měilì',    title: 'Armonía', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)', height: 6600 },
  { num: 6,  name: 'Lìliàng',  title: 'Fuerza', color: '#e11d48', glow: 'rgba(225, 29, 72, 0.5)', height: 8400 },
  { num: 7,  name: 'Réncí',    title: 'Benevolencia', color: '#2563eb', glow: 'rgba(37, 99, 235, 0.5)', height: 10200 },
  { num: 8,  name: 'Lǐjiě',    title: 'Entendimiento', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.5)', height: 13800 },
  { num: 9,  name: 'Zhìhuì',   title: 'Sabiduría', color: '#e2e8f0', glow: 'rgba(226, 232, 240, 0.5)', height: 15600 },
  { num: 10, name: 'Wángguān', title: 'Corona Suprema', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.7)', height: 17600 }
];
export const SEPHIROTH_NODES = REALM_NODES;

// Longitud total (en metros/píxeles) de la fase Entropía del Modo Arcade
export const ENTROPY_LENGTH = 5000;

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
    // Caché de la ruta óptima ordenada (hilo dorado); se invalida al cambiar plataformas
    this._optimalCache = null;
    this._optimalDirty = true;
    // Distancia máxima permitida por encima de la cámara antes de reciclar.
    // Los modos con mapa pre-construido (StageMode) lo amplían para no borrar la cima.
    this.pruneHeightAbove = height * 2.5;

    // Fondo estelar Cyber-Zen (Paralaje)
    this.starsLayer1 = [];
    for (let i = 0; i < 45; i++) {
      this.starsLayer1.push({
        x: Math.random() * width,
        y: Math.random() * height * 4,
        size: 1 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1 + Math.random() * 3
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
    this._optimalDirty = true;
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

  // Plataformas óptimas ordenadas de abajo hacia arriba (para el hilo dorado).
  // Cacheadas: se reconstruyen solo cuando cambia el conjunto de plataformas.
  getOptimalPlatforms() {
    if (this._optimalDirty || !this._optimalCache) {
      this._optimalCache = this.platforms
        .filter(p => p.active && p.isOptimal)
        .sort((a, b) => b.y - a.y);
      this._optimalDirty = false;
    }
    return this._optimalCache;
  }

  // Elimina de la ruta óptima los IDs de plataformas ya recicladas,
  // evitando que el array crezca indefinidamente en sesiones largas.
  pruneOptimalRoute() {
    const aliveIds = new Set(this.platforms.map(p => p.id));
    this.optimalRoute = this.optimalRoute.filter(id => aliveIds.has(id));
    if (this.currentRouteIndex > this.optimalRoute.length) {
      this.currentRouteIndex = this.optimalRoute.length;
    }
  }

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
    let pruned;
    if (player.gravityDirection === 1) {
      // Normal: reciclar plataformas lejanas por debajo de la cámara
      const lowerBound = this.height - cameraY + 350;
      const upperBound = -cameraY - this.pruneHeightAbove;
      pruned = this.platforms.filter(p => p.y < lowerBound && p.y > upperBound);
    } else {
      // Invertida: reciclar plataformas lejanas por encima de la cámara
      const upperBound = -cameraY - 350;
      const lowerBound = -cameraY + this.height + 2500;
      pruned = this.platforms.filter(p => p.y > upperBound && p.y < lowerBound);
    }
    if (pruned.length !== this.platforms.length) {
      this.platforms = pruned;
      this._optimalDirty = true;
      this.pruneOptimalRoute();
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

  // Puntuación y progreso (0-100) para el HUD. El score nunca baja.
  // Cada modo puede redefinirlo (p. ej. ArcadeMode durante la Entropía).
  getScoreAndProgress(cameraY, currentScore) {
    const target = this.stageLength || ENTROPY_LENGTH;
    const score = cameraY > currentScore ? cameraY : currentScore;
    const progress = Math.min(100, Math.max(0, (cameraY / target) * 100));
    return { score, progress };
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
    this.entropyStartY = ENTROPY_LENGTH; // Entropía siempre cubre la distancia completa desde la cima
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

    // Transición de Estructura a Entropía al alcanzar la cima de 5000m
    if (this.phase === 'structure' && cameraY >= ENTROPY_LENGTH) {
      this.initiateEntropyTransition(player, ENTROPY_LENGTH);
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

    // Fase de descenso en Entropía: verificar si completó el descenso completo
    if (this.phase === 'entropy' && this.entropySubPhase === 'descent') {
      const startY = -this.entropyStartY + 60;
      const distanceDescended = player.y - startY;

      // Completar la distancia total antes de volver a Estructura
      if (distanceDescended >= ENTROPY_LENGTH && cameraY <= 100) {
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

  // En Entropía el score se congela y el progreso refleja el descenso
  getScoreAndProgress(cameraY, currentScore) {
    if (this.phase === 'entropy') {
      const progress = this.entropySubPhase === 'transition'
        ? 100
        : Math.min(100, Math.max(0, (cameraY / ENTROPY_LENGTH) * 100));
      return { score: currentScore, progress };
    }
    return super.getScoreAndProgress(cameraY, currentScore);
  }

  respawnAtInitialPosition(player) {
    // Reposicionar al jugador en la plataforma inicial
    this.platforms = [];
    // Nuevo ciclo en Estructura: reiniciar Sincronía y Ruta Óptima
    // (sin esto, los contadores y los IDs de la fase anterior persistirían)
    this.optimalRoute = [];
    this.currentRouteIndex = 0;
    this.adherenceHits = 0;
    this.totalJumps = 0;
    this._optimalDirty = true;
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
    // Transición a Entropía al perder todas las vidas en Estructura (iniciando siempre en la cima)
    if (this.phase === 'structure') {
      engine.cameraY = ENTROPY_LENGTH;
      this.initiateEntropyTransition(engine.player, ENTROPY_LENGTH);
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
      const optimalPlatforms = this.getOptimalPlatforms();
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
  constructor(width, height, stageConfig = {}, legacyRepeatCount = 3) {
    super(width, height);

    // Soporte para firma heredada (segmentLength, repeatCount) o stageConfig object
    if (typeof stageConfig === 'number') {
      const segmentLength = stageConfig;
      this.segmentLength = segmentLength;
      this.repeatCount = legacyRepeatCount;
      this.stageLength = segmentLength * this.repeatCount;
      this.stageKey = 'stage_1';
      this.stageName = 'Wángguó';
      this.code = 'WANGGUO';
      this.phonetic = 'WÁNG-GUÓ';
      this.stageTitle = 'El Reino (La Iniciación)';
      this.gravityMultiplier = 1.0;
      this.tuning = {
        widthOpt: 78, widthSec: 65, gapMin: 65, gapMax: 80,
        optimalRatio: 0.70, movingRatio: 0.0, moveSpeed: [0, 0],
        decayRatio: 0.0, decayTime: 0.0
      };
      this.theme = {
        primaryColor: '#ca8a04',
        glowColor: 'rgba(202, 138, 4, 0.4)',
        bgGrad: ['rgba(43, 179, 130, 0.18)', 'rgba(5, 8, 20, 0.88)', '#02040a'],
        particleColor: '#e2b13c'
      };
    } else {
      this.stageKey = stageConfig.key || 'stage_1';
      this.stageName = stageConfig.name || 'Wángguó';
      this.code = stageConfig.code || 'WANGGUO';
      this.phonetic = stageConfig.phonetic || 'WÁNG-GUÓ';
      this.stageTitle = stageConfig.title || 'El Reino (La Iniciación)';
      this.stageLength = stageConfig.stageLength || 18000;
      this.gravityMultiplier = stageConfig.gravityMultiplier || 1.0;
      this.segmentLength = Math.floor(this.stageLength / 3);
      this.repeatCount = 3;
      this.tuning = stageConfig.tuning || {
        widthOpt: 70, widthSec: 55, gapMin: 72, gapMax: 92,
        optimalRatio: 0.60, movingRatio: 0.0, moveSpeed: [0, 0],
        decayRatio: 0.0, decayTime: 0.0
      };
      this.theme = stageConfig.theme || {
        primaryColor: '#ca8a04',
        glowColor: 'rgba(202, 138, 4, 0.4)',
        bgGrad: ['rgba(43, 179, 130, 0.18)', 'rgba(5, 8, 20, 0.88)', '#02040a'],
        particleColor: '#e2b13c'
      };
    }

    this.ambientMotes = [];
    for (let i = 0; i < 20; i++) {
      this.ambientMotes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        speed: 15 + Math.random() * 25,
        alpha: 0.2 + Math.random() * 0.5
      });
    }

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
    this.stageComplete = false; // Detecta cuando el jugador llega a la cima

    this.buildStageMap();
  }

  get isSweeping() { return this.isSweepingCamera; }

  // StageMode no genera plataformas dinámicamente, todo está pre-construido
  generatePlatforms(cameraY) {}

  buildStageMap() {
    let startY = this.height - 120;
    
    // Generar cada segmento desde donde terminó el anterior
    for (let repeat = 0; repeat < this.repeatCount; repeat++) {
      const segment = this.buildSingleSegment(this.segmentLength, startY);
      
      for (const platform of segment) {
        this.addPlatform(platform.x, platform.y, platform.width, 16, {
          isOptimal: platform.isOptimal,
          isSecondary: platform.isSecondary,
          isMoving: platform.isMoving,
          originX: platform.originX,
          moveSpeed: platform.moveSpeed,
          moveAmplitude: platform.moveAmplitude,
          movePhase: platform.movePhase,
          isDecaying: platform.isDecaying,
          decayTime: platform.decayTime,
          decayRemaining: platform.decayRemaining,
          decaying: false
        });
      }
      
      if (segment.length > 0) {
        startY = segment[segment.length - 1].y;
      }
    }
  }

  buildSingleSegment(length, startY) {
    const platforms = [];
    let currentY = startY;
    const endY = startY - length;
    let lastOptimalX = this.width / 2;

    const {
      widthOpt = 70,
      widthSec = 55,
      gapMin = 70,
      gapMax = 90,
      optimalRatio = 0.60,
      movingRatio = 0.0,
      moveSpeed = [60, 100],
      decayRatio = 0.0,
      decayTime = 1.0
    } = this.tuning;

    while (currentY > endY) {
      const isOptimal = Math.random() < optimalRatio;
      const pWidth = isOptimal ? widthOpt : widthSec;
      
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
      
      const gap = gapMin + Math.random() * (gapMax - gapMin);
      currentY -= gap;

      const isMoving = Math.random() < movingRatio;
      const isDecaying = !isOptimal && Math.random() < decayRatio;

      const minSpeed = moveSpeed[0] || 60;
      const maxSpeed = moveSpeed[1] || 100;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const moveAmp = Math.min(pX, (this.width - pWidth - pX), 45 + Math.random() * 55);

      platforms.push({
        x: pX,
        y: currentY,
        width: pWidth,
        isOptimal,
        isSecondary: !isOptimal,
        isMoving,
        originX: pX,
        moveSpeed: speed,
        moveAmplitude: moveAmp,
        movePhase: Math.random() * Math.PI * 2,
        isDecaying,
        decayTime,
        decayRemaining: decayTime
      });
    }
    
    return platforms;
  }

  onPlatformStepped(platform, player) {
    super.onPlatformStepped(platform, player);
    if (platform.isDecaying && !platform.decaying) {
      platform.decaying = true;
      platform.decayRemaining = platform.decayTime || 0.9;
    }
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
          this.needsPlayerReposition = true;
        }
      }
      return;
    }
    
    // Detectar si el jugador alcanzó la cima
    if (cameraY >= this.stageLength && !this.stageComplete) {
      this.stageComplete = true;
      return;
    }

    // Actualizar movimiento sinusoidal de plataformas móviles y colapso de efímeras
    let dirty = false;
    for (const p of this.platforms) {
      if (!p.active) continue;

      if (p.isMoving) {
        const amp = p.moveAmplitude || 50;
        const speed = p.moveSpeed || 80;
        p.movePhase = (p.movePhase || 0) + (speed / Math.max(1, amp)) * dt;
        const targetX = (p.originX !== undefined ? p.originX : p.x) + Math.sin(p.movePhase) * amp;
        p.x = Math.max(10, Math.min(this.width - p.width - 10, targetX));
      }

      if (p.decaying) {
        p.decayRemaining -= dt;
        if (p.decayRemaining <= 0) {
          p.active = false;
          dirty = true;
        }
      }
    }

    if (dirty) {
      this._optimalDirty = true;
    }

    // Actualizar partículas ambientales
    if (this.ambientMotes) {
      for (const m of this.ambientMotes) {
        m.y -= m.speed * dt;
        if (m.y < 0) {
          m.y = this.height;
          m.x = Math.random() * this.width;
        }
      }
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

    const gradStops = this.theme?.bgGrad || ['rgba(43, 179, 130, 0.18)', 'rgba(5, 8, 20, 0.88)', '#02040a'];

    // Fondo Místico con Paleta Exclusiva del Reino
    const grad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.4, 20,
      this.width * 0.5, this.height * 0.5, this.height * 0.85
    );
    grad.addColorStop(0, gradStops[0]);
    grad.addColorStop(0.65, gradStops[1]);
    grad.addColorStop(1, gradStops[2] || '#02040a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Partículas Ambientales Temáticas
    if (this.ambientMotes) {
      ctx.fillStyle = this.theme?.particleColor || '#e2b13c';
      for (const m of this.ambientMotes) {
        ctx.globalAlpha = m.alpha;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Marca de Agua Tipográfica de la Sefirá
    if (this.stageName) {
      ctx.fillStyle = this.theme?.glowColor ? this.theme.glowColor.replace(/[\d.]+\)$/, '0.08)') : 'rgba(226, 177, 60, 0.05)';
      ctx.font = '700 44px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.stageName.toUpperCase(), this.width * 0.5, this.height * 0.45);
    }

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
    const optimalPlatforms = this.getOptimalPlatforms();
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

// ---------------------------------------------------------
// ⛩️ Modo Tutorial ("Iniciación Vectorial")
// ---------------------------------------------------------
export function getTutorialStepData(stepNumber, isDesktop = true, controlMode = 'keyboard') {
  let moveText = 'Usa A / D o Flechas para moverte horizontalmente.';
  if (!isDesktop) {
    if (controlMode === 'gyro') {
      moveText = 'Inclina suavemente tu dispositivo a los lados para moverte.';
    } else {
      moveText = 'Desliza tu pulgar horizontalmente en la pantalla para moverte.';
    }
  } else {
    moveText = 'Usa las teclas A / D o ← / → para moverte. El salto es automático al tocar cada plataforma.';
  }

  const steps = {
    1: {
      step: 1,
      totalSteps: 6,
      badge: 'ZONA 1 • FUNDAMENTOS',
      title: 'SALTO AUTOMÁTICO Y MOVIMIENTO',
      text: `${moveText} Practica el balance y siente la inercia en los primeros saltos.`
    },
    2: {
      step: 2,
      totalSteps: 6,
      badge: 'ZONA 2 • RUTA SAGRADA',
      title: 'SINCRONÍA Y MULTIPLICADORES',
      text: 'Aterrizar en plataformas doradas con nodos mantiene tu Sincronía al 100% y eleva los multiplicadores (x1.5, x2.0, x3.0).'
    },
    3: {
      step: 3,
      totalSteps: 6,
      badge: 'ZONA 3 • RED DE SALVAMENTO',
      title: 'PLATAFORMAS DE CENIZA',
      text: 'Las plataformas grises son de apoyo: no aumentan la sincronía, pero evitan que caigas al vacío y pierdas vidas.'
    },
    4: {
      step: 4,
      totalSteps: 6,
      badge: 'ZONA 4 • TÚNEL ESPACIAL',
      title: 'SCREEN-WRAP LATERAL',
      text: 'Cruza el borde derecho de la pantalla para reaparecer de inmediato por la izquierda. ¡Pruébalo en los siguientes saltos!'
    },
    5: {
      step: 5,
      totalSteps: 6,
      badge: 'ZONA 5 • LA DUALIDAD',
      title: 'POLARIDAD Y ENTROPÍA',
      text: 'Al perder vidas en Arcade, la gravedad se invierte, la música suena al reverso y el objetivo es descender esquivando el vacío.'
    },
    6: {
      step: 6,
      totalSteps: 6,
      badge: 'ZONA 6 • CULMINACIÓN',
      title: '¡INICIACIÓN COMPLETADA!',
      text: '¡Has dominado los vectores de Qlize! Aterriza en la plataforma sagrada de la cima para reclamar tu medalla.'
    }
  };

  return steps[stepNumber] || steps[1];
}

export class TutorialMode extends BaseMode {
  constructor(width, height, isDesktop = true, controlMode = 'keyboard') {
    super(width, height);
    this.isTutorial = true;
    this.isDesktop = isDesktop;
    this.controlMode = controlMode;
    this.stageLength = 3200; // Mapa amplio para leer y practicar con calma
    this.pruneHeightAbove = 4500;
    this.currentStep = 1;
    this.stageComplete = false;
    this.onTutorialStepChange = null;

    this.buildTutorialMap();
  }

  generatePlatforms() {}

  buildTutorialMap() {
    this.platforms = [];
    // La plataforma inicial del BaseMode ya no existe: limpiar también la ruta
    // óptima para no conservar una referencia huérfana a su ID
    this.optimalRoute = [];
    this.currentRouteIndex = 0;
    this.adherenceHits = 0;
    this.totalJumps = 0;
    this._optimalDirty = true;
    
    // Base de partida
    this.addPlatform(this.width / 2 - 60, this.height - 50, 120, 16, { isStartingPlatform: true, isOptimal: true });
    this.lastSafePlatform = this.platforms[0];

    // ---------------------------------------------------------
    // ZONA 1 (0m - 500m): Fundamentos de Movimiento y Salto (5 saltos)
    // ---------------------------------------------------------
    this.addPlatform(this.width / 2 - 45, this.height - 150, 90, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 30, this.height - 250, 85, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 40, this.height - 350, 85, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 20, this.height - 450, 85, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 30, this.height - 550, 90, 16, { isOptimal: true });

    // ---------------------------------------------------------
    // ZONA 2 (550m - 1100m): Ruta Sagrada y Sincronía (5 saltos continuos)
    // ---------------------------------------------------------
    this.addPlatform(this.width / 2 + 50, this.height - 670, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 60, this.height - 785, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 40, this.height - 900, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 50, this.height - 1015, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 10, this.height - 1130, 80, 16, { isOptimal: true });

    // ---------------------------------------------------------
    // ZONA 3 (1150m - 1650m): Plataformas de Apoyo (Ceniza) y Recuperación (4 saltos)
    // ---------------------------------------------------------
    this.addPlatform(this.width / 2 - 120, this.height - 1250, 80, 16, { isSecondary: true });
    this.addPlatform(this.width / 2 + 80, this.height - 1365, 80, 16, { isSecondary: true });
    this.addPlatform(this.width / 2 - 50, this.height - 1480, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 30, this.height - 1595, 80, 16, { isOptimal: true });

    // ---------------------------------------------------------
    // ZONA 4 (1650m - 2300m): Screen-Wrap Lateral Obligatorio (5 saltos)
    // ---------------------------------------------------------
    this.addPlatform(this.width - 65, this.height - 1720, 65, 16, { isOptimal: true });
    this.addPlatform(10, this.height - 1840, 65, 16, { isOptimal: true });
    this.addPlatform(this.width - 65, this.height - 1960, 65, 16, { isOptimal: true });
    this.addPlatform(10, this.height - 2080, 65, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 40, this.height - 2200, 85, 16, { isOptimal: true });

    // ---------------------------------------------------------
    // ZONA 5 (2300m - 2850m): Polaridad y Dualidad (4 saltos)
    // ---------------------------------------------------------
    this.addPlatform(this.width / 2 + 40, this.height - 2330, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 50, this.height - 2460, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 + 30, this.height - 2590, 75, 16, { isOptimal: true });
    this.addPlatform(this.width / 2 - 40, this.height - 2720, 80, 16, { isOptimal: true });

    // ---------------------------------------------------------
    // ZONA 6 (2850m - CIMA): Kether de la Iniciación (Culminación)
    // ---------------------------------------------------------
    this.addPlatform(this.width / 2 - 60, this.height - 2870, 120, 18, { isOptimal: true, isSummit: true });
  }

  update(dt, cameraY, player) {
    super.update(dt, cameraY, player);

    // Detección de paso tutorial según altura del jugador (en píxeles recorridos)
    let step = 1;
    const progressY = (this.height - 50) - player.y;

    if (progressY > 2750) {
      step = 6;
    } else if (progressY > 2220) {
      step = 5;
    } else if (progressY > 1620) {
      step = 4;
    } else if (progressY > 1150) {
      step = 3;
    } else if (progressY > 580) {
      step = 2;
    } else {
      step = 1;
    }

    if (step !== this.currentStep) {
      this.currentStep = step;
      if (this.onTutorialStepChange) {
        const stepData = getTutorialStepData(step, this.isDesktop, this.controlMode);
        this.onTutorialStepChange(stepData);
      }
    }
  }

  // La Iniciación se completa al ATERRIZAR en la plataforma sagrada de la cima.
  // (Antes se chequeaba player.vy === 0 en update, pero el salto automático del
  // motor hace que vy nunca sea exactamente 0 al posarse, bloqueando el final.)
  onPlatformStepped(platform, player) {
    super.onPlatformStepped(platform, player);
    if (platform.isSummit) {
      this.stageComplete = true;
    }
  }

  calculateMedal() {
    return { name: 'Iniciación', icon: '⛩️', title: 'Iniciación Vectorial Completada' };
  }

  drawBackground(ctx, cameraY) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Fondo Cyber-Zen Especial Iniciación (Jade y Espacio Profundo)
    const grad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.4, 20,
      this.width * 0.5, this.height * 0.5, this.height * 0.85
    );
    grad.addColorStop(0, 'rgba(43, 179, 130, 0.22)');
    grad.addColorStop(0.6, 'rgba(5, 8, 20, 0.88)');
    grad.addColorStop(1, '#02040a');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    // Hilo Dorado de Luz Punteada
    ctx.strokeStyle = 'rgba(226, 177, 60, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const optimalPlatforms = this.getOptimalPlatforms();
    for (let i = 0; i < optimalPlatforms.length - 1; i++) {
      const p1 = optimalPlatforms[i];
      const p2 = optimalPlatforms[i + 1];
      ctx.moveTo(p1.x + p1.width / 2, p1.y);
      ctx.lineTo(p2.x + p2.width / 2, p2.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
