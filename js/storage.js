const STORAGE_KEY = 'rocket-galaxy-progress';

const DEFAULT_PROGRESS = {
  currentGalaxy: 1,
  collectedInGalaxy: [],
  collectedProjects: {},
  visitedGalaxies: [1],
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Merge with defaults to handle migrations
      return { ...DEFAULT_PROGRESS, ...data };
    }
  } catch (e) {
    console.warn('Failed to load progress:', e);
  }
  return { ...DEFAULT_PROGRESS, collectedInGalaxy: [], collectedProjects: {}, visitedGalaxies: [1] };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save progress:', e);
  }
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
