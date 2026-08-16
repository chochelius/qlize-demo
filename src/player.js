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
    this.baseGravity = 1400;
    this.terminalVelocity = 900;

    // Estado de Sincronía (0 a 100%)
    this.synchrony = 0;
    this.gravityDirection = 1; // 1 = Estructura (Abajo), -1 = Entropía (Arriba)
    this.fallSpeedModifier = 1.0; // 0.4 en Caída Lenta (Sincronía >= 60%)
    this.hasVoidShield = false; // Escudo del Vacío (Sincronía >= 90%)

    // Partículas y Animaciones Vectoriales
    this.trail = [];
    this.pulseAngle = 0;
    this.ringAngle = 0;
  }

  jump(force) {
    // Si la gravedad es normal (1), saltar es ir hacia arriba (-force)
    // Si es invertida (-1), saltar es ir hacia abajo (+force)
    this.vy = -force * this.gravityDirection;
  }

  update(dt, input, screenWidth) {
    // 1. Determinar dirección/intensidad del input (-1 a 1)
    let targetAxis = 0;
    if (input.axis !== undefined && input.axis !== 0) {
      targetAxis = input.axis;
    } else if (input.left) {
      targetAxis = -1;
    } else if (input.right) {
      targetAxis = 1;
    }

    // 2. Movimiento Horizontal con Aceleración Progresiva
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
      if (Math.abs(this.vx) < 8) this.vx = 0;
    }

    this.x += this.vx * dt;

    // Screen-Wrap Horizontal
    if (this.x + this.width < 0) {
      this.x = screenWidth;
    } else if (this.x > screenWidth) {
      this.x = -this.width;
    }

    // 3. Modificador de Físicas por Sincronía
    // Sincronía >= 60%: Caída Lenta (Float Fall)
    if (this.synchrony >= 60) {
      this.fallSpeedModifier = 0.4;
    } else {
      this.fallSpeedModifier = 1.0;
    }

    // Sincronía >= 90%: Escudo del Vacío activo
    this.hasVoidShield = this.synchrony >= 90;

    // 4. Movimiento Vertical (Gravedad Adaptativa)
    let effectiveGravity = this.baseGravity * this.gravityDirection;

    // Comprobar si el personaje está en caída libre para aplicar Caída Lenta
    const isFalling = (this.gravityDirection === 1 && this.vy > 0) || (this.gravityDirection === -1 && this.vy < 0);
    if (isFalling) {
      effectiveGravity *= this.fallSpeedModifier;
    }

    this.vy += effectiveGravity * dt;

    // Terminal velocity
    if (Math.abs(this.vy) > this.terminalVelocity) {
      this.vy = Math.sign(this.vy) * this.terminalVelocity;
    }
    this.y += this.vy * dt;

    // 5. Ángulos de Animaciones Vectoriales
    this.pulseAngle += dt * 5;
    const ringSpeed = this.synchrony >= 90 ? 7 : (this.synchrony >= 60 ? 3 : 1);
    this.ringAngle += dt * ringSpeed;

    // 6. Generar Estela de Luz Stardust (si Sincronía >= 30%)
    if (this.synchrony >= 30 && Math.random() < 0.8) {
      this.trail.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 8,
        y: this.y + this.height / 2 + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 20 - this.vx * 0.1,
        vy: (this.gravityDirection * (15 + Math.random() * 30)),
        radius: 2 + Math.random() * 3,
        alpha: 0.8,
        color: this.synchrony >= 90 ? '#38bdf8' : '#fbbf24'
      });
    }

    // Actualizar estela
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2.2;
      p.radius *= 0.95;
      if (p.alpha <= 0 || p.radius < 0.5) {
        this.trail.splice(i, 1);
      }
    }
  }

  draw(ctx, realmColor = '#fbbf24') {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // 1. Dibujar Estela de Luz Stardust
    for (const p of this.trail) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();

    // 2. Sincronía >= 90%: Campo de Fuerza Hexagonal (Escudo del Vacío)
    if (this.hasVoidShield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      const hexRadius = 26 + Math.sin(this.pulseAngle * 2) * 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + this.ringAngle * 0.5;
        const hx = cx + hexRadius * Math.cos(angle);
        const hy = cy + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Sincronía >= 60%: Anillos Concéntricos Flotantes
    if (this.synchrony >= 60) {
      ctx.save();
      ctx.strokeStyle = this.synchrony >= 90 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      // Anillo 1
      ctx.beginPath();
      ctx.arc(cx, cy, 20, this.ringAngle, this.ringAngle + Math.PI * 1.5);
      ctx.stroke();

      // Anillo 2 (rotación inversa)
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, 23, -this.ringAngle * 1.3, -this.ringAngle * 1.3 + Math.PI * 1.2);
      ctx.stroke();

      ctx.restore();
    }

    // 4. Halo Radiante Central (Pulsante según Sincronía)
    const pulse = Math.sin(this.pulseAngle) * 3;
    const outerRadius = 14 + (this.synchrony >= 30 ? 6 : 2) + pulse;

    const haloGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, outerRadius);
    if (this.synchrony < 30) {
      // Estado Neutro: Blanco sutil
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      haloGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      // Estado Sincronizado: Dorado / Jade / Celeste
      const activeColor = this.synchrony >= 90 ? '#38bdf8' : (this.synchrony >= 60 ? '#10b981' : realmColor);
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      haloGrad.addColorStop(0.4, activeColor);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 5. Núcleo Cristalino y Borde Vectorial Limpio
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.synchrony >= 30 ? (this.synchrony >= 90 ? '#38bdf8' : '#fbbf24') : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Indicador de Dirección (Mirada Vectorial)
    let lookOffset = 0;
    if (this.vx > 30) lookOffset = 3;
    if (this.vx < -30) lookOffset = -3;

    ctx.fillStyle = '#070a13';
    ctx.beginPath();
    ctx.arc(cx + lookOffset, cy + (this.gravityDirection === -1 ? 1 : -1), 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
