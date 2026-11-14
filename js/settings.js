// Gesture-detection thresholds, tunable live from the debug view and saved
// on this device so the play screen picks up the same calibration.
const SETTINGS_DEFAULTS = {
  triggerThreshold: 12, // m/s² of linear acceleration that counts as a swing
  refractoryMs: 350, // minimum time between two detected swings
  toddlerThreshold: 3, // m/s²: any motion above this rings in Toddler mode
  toddlerRotation: 150, // deg/s: a gentle twist also counts in Toddler mode
  toddlerGapMs: 250, // ignore motion this long after a Toddler note
};

const SETTINGS_LIMITS = {
  triggerThreshold: { min: 2, max: 30, step: 0.5, unit: ' m/s²', label: 'Swing threshold' },
  refractoryMs: { min: 100, max: 1000, step: 25, unit: ' ms', label: 'Gap between swings' },
  toddlerThreshold: { min: 0.5, max: 15, step: 0.5, unit: ' m/s²', label: 'Toddler: motion threshold' },
  toddlerRotation: { min: 30, max: 600, step: 10, unit: ' °/s', label: 'Toddler: twist threshold' },
  toddlerGapMs: { min: 50, max: 1000, step: 25, unit: ' ms', label: 'Toddler: gap between notes' },
};

function loadSettings() {
  return { ...SETTINGS_DEFAULTS, ...storageGet('settings', {}) };
}

function saveSettings(settings) {
  storageSet('settings', settings);
}

function loadHand() {
  return storageGet('hand', 'right') === 'left' ? 'left' : 'right';
}

function saveHand(hand) {
  storageSet('hand', hand);
}
