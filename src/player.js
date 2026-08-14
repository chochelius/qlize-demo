export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;

    this.vx = 0;
    this.vy = 0;

    this.maxSpeed = 200; // velocidad máxima horizontal
    this.acceleration = 3000; // aceleración progresiva (evita arranques bruscos)
    this.friction = 0.86; // fricción natural al soltar
    this.gravity = 1400; // gravedad (aceleración vertical)
    this.terminalVelocity = 900;
  }

  jump(force) {
    this.vy = -force;
  }

  update(dt, input, screenWidth) {
    // Determinar la dirección / intensidad deseada (-1 a 1)
    let targetAxis = 0;

    if (input.axis !== undefined && input.axis !== 0) {
      targetAxis = input.axis;
    } else if (input.left) {
      targetAxis = -1;
    } else if (input.right) {
      targetAxis = 1;
    }

    // Movimiento Horizontal con Aceleración Progresiva
    if (targetAxis !== 0) {
      const targetVx = targetAxis * this.maxSpeed;
      // Frenado y cambio rápido si vamos en sentido contrario
      if (Math.sign(this.vx) !== Math.sign(targetVx) && this.vx !== 0) {
        this.vx += targetAxis * this.acceleration * 1.8 * dt;
      } else {
        this.vx += targetAxis * this.acceleration * dt;
      }

      // Limitar a la velocidad proporcional
      const currentMax = this.maxSpeed * Math.abs(targetAxis);
      if (Math.abs(this.vx) > currentMax) {
        this.vx = Math.sign(this.vx) * currentMax;
      }
    } else {
      // Fricción / Desaceleración suave
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

    // Movimiento Vertical (Gravedad)
    this.vy += this.gravity * dt;
    if (this.vy > this.terminalVelocity) {
      this.vy = this.terminalVelocity;
    }
    this.y += this.vy * dt;
  }

  draw(ctx) {
    // Cuerpo del personaje
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Borde
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Ojos (mirando hacia la dirección de movimiento)
    ctx.fillStyle = '#000000';
    let eyeOffsetX = 0;
    if (this.vx > 30) eyeOffsetX = 5;
    if (this.vx < -30) eyeOffsetX = -5;

    ctx.fillRect(this.x + 6 + eyeOffsetX, this.y + 8, 5, 5);
    ctx.fillRect(this.x + 19 + eyeOffsetX, this.y + 8, 5, 5);
  }
}
