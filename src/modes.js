// =========================================================
// MODOS DE JUEGO DE QLIZE (GDD v1.2)
// 1. ArcadeMode: Ascenso de la Estructura & Descenso de la Entropía (Gravedad Invertida)
// 2. StageMode: Ruta de Constelaciones, 3 Pasadas, 3 Vidas y Sistema de Medallas
// =========================================================

export class BaseMode {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.platforms = [];
    this.sparks = []; // Coleccionables de energía
    this.highestPlatformY = 0;
    this.lowestPlatformY = 0;

    // Generar campo de estrellas procedural en 2 capas de paralaje
    this.starsLayer1 = [];
    this.starsLayer2 = [];
    for (let i = 0; i < 45; i++) {
      this.starsLayer1.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        size: 1 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1 + Math.random() * 3
      });
    }
    for (let i = 0; i < 25; i++) {
      this.starsLayer2.push({
        x: Math.random() * width,
        y: Math.random() * height * 3,
        size: 2 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 2 + Math.random() * 4
      });
    }
  }

  addPlatform(x, y, w, h, props = {}) {
    const plat = {
      id: props.id || ('p_' + Math.random().toString(36).substr(2, 9)),
      x,
      y,
      width: w,
      height: h,
      active: true,
      isOptimal: false,
      ...props
    };
    this.platforms.push(plat);
    if (y < this.highestPlatformY || this.highestPlatformY === 0) {
      this.highestPlatformY = y;
    }
    if (y > this.lowestPlatformY || this.lowestPlatformY === 0) {
      this.lowestPlatformY = y;
    }
    return plat;
  }

  addSpark(x, y, value = 100) {
    this.sparks.push({
      x,
      y,
      baseY: y,
      radius: 6,
      collected: false,
      value,
      angle: Math.random() * Math.PI * 2
    });
  }

  getPlatforms() { return this.platforms; }
  getSparks() { return this.sparks; }

  update(dt, cameraY, player, gameEngine) {}
  updateCamera(cameraY, player, dt) { return cameraY; }
  onPlatformStepped(platform, player, gameEngine) {}
  getJumpForce() { return 650; }
  getBackgroundColor() { return '#050813'; }
  getCurrentRealm() { return { name: 'Estructura', title: 'Vía de la Luz', color: '#fbbf24' }; }
  getPlatformColor() { return '#fbbf24'; }
  drawBackground(ctx, cameraY) {}
  drawForeground(ctx) {}
}

// ---------------------------------------------------------
// 1. MODO ARCADE (Juego Continuo & Bucle Cósmico Dual)
// ---------------------------------------------------------
export class ArcadeMode extends BaseMode {
  constructor(width, height) {
    super(width, height);
    this.phase = 'structure'; // 'structure' (Luz) | 'entropy' (Sombra)
    this.cycle = 1;
    this.cycleDistance = 3500;
    this.portalY = -3500;
    this.portalActive = true;
    this.portalPulse = 0;
    this.speedMultiplier = 1.0;
    this.timeElapsed = 0;

    // Plataforma inicial
    this.addPlatform(width / 2 - 45, height - 40, 90, 16, { isStartingPlatform: true, isOptimal: true });
    this.generatePlatforms(0);
  }

  generatePlatforms(cameraY) {
    const gap = Math.max(75, 95 - (this.cycle - 1) * 6);
    const targetY = -cameraY - this.height * 1.6;

    if (this.phase === 'structure') {
      while (this.highestPlatformY > targetY && this.highestPlatformY > this.portalY) {
        const pWidth = Math.max(50, 75 - (this.cycle - 1) * 3);
        const pX = 20 + Math.random() * (this.width - pWidth - 40);
        const pY = this.highestPlatformY - gap - Math.random() * 25;
        this.addPlatform(pX, pY, pWidth, 16, { isOptimal: true });

        // Posibilidad de chispas
        if (Math.random() < 0.4) {
          this.addSpark(pX + pWidth / 2, pY - 26);
        }
      }
    } else {
      // Fase de Entropía (Descendiendo hacia el abismo)
      const targetBottomY = -cameraY + this.height * 1.6;
      while (this.lowestPlatformY < targetBottomY && this.lowestPlatformY < this.portalY) {
        const pWidth = Math.max(48, 70 - (this.cycle - 1) * 3);
        const pX = 20 + Math.random() * (this.width - pWidth - 40);
        const pY = this.lowestPlatformY + gap + Math.random() * 25;
        this.addPlatform(pX, pY, pWidth, 16, { isHusk: true, isOptimal: true });

        if (Math.random() < 0.4) {
          this.addSpark(pX + pWidth / 2, pY + 36);
        }
      }
    }
  }

  update(dt, cameraY, player, gameEngine) {
    this.timeElapsed += dt;
    this.portalPulse += dt * 4;

    // Comprobar cruce de portal
    if (this.phase === 'structure') {
      if (player.y <= this.portalY + 50) {
        this.triggerPhaseSwitch('entropy', player, gameEngine);
      }
    } else {
      if (player.y >= this.portalY - 50) {
        this.triggerPhaseSwitch('structure', player, gameEngine);
      }
    }

    // Limpieza de plataformas lejanas
    if (this.phase === 'structure') {
      this.platforms = this.platforms.filter(p => p.y < this.height - cameraY + 300);
      this.sparks = this.sparks.filter(s => s.y < this.height - cameraY + 300 && !s.collected);
    } else {
      this.platforms = this.platforms.filter(p => p.y > -cameraY - 300);
      this.sparks = this.sparks.filter(s => s.y > -cameraY - 300 && !s.collected);
    }

    this.generatePlatforms(cameraY);
  }

  triggerPhaseSwitch(newPhase, player, gameEngine) {
    this.phase = newPhase;
    if (newPhase === 'entropy') {
      if (gameEngine) gameEngine.setGravityDirection('entropy');
      player.gravityDirection = -1;
      player.vy = 200; // Impulso inicial hacia abajo
      this.lowestPlatformY = player.y;
      this.portalY = player.y + this.cycleDistance;
    } else {
      this.cycle++;
      this.speedMultiplier += 0.15;
      if (gameEngine) gameEngine.setGravityDirection('structure');
      player.gravityDirection = 1;
      player.vy = -200;
      this.highestPlatformY = player.y;
      this.portalY = player.y - this.cycleDistance;
    }
  }

  updateCamera(cameraY, player, dt) {
    if (this.phase === 'structure') {
      const targetY = -player.y + this.height * 0.45;
      if (targetY > cameraY) {
        return targetY;
      }
      return cameraY;
    } else {
      // En Entropía la cámara sigue el descenso hacia abajo
      const targetY = -player.y + this.height * 0.45;
      if (targetY < cameraY) {
        return targetY;
      }
      return cameraY;
    }
  }

  onPlatformStepped(platform, player, gameEngine) {
    if (platform.isHusk) {
      setTimeout(() => { platform.active = false; }, 80);
    }
  }

  getJumpForce() {
    return 660 * this.speedMultiplier;
  }

  getBackgroundColor() {
    return this.phase === 'structure' ? '#040714' : '#1f030a';
  }

  getCurrentRealm() {
    if (this.phase === 'structure') {
      return {
        name: `Estructura (Ciclo ${this.cycle})`,
        title: 'Vía de la Luz • Gravedad Normal ⬇️',
        color: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.5)'
      };
    } else {
      return {
        name: `Entropía (Ciclo ${this.cycle})`,
        title: 'Vía de la Sombra • Gravedad Invertida ⬆️',
        color: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.6)'
      };
    }
  }

  getPlatformColor() {
    return this.phase === 'structure' ? '#fbbf24' : '#f43f5e';
  }

  drawBackground(ctx, cameraY) {
    const isStructure = this.phase === 'structure';

    // 1. Nebulosa de fondo
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const grad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, 20,
      this.width * 0.5, this.height * 0.5, this.height * 0.75
    );

    if (isStructure) {
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
      grad.addColorStop(0.5, 'rgba(30, 58, 138, 0.35)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');
    } else {
      grad.addColorStop(0, 'rgba(225, 29, 72, 0.3)');
      grad.addColorStop(0.6, 'rgba(76, 5, 25, 0.6)');
      grad.addColorStop(1, 'rgba(12, 1, 4, 0.98)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Estrellas en Paralaje
    ctx.fillStyle = isStructure ? '#ffffff' : '#fecdd3';
    for (const s of this.starsLayer1) {
      const sy = (s.y - cameraY * 0.2) % this.height;
      const finalY = sy < 0 ? sy + this.height : sy;
      const alpha = s.alpha * (0.6 + 0.4 * Math.sin(this.timeElapsed * s.twinkleSpeed));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillRect(s.x, finalY, s.size, s.size);
    }
    for (const s of this.starsLayer2) {
      const sy = (s.y - cameraY * 0.4) % this.height;
      const finalY = sy < 0 ? sy + this.height : sy;
      const alpha = s.alpha * (0.5 + 0.5 * Math.cos(this.timeElapsed * s.twinkleSpeed));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(s.x, finalY, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Dibujar Portal Dimensional en la cota de transición
    this.drawPortal(ctx, this.width / 2, this.portalY, isStructure);
  }

  drawPortal(ctx, x, y, isStructure) {
    ctx.save();
    const portalColor = isStructure ? '#f43f5e' : '#fbbf24';
    const portalGlow = isStructure ? 'rgba(244, 63, 94, 0.6)' : 'rgba(251, 191, 36, 0.6)';
    const pulse = Math.sin(this.portalPulse) * 8;
    const radius = 48 + pulse;

    // Resplandor del Vórtice
    const grad = ctx.createRadialGradient(x, y, 10, x, y, radius + 30);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, portalColor);
    grad.addColorStop(0.7, portalGlow);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius + 30, 0, Math.PI * 2);
    ctx.fill();

    // Anillo giratorio
    ctx.strokeStyle = portalColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = portalColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Glifos del Portal
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isStructure ? '🌀 VÓRTICE DE ENTROPÍA' : '✨ PUERTA DE LA ESTRUCTURA', x, y - 10);
    ctx.font = '9px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(isStructure ? 'Gravedad Invertida ⬆️' : 'Ascenso Divino ⬇️', x, y + 10);

    ctx.restore();
  }
}

// ---------------------------------------------------------
// 2. MODO ETAPAS (Ruta de Constelaciones, 3 Pasadas & Medallas)
// ---------------------------------------------------------
export class StageMode extends BaseMode {
  constructor(width, height, stageNum = 1) {
    super(width, height);
    this.stageNum = stageNum;
    this.stageTotalDistance = 4200; // 3 Tramos de 1400m
    this.tierHeight = 1400;

    // Vidas y Degradación Visual
    this.lives = 3;
    this.maxLives = 3;
    this.corruptionLevel = 0; // 0 a 1

    // Estado del Barrido de Cámara (Preview Sweep)
    this.isSweeping = true;
    this.sweepState = 'UP'; // 'UP' -> 'PAUSE' -> 'DOWN' -> 'READY'
    this.sweepCameraY = 0;
    this.sweepMaxY = this.stageTotalDistance;
    this.sweepTimer = 0;

    // Ruta de Constelaciones
    this.optimalRoute = []; // Lista de IDs ordenados
    this.lastSafePlatform = null;
    this.timeElapsed = 0;

    this.buildStageMap();
  }

  buildStageMap() {
    // Plataforma base inicial
    const startP = this.addPlatform(this.width / 2 - 45, this.height - 40, 90, 18, {
      id: 'opt_start',
      isOptimal: true,
      isStartingPlatform: true
    });
    this.optimalRoute.push(startP.id);
    this.lastSafePlatform = startP;

    // Generar un trazado fijo repetido en 3 Tramos (Tiers)
    const tierPattern = [
      { rx: 0.30, dy: 105, w: 75, isOpt: true },
      { rx: 0.70, dy: 110, w: 70, isOpt: true },
      { rx: 0.45, dy: 95,  w: 65, isOpt: true },
      { rx: 0.15, dy: 100, w: 60, isOpt: false }, // Apoyo
      { rx: 0.82, dy: 115, w: 70, isOpt: true },
      { rx: 0.50, dy: 105, w: 65, isOpt: true },
      { rx: 0.85, dy: 100, w: 60, isOpt: false }, // Apoyo
      { rx: 0.20, dy: 110, w: 72, isOpt: true },
      { rx: 0.65, dy: 100, w: 68, isOpt: true },
      { rx: 0.35, dy: 115, w: 70, isOpt: true },
      { rx: 0.75, dy: 105, w: 65, isOpt: true },
      { rx: 0.25, dy: 110, w: 75, isOpt: true },
      { rx: 0.50, dy: 115, w: 80, isOpt: true }  // Nodo de cumbre de tramo
    ];

    let currentY = this.height - 40;

    for (let tier = 0; tier < 3; tier++) {
      for (let i = 0; i < tierPattern.length; i++) {
        const item = tierPattern[i];
        currentY -= item.dy;
        const pX = item.rx * (this.width - item.w);
        const pId = `tier${tier}_p${i}`;

        const plat = this.addPlatform(pX, currentY, item.w, 16, {
          id: pId,
          isOptimal: item.isOpt,
          tier: tier + 1
        });

        if (item.isOpt) {
          this.optimalRoute.push(plat.id);
          // Generar chispa de energía en plataformas óptimas
          if (i % 2 === 0) {
            this.addSpark(pX + item.w / 2, currentY - 26);
          }
        }
      }
    }

    // Plataforma de Cima Sagrada (100%)
    currentY -= 120;
    const crownP = this.addPlatform(this.width / 2 - 60, currentY, 120, 22, {
      id: 'opt_crown',
      isOptimal: true,
      isCrown: true
    });
    this.optimalRoute.push(crownP.id);
  }

  update(dt, cameraY, player, gameEngine) {
    this.timeElapsed += dt;

    // 1. Manejo de la cinemática de barrido inicial
    if (this.isSweeping) {
      if (this.sweepState === 'UP') {
        this.sweepCameraY += dt * 3200;
        if (this.sweepCameraY >= this.sweepMaxY) {
          this.sweepCameraY = this.sweepMaxY;
          this.sweepState = 'PAUSE';
          this.sweepTimer = 0;
        }
      } else if (this.sweepState === 'PAUSE') {
        this.sweepTimer += dt;
        if (this.sweepTimer > 0.6) {
          this.sweepState = 'DOWN';
        }
      } else if (this.sweepState === 'DOWN') {
        this.sweepCameraY -= dt * 4200;
        if (this.sweepCameraY <= 0) {
          this.sweepCameraY = 0;
          this.sweepState = 'READY';
          this.isSweeping = false;
        }
      }
      return;
    }

    // 2. Atracción Magnética de Chispas (Sincronía Nivel 3 >90%)
    if (player.syncLevel >= 90) {
      player.magnetActive = true;
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;

      for (const s of this.sparks) {
        if (s.collected) continue;
        const dx = px - s.x;
        const dy = py - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 180 && dist > 1) {
          s.x += (dx / dist) * 260 * dt;
          s.y += (dy / dist) * 260 * dt;
        }
      }
    } else {
      player.magnetActive = false;
    }

    // 3. Activación de Escudo de Salvación (Nivel 3)
    if (player.syncLevel >= 90 && !player.shieldUsedInStage) {
      player.shieldActive = true;
    } else {
      player.shieldActive = false;
    }
  }

  updateCamera(cameraY, player, dt) {
    if (this.isSweeping) {
      return this.sweepCameraY;
    }

    const targetY = -player.y + this.height * 0.45;
    if (targetY > cameraY) {
      return targetY;
    }
    return cameraY;
  }

  onPlatformStepped(platform, player, gameEngine) {
    if (platform.isOptimal) {
      this.lastSafePlatform = platform;
    }
  }

  // Manejo de Caída / Rescate
  handleFall(player) {
    // Si tiene escudo del vacío activo, se consume y rescata gratis
    if (player.shieldActive) {
      player.shieldActive = false;
      player.shieldUsedInStage = true;
      this.respawnPlayer(player);
      return { rescuedByShield: true, gameOver: false };
    }

    // Consumir 1 vida
    this.lives--;
    this.corruptionLevel = Math.min(1.0, (this.maxLives - this.lives) / this.maxLives);

    if (this.lives <= 0) {
      return { rescuedByShield: false, gameOver: true };
    } else {
      this.respawnPlayer(player);
      return { rescuedByShield: false, gameOver: false };
    }
  }

  respawnPlayer(player) {
    if (this.lastSafePlatform) {
      player.x = this.lastSafePlatform.x + this.lastSafePlatform.width / 2 - player.width / 2;
      player.y = this.lastSafePlatform.y - player.height - 10;
      player.vx = 0;
      player.vy = -650; // Impulso seguro de respawn
    } else {
      player.x = this.width / 2 - player.width / 2;
      player.y = this.height - 120;
      player.vx = 0;
      player.vy = -650;
    }
  }

  calculateMedals(currentHeight) {
    const distancePercent = Math.min(100, Math.max(0, Math.round((currentHeight / this.stageTotalDistance) * 100)));
    const isCompleted = distancePercent >= 100;

    let medal = null;
    let medalName = 'Sin Medalla';
    let medalDesc = 'Avanza más en el Árbol de la Estructura.';

    if (isCompleted) {
      medal = 'bronze';
      medalName = '🥉 Medalla de Bronce (Templanza)';
      medalDesc = '¡Cima alcanzada! Completaste el 100% de la etapa con maestría y estabilidad.';
    } else if (distancePercent >= 75) {
      medal = 'gold';
      medalName = '🥇 Medalla de Oro (Resistencia Extrema)';
      medalDesc = 'Alcanzaste el 75%+ de la etapa antes de caer. Una hazaña de resistencia suprema.';
    } else if (distancePercent >= 50) {
      medal = 'silver';
      medalName = '🥈 Medalla de Plata (Resistencia)';
      medalDesc = 'Superaste el 50% de la etapa. Tu disciplina y perseverancia son admirables.';
    }

    return {
      medal,
      medalName,
      medalDesc,
      distancePercent,
      isCompleted
    };
  }

  getJumpForce() { return 650; }
  getBackgroundColor() { return '#040714'; }

  getCurrentRealm() {
    return {
      name: `Etapa ${this.stageNum}: Ruta Celestial`,
      title: 'Vía de la Estructura • Constelación Sagrada',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.5)'
    };
  }

  getPlatformColor() { return '#38bdf8'; }

  drawBackground(ctx, cameraY) {
    // 1. Nebulosa Cósmica
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const grad = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.4, 20,
      this.width * 0.5, this.height * 0.5, this.height * 0.8
    );
    grad.addColorStop(0, 'rgba(30, 58, 138, 0.25)');
    grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.55)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Estrellas en Paralaje
    ctx.fillStyle = '#ffffff';
    for (const s of this.starsLayer1) {
      const sy = (s.y - cameraY * 0.2) % this.height;
      const finalY = sy < 0 ? sy + this.height : sy;
      const alpha = s.alpha * (0.6 + 0.4 * Math.sin(this.timeElapsed * s.twinkleSpeed));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillRect(s.x, finalY, s.size, s.size);
    }
    for (const s of this.starsLayer2) {
      const sy = (s.y - cameraY * 0.4) % this.height;
      const finalY = sy < 0 ? sy + this.height : sy;
      const alpha = s.alpha * (0.5 + 0.5 * Math.cos(this.timeElapsed * s.twinkleSpeed));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(s.x, finalY, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Líneas de Constelación conectando la Ruta Óptima
    ctx.save();
    ctx.strokeStyle = this.isSweeping ? 'rgba(56, 189, 248, 0.65)' : 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = this.isSweeping ? 2.5 : 1.5;
    ctx.setLineDash(this.isSweeping ? [] : [6, 4]);
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = this.isSweeping ? 14 : 6;

    ctx.beginPath();
    let first = true;
    for (const pid of this.optimalRoute) {
      const p = this.platforms.find(plat => plat.id === pid);
      if (p) {
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        if (first) {
          ctx.moveTo(cx, cy);
          first = false;
        } else {
          ctx.lineTo(cx, cy);
        }
      }
    }
    ctx.stroke();
    ctx.restore();

    // 4. Banner de Barrido Inicial
    if (this.isSweeping) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(7, 10, 19, 0.75)';
      ctx.fillRect(0, this.height * 0.12, this.width, 50);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, this.height * 0.12, this.width, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ RUTA DE CONSTELACIÓN REVELADA ✨', this.width / 2, this.height * 0.12 + 18);
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('Sigue las plataformas luminosas para sincronía máxima', this.width / 2, this.height * 0.12 + 35);
      ctx.restore();
    }
  }
}

