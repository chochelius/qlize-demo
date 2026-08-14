export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    
    this.vx = 0;
    this.vy = 0;
    
    this.speed = 350; // pixeles por segundo horizontalmente
    this.gravity = 1400; // gravedad (aceleración vertical)
    this.terminalVelocity = 900;
  }
  
  jump(force) {
    this.vy = -force;
  }
  
  update(dt, input, screenWidth) {
    // Movimiento Horizontal
    if (input.left) {
      this.vx = -this.speed;
    } else if (input.right) {
      this.vx = this.speed;
    } else {
      // Fricción / Frenado
      this.vx *= 0.7;
      if (Math.abs(this.vx) < 10) this.vx = 0;
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
    if (this.vx > 50) eyeOffsetX = 5;
    if (this.vx < -50) eyeOffsetX = -5;
    
    ctx.fillRect(this.x + 6 + eyeOffsetX, this.y + 8, 5, 5);
    ctx.fillRect(this.x + 19 + eyeOffsetX, this.y + 8, 5, 5);
  }
}
