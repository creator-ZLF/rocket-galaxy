import { CANVAS, GALAXY, COLORS } from './constants.js';

class Galaxy {
  constructor(data) {
    this.data = data;
    this.x = GALAXY.CENTER_X;
    this.y = GALAXY.CENTER_Y;
    this.spinSpeed = data.spinSpeed;
    this.orbitRadius = data.orbitRadius || GALAXY.ORBIT_RADIUS;
    this.coreRadius = GALAXY.CORE_RADIUS;
    this.color = data.color;
    this.angle = 0;
    this.sparkles = [];
    this.ringParticles = [];
    this._initSparkles();
    this._initRing();
  }

  _initSparkles() {
    for (let i = 0; i < GALAXY.SPARKLE_COUNT; i++) {
      this.sparkles.push({
        angle: Math.random() * Math.PI * 2,
        radius: this.coreRadius + Math.random() * this.orbitRadius * 1.2,
        size: 0.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7,
        speed: 0.3 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  _initRing() {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      this.ringParticles.push({
        angleOffset: a,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
  }

  update(dt) {
    this.angle += this.spinSpeed * dt;
  }

  // Target slot position in world space
  getTargetSlot() {
    const slotAngle = this.angle + Math.PI * 0.25; // slot at 45 degrees on orbit
    return {
      x: this.x + Math.cos(slotAngle) * this.orbitRadius,
      y: this.y + Math.sin(slotAngle) * this.orbitRadius,
      angle: slotAngle + Math.PI / 2, // tangent direction
    };
  }

  draw(ctx, time) {
    this._drawGalacticGlow(ctx);
    this._drawOrbitRing(ctx);
    this._drawTargetSlot(ctx, time);
    this._drawCore(ctx, time);
    this._drawSpiralArms(ctx);
    this._drawSparkles(ctx, time);
    this._drawStars(ctx);
  }

  _drawGalacticGlow(ctx) {
    // Outer soft glow
    const grad = ctx.createRadialGradient(this.x, this.y, this.coreRadius * 0.5, this.x, this.y, this.orbitRadius * 1.8);
    grad.addColorStop(0, this.color);
    grad.addColorStop(0.4, `${this.color}33`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.orbitRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawOrbitRing(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = COLORS.ORBIT_RING;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, this.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ring particles
    for (const p of this.ringParticles) {
      const px = Math.cos(p.angleOffset) * this.orbitRadius;
      const py = Math.sin(p.angleOffset) * this.orbitRadius;
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawTargetSlot(ctx, time) {
    const slot = this.getTargetSlot();
    const pulse = 0.6 + 0.4 * Math.sin(time * 3);

    // Outer glow
    const grad = ctx.createRadialGradient(slot.x, slot.y, 0, slot.x, slot.y, GALAXY.DOCK_SLOT_SIZE * 2);
    grad.addColorStop(0, `rgba(0, 255, 136, ${0.7 * pulse})`);
    grad.addColorStop(0.5, `rgba(0, 255, 136, ${0.2 * pulse})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, GALAXY.DOCK_SLOT_SIZE * 2, 0, Math.PI * 2);
    ctx.fill();

    // Target ring
    ctx.strokeStyle = `rgba(0, 255, 136, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, GALAXY.DOCK_SLOT_SIZE, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator - small arrow on the ring
    ctx.save();
    ctx.translate(slot.x, slot.y);
    ctx.rotate(slot.angle);
    ctx.fillStyle = `rgba(0, 255, 136, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(GALAXY.DOCK_SLOT_SIZE, 0);
    ctx.lineTo(GALAXY.DOCK_SLOT_SIZE - 8, -4);
    ctx.lineTo(GALAXY.DOCK_SLOT_SIZE - 8, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawCore(ctx, time) {
    // Bright core
    const pulse = 1 + Math.sin(time * 2) * 0.1;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.coreRadius * 1.5 * pulse);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.2, this.color);
    grad.addColorStop(0.6, `${this.color}66`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.coreRadius * 1.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawSpiralArms(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const arms = this.data.spiralArms || GALAXY.SPIRAL_ARMS;
    for (let a = 0; a < arms; a++) {
      const baseAngle = (a / arms) * Math.PI * 2;
      ctx.strokeStyle = `${this.color}33`;
      ctx.lineWidth = 8 + a * 2; // varying thickness

      ctx.beginPath();
      for (let r = this.coreRadius + 2; r < this.orbitRadius * 1.3; r += 2) {
        const spiralAngle = baseAngle + (r - this.coreRadius) * 0.04;
        const sx = Math.cos(spiralAngle) * r;
        const sy = Math.sin(spiralAngle) * r;
        if (r === this.coreRadius + 2) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Thinner bright arm on top
      ctx.strokeStyle = `${this.color}55`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let r = this.coreRadius + 2; r < this.orbitRadius * 1.3; r += 2) {
        const spiralAngle = baseAngle + (r - this.coreRadius) * 0.04;
        const sx = Math.cos(spiralAngle) * r;
        const sy = Math.sin(spiralAngle) * r;
        if (r === this.coreRadius + 2) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawSparkles(ctx, time) {
    for (const s of this.sparkles) {
      const sa = s.angle + this.spinSpeed * s.speed * (performance.now() / 1000);
      const sx = this.x + Math.cos(sa) * s.radius;
      const sy = this.y + Math.sin(sa) * s.radius;
      const twinkle = 0.4 + 0.6 * Math.sin(time * s.speed * 3 + s.twinkleOffset);

      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * twinkle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawStars(ctx) {
    // Small stars scattered around galaxy
    const count = this.data.starsCount || 80;
    const seed = this.data.id * 1000;
    for (let i = 0; i < count; i++) {
      const pseudoRandom = ((seed + i * 137.5) % 360) / 360;
      const dist = this.orbitRadius * 0.3 + pseudoRandom * this.orbitRadius * 2.5;
      const angle = ((seed + i * 73.7) % 360) / 360 * Math.PI * 2 + this.angle * 0.1;
      const sx = this.x + Math.cos(angle) * dist;
      const sy = this.y + Math.sin(angle) * dist;

      if (sx < 0 || sx > CANVAS.WIDTH || sy < 0 || sy > CANVAS.HEIGHT) continue;

      const r = 0.5 + ((i * 0.3) % 2);
      const alpha = 0.2 + ((i * 0.7) % 0.8);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export default Galaxy;
