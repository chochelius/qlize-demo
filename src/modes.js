// Clase base de la que heredan los modos
export class BaseMode {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.platforms = [];
    this.highestPlatformY = 0;
    
    // Plataforma inicial debajo del jugador
    this.addPlatform(width / 2 - 35, height - 30, 70, 15);
  }
  
  addPlatform(x, y, w, h, props = {}) {
    this.platforms.push({ x, y, width: w, height: h, active: true, ...props });
    if (y < this.highestPlatformY || this.highestPlatformY === 0) {
      this.highestPlatformY = y;
    }
  }
  
  getPlatforms() { return this.platforms; }
  
  update(dt, cameraY, player) {
    // Limpiar plataformas que ya pasaron por debajo de la pantalla para liberar memoria
    this.platforms = this.platforms.filter(p => p.y < this.height - cameraY + 200);
    
    // Generar más plataformas a medida que subimos
    this.generatePlatforms(cameraY);
  }
  
  generatePlatforms(cameraY) {}
  
  updateCamera(cameraY, player, dt) {
    // La cámara por defecto sigue al jugador dejándolo en el 40% inferior de la pantalla
    const targetY = -player.y + this.height * 0.4;
    if (targetY > cameraY) {
      return targetY;
    }
    return cameraY;
  }
  
  onPlatformStepped(platform) {}
  
  getJumpForce() { return 650; }
  getBackgroundColor() { return '#0f172a'; }
  getPlatformColor() { return '#ffffff'; }
  drawBackground(ctx) {}
  drawForeground(ctx) {}
}

// ---------------------------------------------------------
// Modo Sephiroth
// Ascenso metódico, plataformas estables doradas/celestes.
// ---------------------------------------------------------
export class SephirothMode extends BaseMode {
  constructor(width, height) {
    super(width, height);
    this.nodes = ['Malkuth', 'Yesod', 'Hod', 'Netzach', 'Tiferet', 'Gevurah', 'Chesed', 'Binah', 'Chokhmah', 'Kether'];
    this.currentNodeIndex = 0;
    this.nodeHeightThreshold = 2500; // Píxeles de altura para avanzar de nodo
    this.platformGapY = 90;
    this.generatePlatforms(0, true);
  }
  
  generatePlatforms(cameraY, initial = false) {
    // Generamos plataformas hasta cubrir lo que se ve en la pantalla superior + margen
    const targetY = -cameraY - this.height;
    
    while (this.highestPlatformY > targetY) {
      const pWidth = 60 + Math.random() * 25; // Ancho constante y estable
      const pX = Math.random() * (this.width - pWidth);
      const pY = this.highestPlatformY - this.platformGapY - (Math.random() * 35);
      
      this.addPlatform(pX, pY, pWidth, 15);
    }
  }
  
  update(dt, cameraY, player) {
    super.update(dt, cameraY, player);
    // Calcular el nodo actual basado en la altura
    this.currentNodeIndex = Math.min(
      this.nodes.length - 1, 
      Math.floor(cameraY / this.nodeHeightThreshold)
    );
  }
  
  getPlatformColor() { return '#fbbf24'; } // Amber / Gold
  getBackgroundColor() { return '#1e3a8a'; } // Blue 900
  
  drawBackground(ctx) {
    // Líneas estructuradas conectando las plataformas (Geometría celeste/Árbol de la Vida)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = 0; i < this.platforms.length - 1; i++) {
        if(this.platforms[i].active && this.platforms[i+1].active) {
            ctx.moveTo(this.platforms[i].x + this.platforms[i].width/2, this.platforms[i].y);
            ctx.lineTo(this.platforms[i+1].x + this.platforms[i+1].width/2, this.platforms[i+1].y);
        }
    }
    ctx.stroke();
    
    // Dibujar Nombre del Nodo actual fijo en la pantalla
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Resetear transformación de cámara
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.nodes[this.currentNodeIndex], this.width / 2, this.height / 2);
    ctx.restore();
  }
}

// ---------------------------------------------------------
// Modo Qliphoth
// Caos, velocidad, auto-scroll y husks destructibles.
// ---------------------------------------------------------
export class QliphothMode extends BaseMode {
  constructor(width, height) {
    super(width, height);
    this.platformGapY = 110;
    this.isGlitch = true;
    this.scrollSpeed = 120; // pixeles por segundo base
    this.timeElapsed = 0;
    this.generatePlatforms(0);
  }
  
  generatePlatforms(cameraY) {
    const targetY = -cameraY - this.height * 1.5;
    
    while (this.highestPlatformY > targetY) {
      const pWidth = 45 + Math.random() * 20; // Más pequeñas y aleatorias
      const pX = Math.random() * (this.width - pWidth);
      const pY = this.highestPlatformY - this.platformGapY - (Math.random() * 60);
      
      this.addPlatform(pX, pY, pWidth, 12, { isHusk: true });
    }
  }
  
  update(dt, cameraY, player) {
    super.update(dt, cameraY, player);
    this.timeElapsed += dt;
    // Aumentar la velocidad del scroll progresivamente
    this.scrollSpeed = 120 + this.timeElapsed * 6;
  }
  
  updateCamera(cameraY, player, dt) {
    // 1. Auto-scroll constante hacia arriba
    let newCameraY = cameraY + this.scrollSpeed * dt;
    
    // 2. Si el jugador salta muy alto, la cámara debe adelantarse a él para no taparle la vista
    const targetY = -player.y + this.height * 0.4;
    if (targetY > newCameraY) {
      newCameraY = targetY;
    }
    return newCameraY;
  }
  
  onPlatformStepped(platform) {
    if (platform.isHusk) {
      platform.color = '#ffffff'; // Destello blanco antes de romperse
      // Se desintegra casi de inmediato tras el salto
      setTimeout(() => { 
        platform.active = false; 
      }, 50);
    }
  }
  
  getJumpForce() { return 720; } // Salto un poco más fuerte para compensar el caos
  getBackgroundColor() { return '#4c0519'; } // Rose 900 (Carmesí oscuro)
  getPlatformColor() { return '#f43f5e'; } // Rose 400
  
  drawBackground(ctx) {
    // Glitch aleatorio que oscurece la pantalla
    if(Math.random() < 0.15) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }
    
    // Texto oculto parpadeante (Glitch estético)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if(Math.random() < 0.08) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
      ctx.font = 'bold 60px monospace';
      ctx.textAlign = 'center';
      // Posición ligeramente temblorosa
      const x = this.width / 2 + (Math.random()-0.5)*30;
      const y = this.height / 2 + (Math.random()-0.5)*30;
      ctx.fillText('C H A O S', x, y);
    }
    ctx.restore();
  }
}
