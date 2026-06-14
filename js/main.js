import { CANVAS, GAME_STATES, COLORS } from './constants.js';
import Background from './background.js';
import Galaxy from './galaxy.js';
import Rocket from './rocket.js';
import Effects from './effects.js';
import UI from './ui.js';
import { fetchTrendingProjects } from './api.js';
import { loadProgress, saveProgress } from './storage.js';
import { getGalaxy } from './galaxies.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = GAME_STATES.START;
    this.keys = {};
    this.time = 0;
    this.lastTime = 0;

    // Sub-systems
    this.background = new Background();
    this.galaxy = null;
    this.rocket = null;
    this.effects = new Effects();
    this.ui = new UI();

    // Progress
    this.progress = loadProgress();
    this.currentGalaxyIdx = this.progress.currentGalaxy - 1;
    this.collectedThisGalaxy = 0;
    this.collectedIdsThisGalaxy = this.progress.collectedInGalaxy || [];
    this.pendingProject = null;
    this.projectsCache = [];
    this.fetchedForGalaxy = false;

    // Animation
    this.transitionProgress = 0;
    this.transitionPhase = '';

    this._setupCanvas();
    this._setupInput();
    this._loadGalaxy();
    this._loop(0);
  }

  // ---- Setup ----

  _setupCanvas() {
    this.canvas.width = CANVAS.WIDTH;
    this.canvas.height = CANVAS.HEIGHT;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const scale = Math.min(
      window.innerWidth / CANVAS.WIDTH,
      window.innerHeight / CANVAS.HEIGHT
    );
    this.canvas.style.width = `${CANVAS.WIDTH * scale}px`;
    this.canvas.style.height = `${CANVAS.HEIGHT * scale}px`;
  }

  _setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === GAME_STATES.START) {
          this._launchRocket();
        } else if (this.state === GAME_STATES.COLLECTED) {
          this._restartPlay();
        } else if (this.state === GAME_STATES.GALAXY_COMPLETE) {
          this._startTransition();
        }
      }

      if (e.code === 'KeyR' && this.state === GAME_STATES.PLAYING) {
        this._resetRocket();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    // Collect button event from HTML
    document.addEventListener('collect', () => {
      if (this.state === GAME_STATES.SUCCESS) this._collectProject();
    });

    // Touch controls
    this._setupTouch();
  }

  _setupTouch() {
    // Detect touch device
    if (!('ontouchstart' in window)) return;

    const touchBtns = {
      up: document.getElementById('btnUp'),
      down: document.getElementById('btnDown'),
      left: document.getElementById('btnLeft'),
      right: document.getElementById('btnRight'),
      launch: document.getElementById('btnLaunch'),
      collect: document.getElementById('btnCollect'),
    };

    for (const [dir, btn] of Object.entries(touchBtns)) {
      if (!btn) continue;

      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (dir === 'launch') {
          if (this.state === GAME_STATES.START) this._launchRocket();
          else if (this.state === GAME_STATES.COLLECTED) this._restartPlay();
          else if (this.state === GAME_STATES.GALAXY_COMPLETE) this._startTransition();
        } else if (dir === 'collect') {
          if (this.state === GAME_STATES.SUCCESS) this._collectProject();
        } else {
          this.keys[`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`] = true;
        }
      });

      btn.addEventListener('touchend', e => {
        e.preventDefault();
        if (dir !== 'launch' && dir !== 'collect') {
          this.keys[`Arrow${dir.charAt(0).toUpperCase() + dir.slice(1)}`] = false;
        }
      });
    }
  }

  _loadGalaxy() {
    const gData = getGalaxy(this.currentGalaxyIdx);
    this.galaxy = new Galaxy(gData);
    this.rocket = new Rocket(this.effects);
    // Reset per-galaxy state
    this.collectedIdsThisGalaxy = [];
    this.collectedThisGalaxy = 0;
    this.fetchedForGalaxy = false;
    this.projectsCache = [];
    this.pendingProject = null;
    this.ui.updateCollectionCounter(0, 9);
    this.ui.showStartOverlay(this.galaxy.data);
  }

  // ---- State Transitions ----

  _launchRocket() {
    this.state = GAME_STATES.PLAYING;
    this.rocket.launch();
    this.ui.hideStartOverlay();
    if (!this.fetchedForGalaxy) {
      this._prefetchProjects();
    }
  }

  _resetRocket() {
    this.rocket.reset();
  }

  _onDockSuccess(project) {
    this.state = GAME_STATES.SUCCESS;
    this.pendingProject = project;
    this.rocket.dock(this.galaxy.getTargetSlot());
    this.effects.emitSuccess(this.rocket.x, this.rocket.y);
    this.ui.showSuccessCard(project);
  }

  _collectProject() {
    if (!this.pendingProject) return;

    this.state = GAME_STATES.COLLECTED;
    this.collectedThisGalaxy++;
    this.collectedIdsThisGalaxy.push(this.pendingProject.id);

    // Save progress
    this.progress.collectedInGalaxy = this.collectedIdsThisGalaxy;
    this.progress.collectedProjects = this.progress.collectedProjects || {};
    this.progress.collectedProjects[String(this.currentGalaxyIdx)] =
      this.progress.collectedProjects[String(this.currentGalaxyIdx)] || [];
    this.progress.collectedProjects[String(this.currentGalaxyIdx)].push(this.pendingProject);
    saveProgress(this.progress);

    this.rocket.lightUp();
    this.effects.emitLightUp(this.rocket.x, this.rocket.y);

    if (this.collectedThisGalaxy >= 9) {
      // Galaxy complete after a short pause
      setTimeout(() => {
        this.state = GAME_STATES.GALAXY_COMPLETE;
        this.ui.showGalaxyComplete(this.galaxy.data);
      }, 1500);
    }

    this.ui.updateCollectionCounter(this.collectedThisGalaxy, 9);
  }

  _restartPlay() {
    this.state = GAME_STATES.PLAYING;
    this.rocket.reset();
    this.pendingProject = null;
    this.ui.hideCollectCard();
  }

  _startTransition() {
    this.state = GAME_STATES.TRANSITION;
    this.transitionProgress = 0;
    this.transitionPhase = 'warp';
    this._runTransition();
  }

  _runTransition() {
    const duration = 6000; // ms total
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      this.transitionProgress = Math.min(elapsed / duration, 1);

      if (this.transitionProgress < 0.4) {
        this.transitionPhase = 'warp';
      } else if (this.transitionProgress < 0.65) {
        this.transitionPhase = 'ship';
      } else {
        this.transitionPhase = 'arrive';
      }

      if (this.transitionProgress >= 1) {
        // Move to next galaxy
        this.currentGalaxyIdx++;
        if (this.currentGalaxyIdx >= 10) {
          this.currentGalaxyIdx = 0; // loop back or show congratulations
        }
        this.progress.currentGalaxy = this.currentGalaxyIdx + 1;
        this.progress.collectedInGalaxy = [];
        this.progress.visitedGalaxies = this.progress.visitedGalaxies || [];
        if (!this.progress.visitedGalaxies.includes(this.currentGalaxyIdx + 1)) {
          this.progress.visitedGalaxies.push(this.currentGalaxyIdx + 1);
        }
        saveProgress(this.progress);

        this._loadGalaxy();
        this.state = GAME_STATES.START;
        this.ui.hideTransition();
        return;
      }

      requestAnimationFrame(animate);
    };

    this.ui.showTransition(this.transitionPhase, this.transitionProgress, this.galaxy.data, getGalaxy(this.currentGalaxyIdx + 1));
    requestAnimationFrame(animate);
  }

  // ---- API ----

  async _prefetchProjects() {
    this.fetchedForGalaxy = true;
    const exclude = this.progress.collectedProjects
      ? Object.values(this.progress.collectedProjects).flat().map(p => p.id)
      : [];

    try {
      this.projectsCache = await fetchTrendingProjects(exclude);
    } catch (e) {
      console.warn('Failed to fetch projects, using fallback', e);
      this.projectsCache = this._fallbackProjects();
    }
  }

  _getNextProject() {
    if (this.projectsCache.length === 0) {
      return this._fallbackProjects()[0];
    }
    // Pick one not yet collected this galaxy
    const available = this.projectsCache.filter(
      p => !this.collectedIdsThisGalaxy.includes(p.id)
    );
    if (available.length === 0) {
      return this.projectsCache[0];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  _fallbackProjects() {
    return [
      { id: 'fb-ollama', name: 'ollama/ollama', description: 'Get up and running with Llama 4, DeepSeek, and other large language models locally.', url: 'https://github.com/ollama/ollama', stars: 125000, language: 'Go' },
      { id: 'fb-langchain', name: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications with LangChain.', url: 'https://github.com/langchain-ai/langchain', stars: 105000, language: 'Python' },
      { id: 'fb-gpt-pilot', name: 'Pythagora-io/gpt-pilot', description: 'AI developer that builds full production apps from scratch.', url: 'https://github.com/Pythagora-io/gpt-pilot', stars: 32000, language: 'Python' },
      { id: 'fb-autogpt', name: 'Significant-Gravitas/AutoGPT', description: 'Autonomous AI agents for task automation.', url: 'https://github.com/Significant-Gravitas/AutoGPT', stars: 172000, language: 'Python' },
      { id: 'fb-stable-diffusion', name: 'Stability-AI/stablediffusion', description: 'High-Resolution Image Synthesis with Latent Diffusion Models.', url: 'https://github.com/Stability-AI/stablediffusion', stars: 40000, language: 'Python' },
      { id: 'fb-llama', name: 'meta-llama/llama', description: "Meta's Large Language Model: Llama.", url: 'https://github.com/meta-llama/llama', stars: 60000, language: 'Python' },
      { id: 'fb-transformers', name: 'huggingface/transformers', description: 'State-of-the-art Machine Learning for PyTorch, TensorFlow, and JAX.', url: 'https://github.com/huggingface/transformers', stars: 140000, language: 'Python' },
      { id: 'fb-copilot', name: 'github/copilot', description: 'Your AI pair programmer. GitHub Copilot uses OpenAI Codex.', url: 'https://github.com/features/copilot', stars: 15000, language: 'TypeScript' },
      { id: 'fb-tensorflow', name: 'tensorflow/tensorflow', description: 'An Open Source Machine Learning Framework for Everyone.', url: 'https://github.com/tensorflow/tensorflow', stars: 190000, language: 'C++' },
      { id: 'fb-pytorch', name: 'pytorch/pytorch', description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration.', url: 'https://github.com/pytorch/pytorch', stars: 87000, language: 'Python' },
      { id: 'fb-midjourney', name: 'midjourney/midjourney', description: 'AI-powered image generation tool.', url: 'https://www.midjourney.com', stars: 5000, language: 'Unknown' },
      { id: 'fb-claude', name: 'anthropics/claude-code', description: 'Claude Code is an agentic coding tool by Anthropic.', url: 'https://github.com/anthropics/claude-code', stars: 30000, language: 'TypeScript' },
      { id: 'fb-deepseek', name: 'deepseek-ai/DeepSeek-V3', description: 'DeepSeek-V3: A Strong, Cost-Effective Mixture-of-Experts LLM.', url: 'https://github.com/deepseek-ai/DeepSeek-V3', stars: 55000, language: 'Python' },
      { id: 'fb-sdxl', name: 'Stability-AI/generative-models', description: 'Generative Models by Stability AI.', url: 'https://github.com/Stability-AI/generative-models', stars: 25000, language: 'Python' },
      { id: 'fb-whisper', name: 'openai/whisper', description: 'Robust Speech Recognition via Large-Scale Weak Supervision.', url: 'https://github.com/openai/whisper', stars: 75000, language: 'Python' },
    ];
  }

  // ---- Game Loop ----

  _loop(timestamp) {
    const dt = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, 0.05) : 0.016;
    this.lastTime = timestamp;
    this.time += dt;

    this._update(dt);
    this._render(this.ctx);

    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.background.update(dt);

    if (this.state === GAME_STATES.PLAYING) {
      this.rocket.update(dt, this.keys);
      this.galaxy.update(dt);

      // Check collision
      if (!this.rocket.docked) {
        const slot = this.galaxy.getTargetSlot();
        const dist = Math.hypot(this.rocket.x - slot.x, this.rocket.y - slot.y);

        if (dist < this.rocket.dockThreshold) {
          const project = this._getNextProject();
          this._onDockSuccess(project);
        }
      }
    }

    if (this.state === GAME_STATES.START) {
      this.galaxy.update(dt); // still animate galaxy on start
      this.rocket.idleSway(dt);
    }

    this.effects.update(dt);
  }

  _render(ctx) {
    ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    this.background.draw(ctx, this.time);
    this.background.drawNebulae(ctx);

    this.galaxy.draw(ctx, this.time);

    if (this.state !== GAME_STATES.TRANSITION) {
      this.rocket.draw(ctx, this.time);
    }

    this.effects.draw(ctx);

    // HUD
    this.ui.drawHUD(ctx, {
      galaxyName: this.galaxy.data.name,
      collected: this.collectedThisGalaxy,
      target: 9,
      speed: this.rocket ? this.rocket.speed : 0,
      state: this.state,
    });

    // Transition overlay
    if (this.state === GAME_STATES.TRANSITION) {
      this._drawTransition(ctx);
    }
  }

  _drawTransition(ctx) {
    const p = this.transitionProgress;

    if (this.transitionPhase === 'warp') {
      // Hyperspace effect: stars stretch into lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      const lineCount = 120;
      const stretch = p / 0.4 * 600;
      ctx.strokeStyle = '#FFFFFF';
      for (let i = 0; i < lineCount; i++) {
        const x = Math.random() * CANVAS.WIDTH;
        const y = Math.random() * CANVAS.HEIGHT;
        const alpha = 0.3 + Math.random() * 0.7;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * stretch, y - stretch * 0.7);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.stroke();
      }
    } else if (this.transitionPhase === 'ship') {
      // Draw spaceship 自然选择号
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

      const shipP = (p - 0.4) / 0.25; // 0..1
      const sx = CANVAS.WIDTH / 2;
      const sy = CANVAS.HEIGHT / 2 + Math.sin(shipP * Math.PI) * 50;

      // Ship body — sleek sci-fi shape
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(1 + shipP * 0.3, 1 + shipP * 0.3);

      // Main hull
      ctx.fillStyle = '#C0C0D0';
      ctx.beginPath();
      ctx.moveTo(0, -60);        // nose
      ctx.lineTo(40, 30);        // right wing
      ctx.lineTo(15, 20);        // right indent
      ctx.lineTo(10, 40);        // right thruster
      ctx.lineTo(-10, 40);       // left thruster
      ctx.lineTo(-15, 20);       // left indent
      ctx.lineTo(-40, 30);       // left wing
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#87CEEB';
      ctx.beginPath();
      ctx.ellipse(0, -15, 10, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Engine glow
      const glowAlpha = 0.7 + Math.sin(this.time * 10) * 0.3;
      ctx.fillStyle = `rgba(100, 200, 255, ${glowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 42, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Ship name
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('自然选择号', sx, sy - 100);
    } else if (this.transitionPhase === 'arrive') {
      // Fade to new galaxy
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - (p - 0.65) / 0.35})`;
      ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
