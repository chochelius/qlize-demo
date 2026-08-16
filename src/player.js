export class Player {
  constructor(x, y, settings = {}) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 32;

    this.vx = 0;
    this.vy = 0;

    this.maxSpeed = settings.maxSpeed || 340;
    this.acceleration = settings.acceleration || 1400;
    this.friction = settings.friction !== undefined ? settings.friction : 0.86;
    this.terminalVelocity = 950;

    // Estado del juego y Sincronía
    this.gravityDirection = 1; // 1 = Estructura (Abajo), -1 = Entropía (Arriba)
    this.syncLevel = 100;      // 0 a 100%
    this.shieldActive = false;  // Escudo de salvación
    this.magnetActive = false;  // Imán de coleccionables
    this.shieldUsedInStage = false;

    // Partículas de estela de luz (Stardust Trail)
    this.trail = [];
    this.pulseAngle = 0;
  }

  jump(force) {
    if (this.gravityDirection === 1) {
      this.vy = -force; // Salto hacia arriba en gravedad normal
    } else {
      this.vy = force;  // Salto hacia abajo en gravedad invertida
    }
  }

  update(dt, input, screenWidth, gameEngine) {
    // 1. Determinar eje de entrada (-1 a 1)
    let targetAxis = 0;
    if (input.axis !== undefined && input.axis !== 0) {
      targetAxis = input.axis;
    } else if (input.left) {
      targetAxis = -1;
    } else if (input.right) {
      targetAxis = 1;
    }

    // 2. Movimiento Horizontal con Aceleración e Inercia
    if (targetAxis !== 0) {
      const targetVx = targetAxis * this.maxSpeed;
      if (Math.sign(this.vx) !== Math.sign(targetVx) && this.vx !== 0) {
        this.vx += targetAxis * this.acceleration * 1.8 * dt;
      } else {
        this.vx += targetAxis * this.acceleration * dt;
      }

      const currentMax = this.maxSpeed * Math.abs(targetAxis);
      if (Math.abs(this.vx) > currentMax) {
        this.vx = Math.sign(this.vx) * currentMax;
      }
    } else {
      this.vx *= Math.pow(this.friction, dt * 60);
      if (Math.abs(this.vx) < 6) this.vx = 0;
    }

    this.x += this.vx * dt;

    // Screen-Wrap Horizontal
    if (this.x + this.width < 0) {
      this.x = screenWidth;
    } else if (this.x > screenWidth) {
      this.x = -this.width;
    }

    // 3. Físicas Verticales Dinámicas (Lógica de QlizeGameEngine)
    if (gameEngine) {
      // Usar el cálculo matemático del motor
      gameEngine.calculatePlayerPhysics(this, dt);
    } else {
      // Físicas de respaldo
      const effGravity = 1400 * this.gravityDirection;
      let gravForce = effGravity * dt;
      if (this.gravityDirection === 1 && this.vy > 0 && this.syncLevel >= 60) {
        gravForce *= 0.4;
      } else if (this.gravityDirection === -1 && this.vy < 0 && this.syncLevel >= 60) {
        gravForce *= 0.4;
      }
      this.vy += gravForce;
      this.y += this.vy * dt;
    }

    // Límite de velocidad terminal
    if (Math.abs(this.vy) > this.terminalVelocity) {
      this.vy = Math.sign(this.vy) * this.terminalVelocity;
    }

    // 4. Animación de pulso
    this.pulseAngle += dt * 6;

    // 5. Generar Partículas de Estela Cósmica
    const isHighSync = this.syncLevel >= 30;
    const spawnChance = isHighSync ? 0.95 : 0.6;

    if (Math.random() < spawnChance) {
      const trailColor = this.gravityDirection === -1 ? '#f43f5e' : (this.syncLevel >= 60 ? '#38bdf8' : '#fbbf24');
      const emitVy = this.gravityDirection === 1 ? (20 + Math.random() * 40) : (-20 - Math.random() * 40);

      this.trail.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 10,
        y: this.y + this.height / 2 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 35 - this.vx * 0.1,
        vy: emitVy,
        radius: isHighSync ? 3.5 + Math.random() * 3.5 : 2.5 + Math.random() * 2,
        alpha: 0.85,
        color: trailColor
      });
    }

    // Actualizar partículas
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * (isHighSync ? 1.8 : 2.5);
      p.radius *= 0.96;
      if (p.alpha <= 0 || p.radius < 0.5) {
        this.trail.splice(i, 1);
      }
    }
  }

  draw(ctx, realmColor = '#fbbf24') {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // 1. Dibujar Estela de Luz / Polvo Cósmico
    for (const p of this.trail) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color || realmColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    // Si la gravedad está invertida (Entropía), invertimos el avatar verticalmente
    if (this.gravityDirection === -1) {
      ctx.translate(cx, cy);
      ctx.scale(1, -1);
      ctx.translate(-cx, -cy);
    }

    // 2. Escudo del Vacío / Halo Protector Activo (>90% Sincronía)
    if (this.shieldActive) {
      ctx.save();
      const shieldPulse = Math.sin(this.pulseAngle * 1.5) * 4;
      const sRadius = 26 + shieldPulse;
      
      const sGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, sRadius);
      sGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      sGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.35)');
      sGrad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Halo Exterior Radiante (Pulsante)
    const pulse = Math.sin(this.pulseAngle) * 3;
    const outerRadius = 20 + pulse;

    const haloGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, outerRadius);
    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    haloGrad.addColorStop(0.35, realmColor);
    haloGrad.addColorStop(0.8, realmColor.replace('rgb', 'rgba').replace(')', ', 0.2)'));
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 4. Núcleo Cristalino Divino
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = realmColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Mirada / Glifo Sagrado
    let lookOffset = 0;
    if (this.vx > 30) lookOffset = 3;
    if (this.vx < -30) lookOffset = -3;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx + lookOffset, cy - 1, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + lookOffset + (lookOffset > 0 ? 1 : -1), cy - 2, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
