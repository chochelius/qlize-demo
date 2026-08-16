// =========================================================
// QLIZE GAME ENGINE & RENDERER (GDD v1.2)
// Físicas desacopladas, evaluación de adherencia a la ruta óptima,
// colisiones bidireccionales y shaders canvas de degradación visual.
// =========================================================

export class QlizeGameEngine {
  constructor() {
    this.gravityDirection = 1; // 1 = Estructura (Hacia Abajo), -1 = Entropía (Hacia Arriba)
    this.baseGravity = 1400;
    this.fallSpeedModifier = 1.0; // Se reduce (0.4) con Sincronía de Caída Lenta (>60%)
    
    // Sistema de Rutas y Adherencia
    this.optimalRoute = []; // Lista de IDs de plataformas ordenadas que forman la ruta óptima
    this.currentRouteIndex = 0; // Índice de la siguiente plataforma esperada en la ruta
    this.adherenceHits = 0;
    this.totalJumps = 0;
  }

  reset() {
    this.gravityDirection = 1;
    this.fallSpeedModifier = 1.0;
    this.optimalRoute = [];
    this.currentRouteIndex = 0;
    this.adherenceHits = 0;
    this.totalJumps = 0;
  }

  setGravityDirection(direction) {
    this.gravityDirection = (direction === "entropy" || direction === -1) ? -1 : 1;
  }

  // Retorna el porcentaje de adherencia a la ruta óptima
  getAdherencePercentage() {
    if (this.totalJumps === 0) return 100;
    return Math.max(0, Math.min(100, Math.round((this.adherenceHits / this.totalJumps) * 100)));
  }

  // Se ejecuta al colisionar con una plataforma
  onPlatformCollision(player, platform) {
    this.totalJumps++;
    const expectedPlatformId = this.optimalRoute[this.currentRouteIndex];

    if (platform.id === expectedPlatformId || (platform.isOptimal && this.currentRouteIndex === 0)) {
      // El jugador sigue el plan exacto
      this.adherenceHits++;
      this.currentRouteIndex++; // Avanza al siguiente hito de la ruta
      player.syncLevel = this.getAdherencePercentage();
    } else {
      // El jugador se desvió a una plataforma de apoyo
      // No hay penalización de daño, pero su adherencia baja de forma matemática
      player.syncLevel = this.getAdherencePercentage();

      // Si la plataforma pisada está más adelante en la ruta, recalcula el índice
      const routeIndexSearch = this.optimalRoute.indexOf(platform.id);
      if (routeIndexSearch !== -1 && routeIndexSearch > this.currentRouteIndex) {
        this.currentRouteIndex = routeIndexSearch + 1;
        this.adherenceHits++; // Cuenta como acierto si logró saltarse y reenganchar la ruta
        player.syncLevel = this.getAdherencePercentage();
      }
    }

    // Ajusta las físicas en base al nivel de adherencia (Sincronía)
    this.updatePhysicsModifiers(player);
  }

  updatePhysicsModifiers(player) {
    if (player.syncLevel >= 60) {
      this.fallSpeedModifier = 0.4; // Caída Lenta activa (Float Fall)
    } else {
      this.fallSpeedModifier = 1.0; // Físicas estándar rápidas (Desviado de la ruta)
    }
  }

  calculatePlayerPhysics(player, deltaTime) {
    let effectiveGravity = this.baseGravity * this.gravityDirection;

    if (this.gravityDirection === 1) {
      // Físicas normales de Luz (Atracción hacia abajo)
      let gravityForce = effectiveGravity * deltaTime;
      // Si el jugador está cayendo y tiene Sincronía Alta, se aplica caída lenta (Float Fall)
      if (player.vy > 0) {
        gravityForce *= this.fallSpeedModifier;
      }
      player.vy += gravityForce;
    } else {
      // Físicas invertidas de Sombra (Atracción hacia el cielo)
      let gravityForce = effectiveGravity * deltaTime;
      // Si el personaje está "cayendo" (moviéndose hacia abajo físicamente), aplicamos la caída lenta
      if (player.vy > 0) {
        gravityForce *= this.fallSpeedModifier;
      }
      player.vy += gravityForce;
    }

    player.y += player.vy * deltaTime;
  }
}

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
    this.gameEngine = new QlizeGameEngine();

    this.cameraY = 0;
    this.score = 0;
    this.distanceReached = 0;
    this.sparksCollected = 0;

    // Sistema de partículas
    this.impactParticles = [];
    this.sparkBurstParticles = [];

    // Callbacks de eventos
    this.onGameOver = () => {};
    this.onScoreUpdate = () => {};
    this.onRealmUpdate = () => {};
    this.onJumpEffect = () => {};
    this.onSparkCollect = () => {};
    this.onLifeLost = () => {};
  }

  setPlayer(player) { this.player = player; }
  setMode(mode) {
    this.mode = mode;
    this.gameEngine.reset();
    if (mode.optimalRoute) {
      this.gameEngine.optimalRoute = mode.optimalRoute;
    }
  }
  setInput(input) { this.input = input; }

  reset() {
    this.cameraY = 0;
    this.score = 0;
    this.distanceReached = 0;
    this.sparksCollected = 0;
    this.impactParticles = [];
    this.sparkBurstParticles = [];
    this.gameEngine.reset();
    this.onScoreUpdate(0, 100, 1.0);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  spawnImpactParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      this.impactParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 120,
        radius: 2 + Math.random() * 3,
        alpha: 0.9,
        color
      });
    }
  }

  spawnSparkBurst(x, y, color = '#38bdf8') {
    for (let i = 0; i < 16; i++) {
      this.sparkBurstParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        radius: 3 + Math.random() * 3,
        alpha: 1.0,
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

  getScoreMultiplier() {
    const sync = this.player ? this.player.syncLevel : 100;
    if (sync >= 90) return 3.0;
    if (sync >= 60) return 2.0;
    if (sync >= 30) return 1.5;
    return 1.0;
  }

  update(dt) {
    // 1. Actualizar el modo de juego
    this.mode.update(dt, this.cameraY, this.player, this.gameEngine);

    // 2. Si el modo está en cinemática de barrido inicial, pausamos controles de jugador
    if (this.mode.isSweeping) {
      this.cameraY = this.mode.updateCamera(this.cameraY, this.player, dt);
      return;
    }

    // 3. Actualizar al jugador
    this.player.update(dt, this.input, this.width, this.gameEngine);

    // 4. Actualizar la cámara
    this.cameraY = this.mode.updateCamera(this.cameraY, this.player, dt);

    // 5. Actualizar Distancia y Puntuación con Multiplicador
    const currentAbsHeight = Math.abs(this.cameraY);
    if (currentAbsHeight > this.distanceReached) {
      const deltaDist = currentAbsHeight - this.distanceReached;
      this.distanceReached = currentAbsHeight;
      this.score += deltaDist * this.getScoreMultiplier();
      this.onScoreUpdate(this.score, this.player.syncLevel, this.getScoreMultiplier());
    }

    // Notificar reino / etapa actual
    if (this.mode.getCurrentRealm) {
      const realm = this.mode.getCurrentRealm();
      this.onRealmUpdate(realm, this.mode.lives, this.mode.corruptionLevel);
    }

    // 6. Actualizar partículas
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
    for (let i = this.sparkBurstParticles.length - 1; i >= 0; i--) {
      const p = this.sparkBurstParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2.2;
      p.radius *= 0.94;
      if (p.alpha <= 0 || p.radius < 0.5) {
        this.sparkBurstParticles.splice(i, 1);
      }
    }

    // 7. Colisión con Chispas / Coleccionables de Energía
    const sparks = this.mode.getSparks ? this.mode.getSparks() : [];
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (const s of sparks) {
      if (s.collected) continue;
      s.angle += dt * 4;
      s.y = s.baseY + Math.sin(s.angle) * 4;

      const dist = Math.hypot(px - s.x, py - s.y);
      if (dist < 26) {
        s.collected = true;
        this.sparksCollected++;
        this.score += s.value * this.getScoreMultiplier();
        this.spawnSparkBurst(s.x, s.y, '#38bdf8');
        this.onSparkCollect(s);
        this.onScoreUpdate(this.score, this.player.syncLevel, this.getScoreMultiplier());
      }
    }

    // 8. Detección de Colisiones Bidireccional con plataformas
    const platforms = this.mode.getPlatforms();
    const gravDir = this.player.gravityDirection;

    if (gravDir === 1) {
      // Gravedad normal (cayendo hacia abajo)
      if (this.player.vy > 0) {
        for (const p of platforms) {
          if (!p.active) continue;

          const playerBottom = this.player.y + this.player.height;
          const prevPlayerBottom = this.player.y - (this.player.vy * dt) + this.player.height;

          if (
            prevPlayerBottom <= p.y + 16 &&
            playerBottom >= p.y &&
            playerBottom <= p.y + p.height + 25 &&
            this.player.x + this.player.width > p.x &&
            this.player.x < p.x + p.width
          ) {
            // Aterrizaje
            this.player.y = p.y - this.player.height;
            this.player.jump(this.mode.getJumpForce());
            this.gameEngine.onPlatformCollision(this.player, p);
            this.mode.onPlatformStepped(p, this.player, this.gameEngine);

            this.spawnImpactParticles(
              this.player.x + this.player.width / 2,
              p.y,
              p.isOptimal ? '#38bdf8' : (p.color || '#fbbf24')
            );
            this.onJumpEffect(p);
            this.onScoreUpdate(this.score, this.player.syncLevel, this.getScoreMultiplier());
            break;
          }
        }
      }
    } else {
      // Gravedad invertida en Entropía (jugador desciende y rebota en cara inferior)
      if (this.player.vy > 0) {
        for (const p of platforms) {
          if (!p.active) continue;

          const playerBottom = this.player.y + this.player.height;
          const prevPlayerBottom = this.player.y - (this.player.vy * dt) + this.player.height;

          if (
            prevPlayerBottom <= p.y + p.height + 16 &&
            playerBottom >= p.y + p.height - 10 &&
            playerBottom <= p.y + p.height + 30 &&
            this.player.x + this.player.width > p.x &&
            this.player.x < p.x + p.width
          ) {
            this.player.y = p.y + p.height;
            this.player.jump(this.mode.getJumpForce());
            this.gameEngine.onPlatformCollision(this.player, p);
            this.mode.onPlatformStepped(p, this.player, this.gameEngine);

            this.spawnImpactParticles(
              this.player.x + this.player.width / 2,
              p.y + p.height,
              '#f43f5e'
            );
            this.onJumpEffect(p);
            this.onScoreUpdate(this.score, this.player.syncLevel, this.getScoreMultiplier());
            break;
          }
        }
      }
    }

    // 9. Detección de Caída al Vacío / Vidas
    const isOutOfBounds = (gravDir === 1)
      ? (this.player.y > this.height - this.cameraY + 80)
      : (this.player.y < -this.cameraY - 80);

    if (isOutOfBounds) {
      if (this.mode.handleFall) {
        const result = this.mode.handleFall(this.player);
        this.onLifeLost(this.mode.lives, this.mode.corruptionLevel, result.rescuedByShield);
        
        if (result.gameOver) {
          this.stop();
          const medals = this.mode.calculateMedals(this.distanceReached);
          this.onGameOver(this.score, this.mode.getCurrentRealm(), medals, false);
        }
      } else {
        // Modo Arcade (Game Over directo en caída)
        this.stop();
        this.onGameOver(this.score, this.mode.getCurrentRealm(), null, false);
      }
    }

    // 10. Detección de Victoria en Modo Etapas (Cima alcanzada)
    if (this.mode.stageTotalDistance && this.distanceReached >= this.mode.stageTotalDistance) {
      this.stop();
      const medals = this.mode.calculateMedals(this.distanceReached);
      this.onGameOver(this.score, this.mode.getCurrentRealm(), medals, true);
    }
  }

  draw() {
    // Fondo base
    this.ctx.fillStyle = this.mode.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Transformación de Cámara
    this.ctx.save();
    this.ctx.translate(0, this.cameraY);

    // Dibujar Fondo Cósmico / Nebulosa del Modo
    this.mode.drawBackground(this.ctx, this.cameraY);

    const realm = this.mode.getCurrentRealm();
    const realmColor = realm ? realm.color : '#fbbf24';

    // Dibujar Partículas de Impacto
    for (const p of this.impactParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
    for (const p of this.sparkBurstParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Dibujar Chispas de Energía Flotantes
    const sparks = this.mode.getSparks ? this.mode.getSparks() : [];
    for (const s of sparks) {
      if (s.collected) continue;
      this.drawEnergySpark(this.ctx, s.x, s.y);
    }

    // Dibujar Plataformas Místicas
    const platforms = this.mode.getPlatforms();
    for (const p of platforms) {
      if (!p.active) continue;
      this.drawPlatform(this.ctx, p, realmColor);
    }

    // Dibujar Jugador
    if (this.player) {
      this.player.draw(this.ctx, realmColor);
    }

    this.mode.drawForeground(this.ctx);
    this.ctx.restore();

    // 11. Shader Canvas de Degradación Visual y Corrupción (GDD v1.2)
    if (this.mode.corruptionLevel && this.mode.corruptionLevel > 0) {
      this.drawCorruptionShader(this.ctx, this.mode.corruptionLevel);
    }
  }

  drawPlatform(ctx, p, realmColor) {
    const rx = p.x;
    const ry = p.y;

    ctx.save();

    if (p.isHusk) {
      // Plataforma de Entropía (Cáscara quebrada)
      ctx.fillStyle = '#4c0519';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.fillRect(rx, ry, p.width, p.height);
      ctx.strokeRect(rx, ry, p.width, p.height);

      ctx.strokeStyle = '#fda4af';
      ctx.beginPath();
      ctx.moveTo(rx + p.width * 0.3, ry);
      ctx.lineTo(rx + p.width * 0.6, ry + p.height);
      ctx.stroke();
    } else if (p.isOptimal) {
      // Plataforma de Ruta Óptima (Constelación Celestial Luminosa)
      const grad = ctx.createLinearGradient(rx, ry, rx, ry + p.height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#38bdf8');
      grad.addColorStop(1, '#0369a1');

      ctx.fillStyle = grad;
      ctx.fillRect(rx, ry, p.width, p.height);

      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeRect(rx, ry, p.width, p.height);

      // Gema Sagrada en el centro
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rx + p.width / 2, ry + p.height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Plataforma de Apoyo Secundaria (Sin penalización, geometría neutra de apoyo)
      const grad = ctx.createLinearGradient(rx, ry, rx, ry + p.height);
      grad.addColorStop(0, '#94a3b8');
      grad.addColorStop(1, '#1e293b');

      ctx.fillStyle = grad;
      ctx.fillRect(rx, ry, p.width, p.height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(rx, ry, p.width, p.height);
    }

    ctx.restore();
  }

  drawEnergySpark(ctx, x, y) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 2, x, y, 12);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCorruptionShader(ctx, level) {
    ctx.save();
    const alpha = level * 0.75;
    
    // Viñeta roja y negra
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.25,
      this.width / 2, this.height / 2, this.height * 0.65
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.65, `rgba(127, 29, 29, ${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(15, 0, 4, ${alpha * 0.9})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }
}

