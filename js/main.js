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
    try {
      this._init();
    } catch (e) {
      this._showError('Game init failed: ' + e.message + '\n' + e.stack);
      console.error(e);
    }
  }

  _init() {
    this.canvas = document.getElementById('gameCanvas');
    if (!this.canvas) throw new Error('Canvas element not found');
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('Could not get 2d context');

    this.state = GAME_STATES.START;
    this.keys = {};
    this.time = 0;
    this.lastTime = 0;
    this.errorState = false;

    this.background = new Background();
    this.galaxy = null;
    this.rocket = null;
    this.effects = new Effects();
    this.ui = new UI();

    this.progress = loadProgress();
    this.currentGalaxyIdx = Math.max(0, (this.progress.currentGalaxy || 1) - 1);
    this.collectedThisGalaxy = 0;
    this.collectedIdsThisGalaxy = [];
    this.pendingProject = null;
    this.projectsCache = [];
    this.fetchedForGalaxy = false;
    this.transitionProgress = 0;
    this.transitionPhase = '';

    this._setupCanvas();
    this._setupInput();
    this._loadGalaxy();
    this._loop(0);
  }

  _showError(msg) {
    this.errorState = true;
    const el = document.getElementById('errorConsole');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
    // Also try to render error on canvas
    if (this.ctx) {
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, 800, 600);
      this.ctx.fillStyle = '#F00';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(msg, 20, 40, 760);
    }
  }

  _setupCanvas() {
    this.canvas.width = CANVAS.WIDTH;
    this.canvas.height = CANVAS.HEIGHT;
    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Debug: ensure canvas is visible
    this.canvas.style.outline = 'none';
    this.canvas.style.backgroundColor = '#0a0a1a';
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
        if (this.state === GAME_STATES.START) this._launchRocket();
        else if (this.state === GAME_STATES.COLLECTED) this._restartPlay();
        else if (this.state === GAME_STATES.GALAXY_COMPLETE) this._startTransition();
      }
      if (e.code === 'KeyR' && this.state === GAME_STATES.PLAYING) this._resetRocket();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('collect', () => {
      if (this.state === GAME_STATES.SUCCESS) this._collectProject();
    });
    this._setupTouch();
  }

  _setupTouch() {
    if (!('ontouchstart' in window)) return;
    const map = {
      up: document.getElementById('btnUp'),
      down: document.getElementById('btnDown'),
      left: document.getElementById('btnLeft'),
      right: document.getElementById('btnRight'),
      launch: document.getElementById('btnLaunch'),
      collect: document.getElementById('btnCollect'),
    };
    for (const [dir, btn] of Object.entries(map)) {
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
          this.keys['Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1)] = true;
        }
      });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        if (dir !== 'launch' && dir !== 'collect') {
          this.keys['Arrow' + dir.charAt(0).toUpperCase() + dir.slice(1)] = false;
        }
      });
    }
  }

  _loadGalaxy() {
    const gData = getGalaxy(this.currentGalaxyIdx);
    this.galaxy = new Galaxy(gData);
    this.rocket = new Rocket(this.effects);
    this.collectedIdsThisGalaxy = [];
    this.collectedThisGalaxy = 0;
    this.fetchedForGalaxy = false;
    this.projectsCache = [];
    this.pendingProject = null;
    this.ui.updateCollectionCounter(0, 9);
    this.ui.showStartOverlay(gData);
  }

  _launchRocket() {
    this.state = GAME_STATES.PLAYING;
    this.rocket.launch();
    this.ui.hideStartOverlay();
    if (!this.fetchedForGalaxy) this._prefetchProjects();
  }

  _resetRocket() { this.rocket.reset(); }

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
    this.progress.collectedInGalaxy = this.collectedIdsThisGalaxy;
    this.progress.collectedProjects = this.progress.collectedProjects || {};
    const gKey = String(this.currentGalaxyIdx);
    this.progress.collectedProjects[gKey] = this.progress.collectedProjects[gKey] || [];
    this.progress.collectedProjects[gKey].push(this.pendingProject);
    saveProgress(this.progress);
    this.rocket.lightUp();
    this.effects.emitLightUp(this.rocket.x, this.rocket.y);
    if (this.collectedThisGalaxy >= 9) {
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
    const duration = 6000;
    const startTime = performance.now();
    const nextGalaxy = getGalaxy(this.currentGalaxyIdx + 1);
    const currentGalaxy = this.galaxy.data;

    const animate = (now) => {
      const elapsed = now - startTime;
      this.transitionProgress = Math.min(elapsed / duration, 1);
      if (this.transitionProgress < 0.4) this.transitionPhase = 'warp';
      else if (this.transitionProgress < 0.65) this.transitionPhase = 'ship';
      else this.transitionPhase = 'arrive';

      if (this.transitionProgress >= 1) {
        this.currentGalaxyIdx++;
        this.progress.currentGalaxy = this.currentGalaxyIdx + 1;
        this.progress.collectedInGalaxy = [];
        this.progress.visitedGalaxies = this.progress.visitedGalaxies || [];
        saveProgress(this.progress);
        this._loadGalaxy();
        this.state = GAME_STATES.START;
        this.ui.hideTransition();
        return;
      }
      this.ui.showTransition(this.transitionPhase, this.transitionProgress, currentGalaxy, nextGalaxy);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  async _prefetchProjects() {
    this.fetchedForGalaxy = true;
    const exclude = this.progress.collectedProjects
      ? Object.values(this.progress.collectedProjects).flat().map(p => p.id) : [];
    try { this.projectsCache = await fetchTrendingProjects(exclude); }
    catch (e) { this.projectsCache = this._fallbackProjects(); }
  }

  _getNextProject() {
    if (this.projectsCache.length === 0) return this._fallbackProjects()[0];
    const available = this.projectsCache.filter(p => !this.collectedIdsThisGalaxy.includes(p.id));
    if (available.length === 0) return this.projectsCache[0];
    return available[Math.floor(Math.random() * available.length)];
  }

  _fallbackProjects() {
    return [
      { id: 'fb-ollama', name: 'ollama/ollama', description: 'Run Llama 4, DeepSeek, and other LLMs locally.', url: 'https://github.com/ollama/ollama', stars: 125000, language: 'Go' },
      { id: 'fb-langchain', name: 'langchain-ai/langchain', description: 'Build context-aware reasoning applications.', url: 'https://github.com/langchain-ai/langchain', stars: 105000, language: 'Python' },
      { id: 'fb-autogpt', name: 'Significant-Gravitas/AutoGPT', description: 'Autonomous AI agents for task automation.', url: 'https://github.com/Significant-Gravitas/AutoGPT', stars: 172000, language: 'Python' },
      { id: 'fb-transformers', name: 'huggingface/transformers', description: 'State-of-the-art ML for PyTorch, TF, JAX.', url: 'https://github.com/huggingface/transformers', stars: 140000, language: 'Python' },
      { id: 'fb-tensorflow', name: 'tensorflow/tensorflow', description: 'Open Source ML Framework for Everyone.', url: 'https://github.com/tensorflow/tensorflow', stars: 190000, language: 'C++' },
      { id: 'fb-pytorch', name: 'pytorch/pytorch', description: 'Tensors and Dynamic neural networks.', url: 'https://github.com/pytorch/pytorch', stars: 87000, language: 'Python' },
      { id: 'fb-claude', name: 'anthropics/claude-code', description: 'Agentic coding tool by Anthropic.', url: 'https://github.com/anthropics/claude-code', stars: 30000, language: 'TypeScript' },
      { id: 'fb-deepseek', name: 'deepseek-ai/DeepSeek-V3', description: 'Strong, Cost-Effective MoE LLM.', url: 'https://github.com/deepseek-ai/DeepSeek-V3', stars: 55000, language: 'Python' },
      { id: 'fb-whisper', name: 'openai/whisper', description: 'Robust Speech Recognition.', url: 'https://github.com/openai/whisper', stars: 75000, language: 'Python' },
      { id: 'fb-llama', name: 'meta-llama/llama', description: "Meta's Large Language Model.", url: 'https://github.com/meta-llama/llama', stars: 60000, language: 'Python' },
      { id: 'fb-gpt-pilot', name: 'Pythagora-io/gpt-pilot', description: 'AI developer that builds full production apps.', url: 'https://github.com/Pythagora-io/gpt-pilot', stars: 32000, language: 'Python' },
      { id: 'fb-stable-diffusion', name: 'Stability-AI/stablediffusion', description: 'High-Res Image Synthesis with Latent Diffusion.', url: 'https://github.com/Stability-AI/stablediffusion', stars: 40000, language: 'Python' },
    ];
  }

  // ---- Game Loop ----

  _loop(timestamp) {
    if (this.errorState) return;
    try {
      const dt = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, 0.05) : 0.016;
      this.lastTime = timestamp;
      this.time += dt;
      this._update(dt);
      this._render(this.ctx);
    } catch (e) {
      this._showError('Loop error: ' + e.message);
      console.error(e);
    }
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this.background.update(dt);
    this.effects.update(dt);
    this.galaxy.update(dt);

    if (this.state === GAME_STATES.PLAYING) {
      this.rocket.update(dt, this.keys);
      if (!this.rocket.docked) {
        const slot = this.galaxy.getTargetSlot();
        const dist = Math.hypot(this.rocket.x - slot.x, this.rocket.y - slot.y);
        if (dist < this.rocket.dockThreshold) {
          this._onDockSuccess(this._getNextProject());
        }
      }
    } else if (this.state === GAME_STATES.START) {
      this.rocket.idleSway(dt);
    }
  }

  _render(ctx) {
    ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Background always renders
    this.background.draw(ctx, this.time);
    this.background.drawNebulae(ctx);

    // Galaxy
    this.galaxy.draw(ctx, this.time);

    // Rocket (except during transition)
    if (this.state !== GAME_STATES.TRANSITION) {
      this.rocket.draw(ctx, this.time);
    }

    // Particles
    this.effects.draw(ctx);

    // HUD
    this.ui.drawHUD(ctx, {
      galaxyName: this.galaxy.data.name,
      collected: this.collectedThisGalaxy,
      target: 9,
      speed: this.rocket ? this.rocket.speed : 0,
      state: this.state,
    });
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => { new Game(); });
