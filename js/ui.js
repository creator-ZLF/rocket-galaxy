import { CANVAS, COLORS, GAME_STATES } from './constants.js';

class UI {
  constructor() {
    this.container = document.getElementById('uiOverlay');
    this._createModals();
    this.showStartOverlay = true;
    this.showCollectCard = false;
    this.showGalaxyIntro = false;
    this.collectionCount = 0;
    this.collectionTarget = 9;
    this.hintAlpha = 1;
    this.hintTimer = 5;
  }

  _createModals() {
    // Start overlay
    this.startEl = document.getElementById('startOverlay');
    this.startTitle = document.getElementById('startTitle');
    this.startDesc = document.getElementById('startDesc');

    // Success card
    this.successEl = document.getElementById('successCard');
    this.projectName = document.getElementById('projectName');
    this.projectDesc = document.getElementById('projectDesc');
    this.projectStars = document.getElementById('projectStars');
    this.projectLink = document.getElementById('projectLink');

    // Interstellar transition
    this.transitionEl = document.getElementById('transitionOverlay');
    this.transitionTitle = document.getElementById('transitionTitle');
    this.transitionSub = document.getElementById('transitionSub');

    // Galaxy complete
    this.completeEl = document.getElementById('galaxyCompleteOverlay');
    this.completeGalaxyName = document.getElementById('completeGalaxyName');
    this.completeDesc = document.getElementById('completeDesc');

    // Collection counter
    this.counterEl = document.getElementById('collectionCounter');

    // Touch controls
    this.touchControls = document.getElementById('touchControls');

    // Show touch controls on mobile
    if ('ontouchstart' in window) {
      this.touchControls.style.display = 'grid';
    }
  }

  // ---- Start Overlay ----

  showStartOverlay(galaxyData) {
    this.startTitle.textContent = `🚀 ${galaxyData.name}`;
    this.startDesc.textContent = galaxyData.description;
    this.startEl.classList.add('visible');
  }

  hideStartOverlay() {
    this.startEl.classList.remove('visible');
  }

  // ---- Success Card ----

  showSuccessCard(project) {
    this.projectName.textContent = project.name;
    this.projectDesc.textContent = project.description;
    this.projectStars.textContent = `⭐ ${this._formatStars(project.stars)} stars`;
    this.projectLink.href = project.url;
    this.projectLink.textContent = project.url;
    this.successEl.classList.add('visible');

    // Auto-hide hint after showing
    document.getElementById('collectHint').style.display = 'block';
  }

  hideCollectCard() {
    this.successEl.classList.remove('visible');
    document.getElementById('collectHint').style.display = 'none';
  }

  // ---- Collection Counter ----

  updateCollectionCounter(collected, target) {
    this.collectionCount = collected;
    this.collectionTarget = target;

    const icons = this.counterEl.querySelectorAll('.rocket-icon');
    for (let i = 0; i < icons.length; i++) {
      if (i < collected) {
        icons[i].classList.add('lit');
      } else {
        icons[i].classList.remove('lit');
      }
    }
  }

  // ---- Galaxy Complete ----

  showGalaxyComplete(galaxyData) {
    this.completeGalaxyName.textContent = galaxyData.name;
    this.completeDesc.textContent = galaxyData.description;
    this.completeEl.classList.add('visible');

    // Hide after a moment (transition will replace)
    setTimeout(() => {
      this.completeEl.classList.remove('visible');
    }, 4000);
  }

  // ---- Transition ----

  showTransition(phase, progress, currentGalaxy, nextGalaxy) {
    this.transitionEl.classList.add('visible');
    if (phase === 'warp') {
      this.transitionTitle.textContent = `离开 ${currentGalaxy.name}`;
      this.transitionSub.textContent = '正在曲速航行...';
    } else if (phase === 'ship') {
      this.transitionTitle.textContent = '自然选择号';
      this.transitionSub.textContent = '前往下一个星系...';
    } else {
      this.transitionTitle.textContent = nextGalaxy ? `欢迎来到 ${nextGalaxy.name}` : '欢迎';
      this.transitionSub.textContent = nextGalaxy ? nextGalaxy.description : '';
    }
  }

  hideTransition() {
    this.transitionEl.classList.remove('visible');
  }

  // ---- HUD ----

  drawHUD(ctx, info) {
    if (info.state === GAME_STATES.TRANSITION) return;

    // Galaxy name
    ctx.fillStyle = COLORS.UI_ACCENT;
    ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🌌 ${info.galaxyName}`, 15, 28);

    // Collection progress
    ctx.fillStyle = COLORS.UI_TEXT;
    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    const filled = '🚀'.repeat(info.collected);
    const empty = '⚪'.repeat(info.target - info.collected);
    ctx.fillText(`${filled}${empty}`, 15, 52);

    // Speed indicator
    if (info.state === GAME_STATES.PLAYING) {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.UI_TEXT;
      ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(`${Math.round(info.speed)} px/s`, CANVAS.WIDTH - 15, 25);

      // Speed bar
      const barWidth = 80;
      const barHeight = 6;
      const barX = CANVAS.WIDTH - 15 - barWidth;
      const barY = 32;
      const speedPct = info.speed / 350;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = info.speed > 250 ? '#FF4757' : info.speed > 150 ? '#FFD93D' : '#00FF88';
      ctx.fillRect(barX, barY, barWidth * speedPct, barHeight);
    }

    // Control hints (fade out)
    if (info.state === GAME_STATES.PLAYING && this.hintTimer > 0) {
      this.hintTimer -= 1 / 60;
      const alpha = Math.min(this.hintTimer / 2, 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑↓ 调速  ←→ 转向  R 重置', CANVAS.WIDTH / 2, CANVAS.HEIGHT - 20);
    }

    // Start hint
    if (info.state === GAME_STATES.START) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
      ctx.font = 'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('按 SPACE 发射火箭', CANVAS.WIDTH / 2, CANVAS.HEIGHT - 40);
    }
  }

  // ---- Helpers ----

  _formatStars(n) {
    if (n >= 100000) return `${(n / 1000).toFixed(0)}k`;
    if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
  }
}

export default UI;
