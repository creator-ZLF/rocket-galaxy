import { CANVAS, STARS, COLORS } from './constants.js';

// Parallax starfield background
class Background {
  constructor() {
    this.layers = [];
    this._initLayers();
  }

  _initLayers() {
    const configs = [
      { count: 80, speed: 0.15, size: [0.8, 2.0], alpha: [0.4, 1.0] },    // far
      { count: 100, speed: 0.35, size: [1.2, 2.8], alpha: [0.5, 1.0] },   // mid
      { count: 70, speed: 0.60, size: [1.8, 3.5], alpha: [0.6, 1.0] },    // near
    ];

    for (const cfg of configs) {
      const stars = [];
      for (let i = 0; i < cfg.count; i++) {
        stars.push({
          x: Math.random() * CANVAS.WIDTH,
          y: Math.random() * CANVAS.HEIGHT,
          r: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
          alpha: cfg.alpha[0] + Math.random() * (cfg.alpha[1] - cfg.alpha[0]),
          twinkleOffset: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.5 + Math.random() * 2.0,
        });
      }
      this.layers.push({ stars, speed: cfg.speed });
    }
  }

  update(dt) {
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        star.y += layer.speed * 25 * dt; // slow drift downward
        if (star.y > CANVAS.HEIGHT + 5) {
          star.y = -5;
          star.x = Math.random() * CANVAS.WIDTH;
        }
      }
    }
  }

  draw(ctx, time) {
    // Deep space gradient
    const grad = ctx.createRadialGradient(
      CANVAS.WIDTH / 2, 100, 30,
      CANVAS.WIDTH / 2, CANVAS.HEIGHT, 500
    );
    grad.addColorStop(0, '#0d0d2b');
    grad.addColorStop(0.5, '#0a0a1a');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Draw stars with twinkle
    for (const layer of this.layers) {
      for (const star of layer.stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.alpha * (0.6 + 0.4 * twinkle);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

        // Brighter stars get a subtle glow
        if (star.r > 2.2 && twinkle > 0.85) {
          ctx.shadowColor = `rgba(200, 220, 255, ${alpha * 0.6})`;
          ctx.shadowBlur = star.r * 3;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.fill();
      }
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // Add nebula-like color patches
  drawNebulae(ctx) {
    const nebulae = [
      { x: 150, y: 80, r: 120, color: 'rgba(70, 30, 120, 0.04)' },
      { x: 650, y: 60, r: 100, color: 'rgba(30, 50, 120, 0.04)' },
      { x: 400, y: 400, r: 180, color: 'rgba(20, 10, 60, 0.03)' },
      { x: 100, y: 350, r: 90, color: 'rgba(50, 20, 80, 0.03)' },
      { x: 700, y: 320, r: 110, color: 'rgba(30, 20, 90, 0.03)' },
    ];

    for (const n of nebulae) {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
  }
}

export default Background;
