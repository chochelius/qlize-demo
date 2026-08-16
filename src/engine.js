export class Engine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.lastTime = 0;
    this.animationId = null;
    this.isRunning = false;

    this.player = null;
    this.mode = null;
    this.input = null;

    this.cameraY = 0;
    this.score = 0;

    // Sistema de Vidas y Degradación (GDD v1.2)
    this.lives = 3;
    this.degradationLevel = 0; // 0, 1, 2 (niebla oscura y corrupción)
    this.screenShakeTime = 0;
    this.staticFlashTime = 0;

    // Partículas de Impacto
    this.impactParticles = [];

    // Callbacks de Eventos
    this.onGameOver = () => {};
    this.onScoreUpdate = () => {};
    this.onRealmUpdate = () => {};
    this.onLivesUpdate = () => {};
    this.onSyncUpdate = () => {};
    this.onJumpEffect = () => {};
    this.onLifeLost = () => {};
    this.onStageComplete = () => {}; // Nuevo: callback cuando se completa una etapa
    this.onPhaseChange = () => {}; // Callback para cambios de fase (ArcadeMode)
  }

  setPlayer(player) { this.player = player; }
  setMode(mode) {
    this.mode = mode;
    if (this.mode) {
      this.mode.onPhaseChange = (phase) => this.onPhaseChange(phase);
    }
  }
  setInput(input) { this.input = input; }

  reset() {
    this.stop();
    this.cameraY = 0;
    this.score = 0;
    this.lives = 3;
    this.degradationLevel = 0;
    this.screenShakeTime = 0;
    this.staticFlashTime = 0;
    this.impactParticles = [];
    this.stageCompleteTriggered = false;
    if (this.player) {
      this.player.jumpMultiplier = 1.0;
    }
    this.onScoreUpdate(0, 0);
    this.onLivesUpdate(this.lives);
  }

  start() {
    this.stop(); // Prevenir múltiples bucles rAF concurrentes
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  triggerDegradation() {
    this.lives--;
    this.degradationLevel++;
    this.screenShakeTime = 0.35;
    this.staticFlashTime = 0.2;
    this.onLivesUpdate(this.lives);
    this.onLifeLost(this.lives);

    // Reubicar al jugador en la última plataforma que pisó
    if (this.lives > 0) {
      this.respawnAtSafePlatform();
    }
  }

  respawnAtSafePlatform() {
    const safeP = this.mode.lastSafePlatform;
    const inverted = this.player.gravityDirection === -1;

    if (safeP) {
      this.player.x = safeP.x + safeP.width / 2 - this.player.width / 2;
      this.player.y = inverted
        ? safeP.y + safeP.height + 10  // Bajo la plataforma (reverso) en Entropía
        : safeP.y - this.player.height - 10;
    } else {
      this.player.x = this.width / 2 - this.player.width / 2;
      this.player.y = -this.cameraY + this.height - 200;
    }
    this.player.vx = 0;
    this.player.vy = inverted ? 400 : -400;
  }

  spawnImpactParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      this.impactParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 140,
        vy: 20 + Math.random() * 80,
        radius: 2 + Math.random() * 3,
        alpha: 0.9,
        color
      });
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(Math.min(dt, 0.1));
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.screenShakeTime > 0) this.screenShakeTime -= dt;
    if (this.staticFlashTime > 0) this.staticFlashTime -= dt;

    // 1. Actualizar Modo de Juego
    this.mode.update(dt, this.cameraY, this.player);

    // 2. Durante la cinemática de barrido (Modo Etapas) las físicas quedan en pausa
    if (this.mode.isSweeping) {
      this.cameraY = this.mode.updateCamera(this.cameraY, this.player, dt);
      return;
    }

    // 2.5. Reposicionar al jugador si el modo lo requiere (después del barrido en StageMode)
    // Esto debe ocurrir ANTES de player.update() para evitar que muera por "fuera de pantalla"
    if (this.mode.needsPlayerReposition) {
      this.respawnAtSafePlatform();
      this.mode.needsPlayerReposition = false;
      // Asegurar que la cámara esté en la posición inicial
      this.cameraY = 0;
    }

    // 2.6. Reset completo a Estructura (después del descenso en Entropía)
    if (this.mode.needsResetToStructure) {
      this.cameraY = 0;
      this.lives = 3;
      this.degradationLevel = 0;
      this.onLivesUpdate(this.lives);
      this.mode.respawnAtInitialPosition(this.player);
      this.mode.needsResetToStructure = false;
    }

    // 3. Actualizar Jugador
    this.player.update(dt, this.input, this.width);

    // Notificar Sincronía a la UI
    this.onSyncUpdate(this.player.synchrony);

    // 3. Actualizar Cámara
    this.cameraY = this.mode.updateCamera(this.cameraY, this.player, dt);

    // Puntuación de Distancia y Progreso
    let currentProgress = 0;
    if (this.mode.phase === 'entropy') {
      if (this.mode.entropySubPhase === 'transition') {
        currentProgress = 100; // En la cima
      } else {
        // En descenso: de 100% (cima) a 0% (base)
        currentProgress = Math.min(100, Math.max(0, (this.cameraY / 5000) * 100));
      }
    } else {
      const target = this.mode.stageLength || 5000;
      if (this.cameraY > this.score) {
        this.score = this.cameraY;
      }
      currentProgress = Math.min(100, Math.max(0, (this.cameraY / target) * 100));
    }
    this.onScoreUpdate(this.score, currentProgress);

    // Verificar si la etapa está completa (StageMode)
    if (this.mode.stageComplete && !this.stageCompleteTriggered) {
      this.stageCompleteTriggered = true;
      const medal = this.mode.calculateMedal(this.score);
      this.onStageComplete(this.score, medal);
      this.stop();
      return;
    }

    // Verificar si la fase Entropía está completa (ArcadeMode)
    if (this.mode.entropyComplete && !this.entropyCompleteTriggered) {
      this.entropyCompleteTriggered = true;
      this.onGameOver(this.score, this.mode.getCurrentRealm(), null);
      this.stop();
      return;
    }

    // Reino / Sefirá actual
    if (this.mode.getCurrentRealm) {
      this.onRealmUpdate(this.mode.getCurrentRealm());
    }

    // 4. Actualizar Partículas
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const p = this.impactParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2.5;
      p.radius *= 0.95;
      if (p.alpha <= 0 || p.radius < 0.5) {
        this.impactParticles.splice(i, 1);
      }
    }

    // 5. Detección de Colisión con Plataformas (Gravedad Normal vs Invertida)
    const isFallingNormal = this.player.gravityDirection === 1 && this.player.vy > 0;
    const isFallingInverted = this.player.gravityDirection === -1 && this.player.vy < 0;

    // Solo detectar colisiones si no está en modo noclip
    if (!this.player.noclip && (isFallingNormal || isFallingInverted)) {
      const platforms = this.mode.getPlatforms();
      for (const p of platforms) {
        if (!p.active) continue;

        const playerBottom = this.player.y + this.player.height;
        const playerTop = this.player.y;

        if (this.player.gravityDirection === 1) {
          // Normal: Rebote en la cara superior
          if (
            playerBottom >= p.y &&
            playerBottom <= p.y + p.height + 25 &&
            this.player.x + this.player.width > p.x &&
            this.player.x < p.x + p.width
          ) {
            this.player.y = p.y - this.player.height;
            this.player.jump(this.mode.getJumpForce());
            this.mode.onPlatformStepped(p, this.player);
            
            // Multiplicador de salto acumulativo
            if (p.isOptimal) {
              this.player.jumpMultiplier *= 1.1; // +10% por óptima consecutiva
            } else {
              this.player.jumpMultiplier = 1.0; // Reset en secundaria
            }
            
            this.onJumpEffect(p);
            this.spawnImpactParticles(this.player.x + this.player.width / 2, p.y, p.isOptimal ? '#fbbf24' : '#64748b');
            break;
          }
        } else {
          // Invertida: Rebote en la cara inferior (reverso)
          if (
            playerTop <= p.y + p.height &&
            playerTop >= p.y - 25 &&
            this.player.x + this.player.width > p.x &&
            this.player.x < p.x + p.width
          ) {
            this.player.y = p.y + p.height;
            this.player.jump(this.mode.getJumpForce());
            this.mode.onPlatformStepped(p, this.player);
            
            // Multiplicador de salto acumulativo
            if (p.isOptimal) {
              this.player.jumpMultiplier *= 1.1; // +10% por óptima consecutiva
            } else {
              this.player.jumpMultiplier = 1.0; // Reset en secundaria
            }
            
            this.onJumpEffect(p);
            this.spawnImpactParticles(this.player.x + this.player.width / 2, p.y + p.height, '#e11d48');
            break;
          }
        }
      }
    }

    // 6. Condición de Caída al Abismo (Pérdida de Vida / Rescate por Escudo)
    // No detectar caída si el jugador está en noclip (transición a Entropía)
    const isOutOfScreen = this.player.gravityDirection === 1
      ? (this.player.y > this.height - this.cameraY + 120)
      : (this.player.y < -this.cameraY - 200);

    if (isOutOfScreen && !this.player.noclip) {
      // Escudo del Vacío (Sincronía Perfecta >= 90%)
      if (this.player.hasVoidShield) {
        this.player.hasVoidShield = false;
        this.player.synchrony = 70; // Reduce Sincronía tras usar el escudo
        this.respawnAtSafePlatform();
        return;
      }

      this.triggerDegradation();
      if (this.lives <= 0) {
        // Delegar al modo la decisión de qué hacer al perder todas las vidas
        if (this.mode.onAllLivesLost) {
          this.mode.onAllLivesLost(this);
        } else {
          // Comportamiento por defecto: game over
          this.stop();
          this.onGameOver(this.score, this.mode.getCurrentRealm(), this.mode.calculateMedal ? this.mode.calculateMedal(this.score) : null);
        }
      }
    }
  }

  draw() {
    // Sacudida de Pantalla por Degradación
    this.ctx.save();
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * 12;
      const shakeY = (Math.random() - 0.5) * 12;
      this.ctx.translate(shakeX, shakeY);
    }

    // Fondo Base
    this.ctx.fillStyle = this.mode.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Transformación de Cámara
    this.ctx.save();
    this.ctx.translate(0, this.cameraY);

    // Fondo Místico / Estelar
    this.mode.drawBackground(this.ctx, this.cameraY);

    const realm = this.mode.getCurrentRealm();
    const realmColor = realm ? realm.color : '#fbbf24';

    // Partículas de Impacto
    for (const p of this.impactParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Dibujar Plataformas (Celestiales, Entropía u Piedra Inerte)
    const platforms = this.mode.getPlatforms();
    for (const p of platforms) {
      if (!p.active) continue;

      this.ctx.save();

      if (p.isHusk) {
        // Plataforma de Entropía (Obsidiana con Resplandor Carmesí)
        const huskGrad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        huskGrad.addColorStop(0, '#9f1239');
        huskGrad.addColorStop(0.4, '#4c0519');
        huskGrad.addColorStop(1, '#020617');

        this.ctx.fillStyle = huskGrad;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);

        this.ctx.strokeStyle = p.isOptimal ? '#e11d48' : '#881337';
        this.ctx.lineWidth = p.isOptimal ? 2 : 1;
        this.ctx.shadowColor = '#e11d48';
        this.ctx.shadowBlur = p.isOptimal ? 12 : 4;
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);

        // Nodo Carmesí
        if (p.isOptimal) {
          this.ctx.fillStyle = '#fda4af';
          this.ctx.beginPath();
          this.ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      } else if (p.isSecondary) {
        // Plataforma de Apoyo: Piedra Grisácea Inerte
        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);
      } else {
        // Plataforma Celestial de la Ruta Óptima (Luz Dorada)
        const platGrad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        platGrad.addColorStop(0, '#ffffff');
        platGrad.addColorStop(0.3, 'rgba(251, 191, 36, 0.5)');
        platGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');

        this.ctx.fillStyle = platGrad;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);

        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 1.8;
        this.ctx.shadowColor = realmColor;
        this.ctx.shadowBlur = 8;
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);

        // Nodos Geométrico-Orientales Concéntricos
        this.ctx.fillStyle = realmColor;
        this.ctx.beginPath();
        this.ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    // Dibujar Jugador
    this.player.draw(this.ctx, realmColor);

    this.ctx.restore();

    // 7. Viñeta de Niebla Oscura por Degradación (Pérdida de Vidas)
    if (this.degradationLevel > 0) {
      this.ctx.save();
      const fogGrad = this.ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.width * 0.2,
        this.width / 2, this.height / 2, this.width * 0.7
      );
      const fogAlpha = Math.min(0.7, this.degradationLevel * 0.25);
      fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fogGrad.addColorStop(0.7, `rgba(12, 4, 8, ${fogAlpha * 0.6})`);
      fogGrad.addColorStop(1, `rgba(15, 3, 7, ${fogAlpha})`);

      this.ctx.fillStyle = fogGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    // Destello Estático Rojo Gótico (al recibir daño)
    if (this.staticFlashTime > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(225, 29, 72, 0.25)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    this.ctx.restore();
  }
}
