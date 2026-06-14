import { PARTICLES, COLORS } from './constants.js';

class Effects {
  constructor() {
    this.particles = [];
  }

  emitFire(x, y, angle, speed) {
    const count = Math.floor(speed / 30);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.25;
      const pSpeed = 20 + Math.random() * 60;
      const lifetime = 0.3 + Math.random() * PARTICLES.FIRE_LIFETIME;
      this.particles.push({
        x, y,
        vx: Math.cos(angle + Math.PI + spread) * pSpeed,
        vy: Math.sin(angle + Math.PI + spread) * pSpeed,
        life: lifetime,
        maxLife: lifetime,
        size: 1 + Math.random() * 3,
        color: Math.random() < 0.5 ? COLORS.FIRE_1 : (Math.random() < 0.5 ? COLORS.FIRE_2 : COLORS.FIRE_3),
        type: 'fire',
      });
    }

    // Cap particles
    while (this.particles.length > PARTICLES.MAX) {
      this.particles.shift();
    }
  }

  emitSuccess(x, y) {
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      const lifetime = 0.8 + Math.random() * 1.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: lifetime,
        maxLife: lifetime,
        size: 1.5 + Math.random() * 3,
        color: COLORS.TARGET_SLOT,
        type: 'spark',
      });
    }
  }

  emitLightUp(x, y) {
    for (let i = 0; i < 25; i++) {
      const angle = (i / 25) * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      const lifetime = 1.0 + Math.random() * 2.0;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: lifetime,
        maxLife: lifetime,
        size: 2 + Math.random() * 4,
        color: COLORS.LIT_GLOW,
        type: 'glow',
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      if (p.type === 'fire') {
        ctx.fillStyle = this._hexToRgba(p.color, alpha);
      } else if (p.type === 'spark') {
        ctx.fillStyle = this._hexToRgba(p.color, alpha);
        ctx.shadowColor = this._hexToRgba(p.color, alpha * 0.5);
        ctx.shadowBlur = 4;
      } else if (p.type === 'glow') {
        ctx.fillStyle = this._hexToRgba(p.color, alpha * 0.6);
        ctx.shadowColor = this._hexToRgba(p.color, alpha * 0.3);
        ctx.shadowBlur = 8;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export default Effects;
