import { CANVAS, ROCKET, COLORS } from './constants.js';

class Rocket {
  constructor(effects) {
    this.effects = effects;
    this.x = ROCKET.START_X;
    this.y = ROCKET.START_Y;
    this.speed = ROCKET.INITIAL_SPEED;
    this.angle = -Math.PI / 2; // pointing up
    this.width = ROCKET.WIDTH;
    this.height = ROCKET.HEIGHT;
    this.state = 'idle'; // idle | flying | docked
    this.docked = false;
    this.lit = false;
    this.dockThreshold = ROCKET.DOCK_THRESHOLD;
    this.idleSwayOffset = 0;
  }

  launch() {
    this.state = 'flying';
    this.docked = false;
    this.lit = false;
    this.x = ROCKET.START_X;
    this.y = ROCKET.START_Y;
    this.speed = ROCKET.INITIAL_SPEED;
    this.angle = -Math.PI / 2;
  }

  reset() { this.launch(); }

  dock(slot) {
    this.state = 'docked';
    this.docked = true;
    this.targetX = slot.x;
    this.targetY = slot.y;
    this.targetAngle = slot.angle;
  }

  lightUp() { this.lit = true; }

  idleSway(dt) {
    this.idleSwayOffset = Math.sin(performance.now() / 1000 * 1.5) * 3;
  }

  update(dt, keys) {
    if (this.state === 'flying') {
      if (keys['ArrowUp']) {
        this.speed = Math.min(this.speed + ROCKET.ACCELERATION * dt, ROCKET.MAX_SPEED);
        this.effects.emitFire(this.x, this.y + this.height / 2, this.angle, this.speed);
      }
      if (keys['ArrowDown']) {
        this.speed = Math.max(this.speed - ROCKET.DECELERATION * dt, ROCKET.MIN_SPEED);
      }
      if (keys['ArrowLeft']) this.angle -= ROCKET.TURN_RATE * dt;
      if (keys['ArrowRight']) this.angle += ROCKET.TURN_RATE * dt;
      this.angle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, this.angle));

      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;

      // Screen wrap
      if (this.x < -20) this.x = CANVAS.WIDTH + 20;
      if (this.x > CANVAS.WIDTH + 20) this.x = -20;
      if (this.y < -60) this.y = CANVAS.HEIGHT + 60;
      if (this.y > CANVAS.HEIGHT + 60) this.y = -60;

      // Fire trail
      if (Math.random() < 0.6) {
        this.effects.emitFire(this.x, this.y + this.height / 2, this.angle, this.speed * 0.4);
      }
    } else if (this.state === 'docked') {
      if (this.targetX !== undefined) {
        this.x += (this.targetX - this.x) * 5 * dt;
        this.y += (this.targetY - this.y) * 5 * dt;
        this.angle += (this.targetAngle - this.angle) * 5 * dt;
      }
    }
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y + (this.state === 'idle' ? this.idleSwayOffset : 0));
    ctx.rotate(this.angle + Math.PI / 2);

    // Lit glow effect
    if (this.lit) {
      ctx.shadowColor = COLORS.LIT_GLOW;
      ctx.shadowBlur = 20 + Math.sin(time * 3) * 6;
    }

    this._drawSimpleRocket(ctx, time);
    this._drawFace(ctx);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // Pulsing ring if lit and docked
    if (this.docked && this.lit) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const ringAlpha = 0.3 + 0.2 * Math.sin(time * 4);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${ringAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawSimpleRocket(ctx, time) {
    const w = this.width;   // 30
    const h = this.height;  // 50

    // === Main body (rounded capsule) ===
    // Draw as a simple pill shape using two arcs + rect
    const rx = w / 2;  // radius for rounded ends

    ctx.fillStyle = COLORS.ROCKET_BODY;

    // Top semicircle (nose)
    ctx.beginPath();
    ctx.arc(0, -h / 2 + rx, rx, Math.PI, 0, false);
    // Right edge
    ctx.lineTo(w / 2, h / 2 - rx);
    // Bottom semicircle
    ctx.arc(0, h / 2 - rx, rx, 0, Math.PI, false);
    // Left edge
    ctx.lineTo(-w / 2, -h / 2 + rx);
    ctx.closePath();
    ctx.fill();

    // === Nose cone accent ===
    ctx.fillStyle = COLORS.ROCKET_NOSE;
    ctx.beginPath();
    ctx.arc(0, -h / 2 + rx, rx * 0.65, Math.PI, 0, false);
    ctx.fill();

    // === Middle stripe ===
    ctx.fillStyle = COLORS.ROCKET_FIN;
    ctx.fillRect(-w / 2, -4, w, 8);

    // === Window (porthole) ===
    const wy = -15;
    ctx.fillStyle = COLORS.ROCKET_WINDOW;
    ctx.beginPath();
    ctx.arc(0, wy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Window reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-2, wy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // === Fins ===
    // Left fin
    ctx.fillStyle = COLORS.ROCKET_FIN;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 1, h / 2 - 12);
    ctx.lineTo(-w / 2 - 10, h / 2 + 6);
    ctx.lineTo(-w / 2 + 5, h / 2 - 3);
    ctx.closePath();
    ctx.fill();

    // Right fin
    ctx.beginPath();
    ctx.moveTo(w / 2 - 1, h / 2 - 12);
    ctx.lineTo(w / 2 + 10, h / 2 + 6);
    ctx.lineTo(w / 2 - 5, h / 2 - 3);
    ctx.closePath();
    ctx.fill();

    // === Engine nozzle at bottom ===
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(-5, h / 2 - rx + 2);
    ctx.lineTo(-8, h / 2 + 4);
    ctx.lineTo(8, h / 2 + 4);
    ctx.lineTo(5, h / 2 - rx + 2);
    ctx.closePath();
    ctx.fill();

    // Engine glow (pulsing)
    if (this.state === 'flying') {
      const glowAlpha = 0.6 + 0.3 * Math.sin(time * 15);
      ctx.fillStyle = `rgba(255, 200, 50, ${glowAlpha})`;
      ctx.beginPath();
      ctx.arc(0, h / 2 + 5, 5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawFace(ctx) {
    const eyeY = -8;
    const eyeSpacing = 5;

    // White of eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing, eyeY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#2C3E50';
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 1, eyeY - 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 1, eyeY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 2, eyeY - 2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 2, eyeY - 2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Happy mouth
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, eyeY + 4, 3.5, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 140, 140, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing - 4, eyeY + 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing + 4, eyeY + 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default Rocket;
