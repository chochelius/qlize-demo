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
    this.audio = null;

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
      this.mode.onPhaseChange = (phase) => {
        this.onPhaseChange(phase);
        if (this.audio) this.audio.setPhase(phase);
      };
    }
  }
  setInput(input) { this.input = input; }
  setAudio(audio) { this.audio = audio; }

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
    if (this.audio) {
      this.audio.setDegradationState(3);
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

    if (this.audio) {
      this.audio.setDegradationState(this.lives);
      this.audio.playLifeLost();
    }

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

    // 2.5. Reposicionar al jugador si el modo lo requiere
    if (this.mode.needsPlayerReposition) {
      console.log('[Engine] Repositionando jugador después del barrido');
      console.log('[Engine] lastSafePlatform:', this.mode.lastSafePlatform);
      this.respawnAtSafePlatform();
      this.mode.needsPlayerReposition = false;
      this.cameraY = 0;
      console.log('[Engine] Jugador reposicionado en:', { x: this.player.x, y: this.player.y });
      console.log('[Engine] Estado del jugador:', {
        gravityDirection: this.player.gravityDirection,
        vy: this.player.vy,
        vx: this.player.vx,
        noclip: this.player.noclip
      });
    }

    // DEBUG: Log después del barrido
    if (this.mode.sweepComplete && !this.mode.isSweepingCamera && this.cameraY < 100) {
      if (!this.loggedAfterSweep) {
        console.log('[Engine] Después del barrido - cámara:', this.cameraY);
        console.log('[Engine] Jugador posición:', { x: this.player.x, y: this.player.y });
        console.log('[Engine] Plataformas cercanas:', this.mode.platforms.filter(p => p.y < 1000 && p.y > -100).length);
        this.loggedAfterSweep = true;
      }
    }

    // 2.6. Reset completo a Estructura
    if (this.mode.needsResetToStructure) {
      this.cameraY = 0;
      this.lives = 3;
      this.degradationLevel = 0;
      if (this.audio) this.audio.setDegradationState(3);
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
        currentProgress = 100;
      } else {
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
      if (this.audio) this.audio.playVictory();
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
            
            if (p.isOptimal) {
              this.player.jumpMultiplier *= 1.1;
              if (this.audio) this.audio.playOptimalJump();
            } else {
              this.player.jumpMultiplier = 1.0;
              if (this.audio) this.audio.playSecondaryJump();
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
            
            if (p.isOptimal) {
              this.player.jumpMultiplier *= 1.1;
              if (this.audio) this.audio.playOptimalJump();
            } else {
              this.player.jumpMultiplier = 1.0;
              if (this.audio) this.audio.playSecondaryJump();
            }
            
            this.onJumpEffect(p);
            this.spawnImpactParticles(this.player.x + this.player.width / 2, p.y + p.height, '#e11d48');
            break;
          }
        }
      }
    }

    // 6. Condición de Caída al Abismo
    const isOutOfScreen = this.player.gravityDirection === 1
      ? (this.player.y > this.height - this.cameraY + 120)
      : (this.player.y < -this.cameraY - 200);

    if (isOutOfScreen && !this.player.noclip) {
      if (this.player.hasVoidShield) {
        this.player.hasVoidShield = false;
        this.player.synchrony = 70;
        this.respawnAtSafePlatform();
        return;
      }

      this.triggerDegradation();
      if (this.lives <= 0) {
        if (this.mode.onAllLivesLost) {
          this.mode.onAllLivesLost(this);
        } else {
          this.stop();
          if (this.audio) this.audio.stopMusic();
          this.onGameOver(this.score, this.mode.getCurrentRealm(), this.mode.calculateMedal ? this.mode.calculateMedal(this.score) : null);
        }
      }
    }
  }

  draw() {
    this.ctx.save();
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * 12;
      const shakeY = (Math.random() - 0.5) * 12;
      this.ctx.translate(shakeX, shakeY);
    }

    this.ctx.fillStyle = this.mode.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(0, this.cameraY);

    this.mode.drawBackground(this.ctx, this.cameraY);

    const realm = this.mode.getCurrentRealm();
    const realmColor = realm ? realm.color : '#fbbf24';

    for (const p of this.impactParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    const platforms = this.mode.getPlatforms();
    for (const p of platforms) {
      if (!p.active) continue;

      this.ctx.save();

      if (p.isHusk) {
        const huskGrad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        huskGrad.addColorStop(0, '#d32f2f');
        huskGrad.addColorStop(0.35, '#4a148c');
        huskGrad.addColorStop(1, '#02040a');

        this.ctx.fillStyle = huskGrad;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);

        this.ctx.strokeStyle = p.isOptimal ? '#d32f2f' : '#4a148c';
        this.ctx.lineWidth = p.isOptimal ? 2 : 1;
        this.ctx.shadowColor = '#d32f2f';
        this.ctx.shadowBlur = p.isOptimal ? 14 : 4;
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);

        if (p.isOptimal) {
          this.ctx.fillStyle = '#fca5a5';
          this.ctx.beginPath();
          this.ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      } else if (p.isSecondary) {
        this.ctx.fillStyle = '#2d2d30';
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);
      } else {
        const platGrad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        platGrad.addColorStop(0, '#f5f5f7');
        platGrad.addColorStop(0.3, 'rgba(226, 177, 60, 0.6)');
        platGrad.addColorStop(1, 'rgba(5, 8, 20, 0.95)');

        this.ctx.fillStyle = platGrad;
        this.ctx.fillRect(p.x, p.y, p.width, p.height);

        this.ctx.strokeStyle = '#e2b13c';
        this.ctx.lineWidth = 1.8;
        this.ctx.shadowColor = '#e2b13c';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeRect(p.x, p.y, p.width, p.height);

        this.ctx.fillStyle = '#e2b13c';
        this.ctx.beginPath();
        this.ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    this.player.draw(this.ctx, realmColor);

    this.ctx.restore();

    if (this.degradationLevel > 0) {
      this.ctx.save();

      const fogGrad = this.ctx.createRadialGradient(
        this.width / 2, this.height * 0.4, this.width * 0.15,
        this.width / 2, this.height * 0.5, this.width * 0.75
      );
      const fogAlpha = Math.min(0.75, this.degradationLevel * 0.28);
      fogGrad.addColorStop(0, 'rgba(2, 4, 10, 0)');
      fogGrad.addColorStop(0.65, `rgba(5, 8, 20, ${fogAlpha * 0.7})`);
      fogGrad.addColorStop(1, `rgba(2, 4, 10, ${fogAlpha})`);

      this.ctx.fillStyle = fogGrad;
      this.ctx.fillRect(0, 0, this.width, this.height);

      const glitchCount = this.degradationLevel * 3;
      for (let g = 0; g < glitchCount; g++) {
        if (Math.random() < 0.35) {
          const gy = Math.random() * this.height;
          const gh = 2 + Math.random() * 4;
          this.ctx.fillStyle = Math.random() < 0.6 ? 'rgba(211, 47, 47, 0.3)' : 'rgba(2, 4, 10, 0.7)';
          this.ctx.fillRect(0, gy, this.width, gh);
        }
      }

      this.ctx.restore();
    }

    if (this.staticFlashTime > 0) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(211, 47, 47, 0.35)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    this.ctx.restore();
  }
}
