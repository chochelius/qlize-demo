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
    
    this.onGameOver = () => {};
    this.onScoreUpdate = () => {};
  }
  
  setPlayer(player) { this.player = player; }
  setMode(mode) { this.mode = mode; }
  setInput(input) { this.input = input; }
  
  reset() {
    this.cameraY = 0;
    this.score = 0;
    this.onScoreUpdate(0);
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
  
  loop(timestamp) {
    if (!this.isRunning) return;
    
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    
    this.update(Math.min(dt, 0.1)); // Limitar dt para evitar saltos bruscos si cambia de pestaña
    this.draw();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }
  
  update(dt) {
    // 1. Actualizar el modo de juego (generación de plataformas)
    this.mode.update(dt, this.cameraY, this.player);
    
    // 2. Actualizar al jugador
    this.player.update(dt, this.input, this.width);
    
    // 3. Actualizar la cámara (sigue al jugador o auto-scroll)
    this.cameraY = this.mode.updateCamera(this.cameraY, this.player, dt);
    
    // Calcular la puntuación
    if (this.cameraY > this.score) {
      this.score = this.cameraY;
      this.onScoreUpdate(this.score);
    }
    
    // 4. Detección de Colisiones con plataformas (sólo cayendo)
    if (this.player.vy > 0) {
      const platforms = this.mode.getPlatforms();
      for (const p of platforms) {
        if (!p.active) continue;
        
        const playerBottom = this.player.y + this.player.height;
        const prevPlayerBottom = this.player.y - (this.player.vy * dt) + this.player.height;
        
        // Comprobar si el jugador cruzó el plano superior de la plataforma
        if (
          prevPlayerBottom <= p.y + 15 && 
          playerBottom >= p.y && 
          playerBottom <= p.y + p.height + 30 &&
          this.player.x + this.player.width > p.x && 
          this.player.x < p.x + p.width
        ) {
          // Colisión aceptada
          this.player.y = p.y - this.player.height;
          this.player.jump(this.mode.getJumpForce());
          this.mode.onPlatformStepped(p);
          break; // Sólo chocar con una
        }
      }
    }
    
    // 5. Condición de Game Over (Caer de la pantalla)
    // El fondo de la pantalla visible en coordenadas del mundo es (altura local + offset de camara inversa)
    if (this.player.y > this.height - this.cameraY) {
      this.stop();
      this.onGameOver(this.score);
    }
  }
  
  draw() {
    // Fondo base
    this.ctx.fillStyle = this.mode.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Transformación de la cámara (simulando movimiento hacia arriba)
    this.ctx.save();
    this.ctx.translate(0, this.cameraY);
    
    // Dibujar fondo estético del modo
    this.mode.drawBackground(this.ctx);
    
    // Dibujar Plataformas
    const platforms = this.mode.getPlatforms();
    for (const p of platforms) {
      if (!p.active) continue;
      this.ctx.fillStyle = p.color || this.mode.getPlatformColor();
      
      let rx = p.x;
      let ry = p.y;
      
      // Efecto Glitch para modo Qliphoth
      if (this.mode.isGlitch && p.isHusk && Math.random() < 0.15) {
        rx += (Math.random() - 0.5) * 6;
        ry += (Math.random() - 0.5) * 6;
        this.ctx.fillStyle = Math.random() < 0.5 ? '#fff' : p.color;
      }
      
      // Dibujar plataforma
      this.ctx.fillRect(rx, ry, p.width, p.height);
      
      // Borde de la plataforma
      this.ctx.strokeStyle = "rgba(0,0,0,0.4)";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(rx, ry, p.width, p.height);
    }
    
    // Dibujar Jugador
    this.player.draw(this.ctx);
    
    // Dibujar Frente estético
    this.mode.drawForeground(this.ctx);
    
    this.ctx.restore();
  }
}
