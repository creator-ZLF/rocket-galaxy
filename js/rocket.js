import { CANVAS, ROCKET, COLORS, GAME_STATES } from './constants.js';

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
    this.trail = [];
  }

  launch() {
    this.state = 'flying';
    this.docked = false;
    this.lit = false;
    this.x = ROCKET.START_X;
    this.y = ROCKET.START_Y;
    this.speed = ROCKET.INITIAL_SPEED;
    this.angle = -Math.PI / 2;
    this.trail = [];
  }

  reset() {
    this.launch();
  }

  dock(slot) {
    this.state = 'docked';
    this.docked = true;
    // Smoothly animate into slot position
    this.targetX = slot.x;
    this.targetY = slot.y;
    this.targetAngle = slot.angle;
  }

  lightUp() {
    this.lit = true;
  }

  idleSway(dt) {
    this.idleSwayOffset = Math.sin(performance.now() / 1000 * 1.5) * 3;
  }

  update(dt, keys) {
    if (this.state === 'flying') {
      // Speed control
      if (keys['ArrowUp']) {
        this.speed = Math.min(this.speed + ROCKET.ACCELERATION * dt, ROCKET.MAX_SPEED);
        this.effects.emitFire(this.x, this.y + this.height / 2, this.angle, this.speed);
      }
      if (keys['ArrowDown']) {
        this.speed = Math.max(this.speed - ROCKET.DECELERATION * dt, ROCKET.MIN_SPEED);
      }

      // Direction control
      if (keys['ArrowLeft']) {
        this.angle -= ROCKET.TURN_RATE * dt;
      }
      if (keys['ArrowRight']) {
        this.angle += ROCKET.TURN_RATE * dt;
      }

      // Clamp angle
      this.angle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, this.angle));

      // Move
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;

      // Screen wrap
      if (this.x < -20) this.x = CANVAS.WIDTH + 20;
      if (this.x > CANVAS.WIDTH + 20) this.x = -20;
      if (this.y < -60) this.y = CANVAS.HEIGHT + 60;
      if (this.y > CANVAS.HEIGHT + 60) this.y = -60;

      // Always emit slight fire trail when flying
      if (Math.random() < 0.5) {
        this.effects.emitFire(this.x, this.y + this.height / 2, this.angle, this.speed * 0.5);
      }
    } else if (this.state === 'docked') {
      // Smooth dock animation
      if (this.targetX !== undefined) {
        this.x += (this.targetX - this.x) * 5 * dt;
        this.y += (this.targetY - this.y) * 5 * dt;
        this.angle += (this.targetAngle - this.angle) * 5 * dt;
      }
    }
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(
      this.x + (this.state === 'idle' ? 0 : 0),
      this.y + (this.state === 'idle' ? this.idleSwayOffset : 0)
    );
    ctx.rotate(this.angle + Math.PI / 2); // adjust so 0 angle = up

    // Lit glow
    if (this.lit) {
      ctx.shadowColor = COLORS.LIT_GLOW;
      ctx.shadowBlur = 20 + Math.sin(time * 3) * 5;
    }

    this._drawBody(ctx);
    this._drawFace(ctx);
    this._drawFins(ctx);
    this._drawWindow(ctx);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.restore();

    // Docked indicator
    if (this.docked && this.lit) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const glowPulse = 0.4 + 0.3 * Math.sin(time * 4);
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${glowPulse})`;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawBody(ctx) {
    // Main body - cute rounded rectangle
    const bw = this.width;
    const bh = this.height;
    const radius = bw / 2;

    ctx.fillStyle = COLORS.ROCKET_BODY;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, bh / 2 - radius);
    ctx.arcTo(-bw / 2, -bh / 2, bw / 2, -bh / 2, radius);
    ctx.arcTo(bw / 2, -bh / 2, bw / 2, bh / 2, radius);
    ctx.arcTo(bw / 2, bh / 2, -bw / 2, bh / 2, radius);
    ctx.arcTo(-bw / 2, bh / 2, -bw / 2, -bh / 2, radius);
    ctx.closePath();
    ctx.fill();

    // Stripe
    ctx.fillStyle = COLORS.ROCKET_FIN;
    ctx.fillRect(-bw / 2, -5, bw, 10);
  }

  _drawFace(ctx) {
    // Cute face on the body
    const eyeY = -12;
    const eyeSpacing = 6;

    // Eyes - big and cute
    ctx.fillStyle = COLORS.ROCKET_EYE;
    ctx.beginPath();
    ctx.arc(-eyeSpacing, eyeY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing, eyeY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = COLORS.ROCKET_PUPIL;
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 1, eyeY - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 1, eyeY - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 2, eyeY - 2.5, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 2, eyeY - 2.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Happy mouth
    ctx.strokeStyle = COLORS.ROCKET_PUPIL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, eyeY + 3, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Rosy cheeks
    ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing - 4, eyeY + 4, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing + 4, eyeY + 4, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawFins(ctx) {
    const bh = this.height;

    // Left fin
    ctx.fillStyle = COLORS.ROCKET_FIN;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2 + 2, bh / 2 - 10);
    ctx.lineTo(-this.width / 2 - 8, bh / 2 + 5);
    ctx.lineTo(-this.width / 2 + 4, bh / 2 - 2);
    ctx.closePath();
    ctx.fill();

    // Right fin
    ctx.beginPath();
    ctx.moveTo(this.width / 2 - 2, bh / 2 - 10);
    ctx.lineTo(this.width / 2 + 8, bh / 2 + 5);
    ctx.lineTo(this.width / 2 - 4, bh / 2 - 2);
    ctx.closePath();
    ctx.fill();
  }

  _drawWindow(ctx) {
    // Round window
    const wy = -20;
    ctx.fillStyle = COLORS.ROCKET_WINDOW;
    ctx.beginPath();
    ctx.arc(0, wy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Window shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-2, wy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default Rocket;
