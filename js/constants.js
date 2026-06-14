// Game constants and tuning values
// All values tuned for a 800×600 base canvas, scaled responsively

export const CANVAS = {
  WIDTH: 800,
  HEIGHT: 600,
  BG_COLOR: '#0a0a1a',
};

export const ROCKET = {
  WIDTH: 30,
  HEIGHT: 50,
  START_X: 400,       // center of canvas
  START_Y: 520,       // near bottom
  MIN_SPEED: 40,       // px/s
  MAX_SPEED: 350,      // px/s
  INITIAL_SPEED: 120,
  ACCELERATION: 180,   // px/s²
  DECELERATION: 200,
  TURN_RATE: 2.8,      // radians/s
  FIRE_TRAIL_LENGTH: 15,
  DOCK_THRESHOLD: 30,  // px distance to dock
};

export const GALAXY = {
  CENTER_X: 400,
  CENTER_Y: 130,
  ORBIT_RADIUS: 100,   // base, overridden per galaxy
  CORE_RADIUS: 25,
  SPIRAL_ARMS: 4,
  STARS_COUNT: 200,
  SPARKLE_COUNT: 30,
  DOCK_SLOT_SIZE: 24,  // radius of target
};

export const STARS = {
  COUNT: 250,
  PARALLAX_LAYERS: 3,
  TWINKLE_SPEED: 0.5,
};

export const PARTICLES = {
  MAX: 300,
  FIRE_LIFETIME: 0.6,  // seconds
  SPARK_LIFETIME: 1.2,
  GLOW_LIFETIME: 2.0,
};

export const GAME_STATES = {
  START: 'start',
  PLAYING: 'playing',
  SUCCESS: 'success',
  COLLECTED: 'collected',
  GALAXY_COMPLETE: 'galaxy_complete',
  TRANSITION: 'transition',
};

export const COLLECTION = {
  TARGET: 9,           // rockets to light per galaxy
  FETCH_COUNT: 15,     // projects to fetch at once
};

export const COLORS = {
  ROCKET_BODY: '#FF6B8A',
  ROCKET_NOSE: '#FF4757',
  ROCKET_FIN: '#FF8FA3',
  ROCKET_WINDOW: '#87CEEB',
  ROCKET_EYE: '#FFFFFF',
  ROCKET_PUPIL: '#2C3E50',
  FIRE_1: '#FFD93D',
  FIRE_2: '#FF6B35',
  FIRE_3: '#FF4757',
  LIT_GLOW: '#FFD700',
  GALAXY_CORE: '#FFEAA7',
  ORBIT_RING: 'rgba(255, 255, 255, 0.3)',
  TARGET_SLOT: '#00FF88',
  UI_TEXT: '#FFFFFF',
  UI_ACCENT: '#FFD700',
  OVERLAY_BG: 'rgba(10, 10, 30, 0.85)',
};
