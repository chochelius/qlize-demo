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

    // Caché de gradients de plataforma: los colores son fijos, así que se crean
    // una sola vez por (tipo, altura) en vez de en cada frame (evita presión al GC)
    this.platformGradientCache = new Map();

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
    // Sin jugador o modo conectados no hay nada que simular ni dibujar
    if (!this.player || !this.mode) {
      console.warn('Engine.start(): llama a setPlayer() y setMode() antes de iniciar.');
      return;
    }
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

    // Puntuación de Distancia y Progreso (delegado al modo, que conoce su fase)
    const { score, progress } = this.mode.getScoreAndProgress(this.cameraY, this.score);
    this.score = score;
    this.onScoreUpdate(this.score, progress);

    // Verificar si la etapa está completa (StageMode)
    if (this.mode.stageComplete && !this.stageCompleteTriggered) {
      this.stageCompleteTriggered = true;
      const medal = this.mode.calculateMedal(this.score);
      if (this.audio) this.audio.playVictory();
      this.onStageComplete(this.score, medal);
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

  // Gradient cacheado por (tipo, altura); se usa en coordenadas locales al dibujar
  getPlatformGradient(type, height) {
    const key = `${type}:${height}`;
    let grad = this.platformGradientCache.get(key);
    if (!grad) {
      grad = this.ctx.createLinearGradient(0, 0, 0, height);
      if (type === 'husk') {
        grad.addColorStop(0, '#d32f2f');
        grad.addColorStop(0.35, '#4a148c');
        grad.addColorStop(1, '#02040a');
      } else {
        grad.addColorStop(0, '#f5f5f7');
        grad.addColorStop(0.3, 'rgba(226, 177, 60, 0.6)');
        grad.addColorStop(1, 'rgba(5, 8, 20, 0.95)');
      }
      this.platformGradientCache.set(key, grad);
    }
    return grad;
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
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    const platforms = this.mode.getPlatforms();
    // Culling de viewport: en Etapas viven ~200 plataformas pero solo ~12 son
    // visibles; dibujarlas todas por frame es el mayor coste en móvil
    const viewTop = -this.cameraY - 60;
    const viewBottom = -this.cameraY + this.height + 60;
    for (const p of platforms) {
      if (!p.active) continue;
      if (p.y + p.height < viewTop || p.y > viewBottom) continue;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);

      // Efecto visual de desvanecimiento para plataformas quebradizas
      if (p.decaying) {
        const decayProgress = Math.max(0, Math.min(1, p.decayRemaining / (p.decayTime || 0.8)));
        this.ctx.globalAlpha = 0.3 + 0.7 * decayProgress;
      }

      if (p.isHusk) {
        this.ctx.fillStyle = this.getPlatformGradient('husk', p.height);
        this.ctx.fillRect(0, 0, p.width, p.height);

        if (p.isDecaying) {
          this.ctx.setLineDash([3, 2]);
        }

        if (p.isOptimal) {
          // Glow emulado con doble trazo (shadowBlur es muy caro en móvil)
          this.ctx.strokeStyle = p.isDecaying ? 'rgba(251, 113, 133, 0.35)' : 'rgba(211, 47, 47, 0.28)';
          this.ctx.lineWidth = 5;
          this.ctx.strokeRect(0, 0, p.width, p.height);
          this.ctx.strokeStyle = p.isDecaying ? '#fb7185' : '#d32f2f';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(0, 0, p.width, p.height);

          this.ctx.fillStyle = '#fca5a5';
          this.ctx.beginPath();
          this.ctx.arc(p.width / 2, p.height / 2, 4, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.strokeStyle = p.isDecaying ? '#fb7185' : '#4a148c';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(0, 0, p.width, p.height);
        }
        this.ctx.setLineDash([]);
      } else if (p.isSecondary) {
        this.ctx.fillStyle = '#2d2d30';
        this.ctx.strokeStyle = p.isDecaying ? '#fb7185' : '#475569';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(0, 0, p.width, p.height);
        
        if (p.isDecaying) {
          this.ctx.setLineDash([3, 3]);
        }
        this.ctx.strokeRect(0, 0, p.width, p.height);
        this.ctx.setLineDash([]);
      } else {
        this.ctx.fillStyle = this.getPlatformGradient('normal', p.height);
        this.ctx.fillRect(0, 0, p.width, p.height);

        const borderStroke = p.isDecaying ? '#fb923c' : '#e2b13c';

        if (p.isDecaying) {
          this.ctx.setLineDash([4, 2]);
        }
        // Glow emulado con doble trazo (shadowBlur es muy caro en móvil)
        this.ctx.strokeStyle = p.isDecaying ? 'rgba(251, 146, 60, 0.28)' : 'rgba(226, 177, 60, 0.28)';
        this.ctx.lineWidth = 4.5;
        this.ctx.strokeRect(0, 0, p.width, p.height);
        this.ctx.strokeStyle = borderStroke;
        this.ctx.lineWidth = 1.8;
        this.ctx.strokeRect(0, 0, p.width, p.height);
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = borderStroke;
        this.ctx.beginPath();
        this.ctx.arc(p.width / 2, p.height / 2, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Indicadores cinéticos para plataformas móviles
      if (p.isMoving) {
        this.ctx.fillStyle = p.isHusk ? '#f43f5e' : '#38bdf8';
        this.ctx.fillRect(2, p.height / 2 - 2, 4, 4);
        this.ctx.fillRect(p.width - 6, p.height / 2 - 2, 4, 4);
      }

      // Indicadores de fisura para plataformas en colapso
      if (p.decaying) {
        this.ctx.strokeStyle = '#f43f5e';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(p.width * 0.3, 0);
        this.ctx.lineTo(p.width * 0.45, p.height);
        this.ctx.moveTo(p.width * 0.65, 0);
        this.ctx.lineTo(p.width * 0.75, p.height);
        this.ctx.stroke();
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
