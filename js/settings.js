// Gesture-detection thresholds, tunable live from the debug screen and
// persisted so the main play screen picks up the same calibration.
const SETTINGS_KEY = 'handbell-settings-v1';

const SETTINGS_DEFAULTS = {
  triggerThreshold: 12, // m/s^2 of linear acceleration to count as a swing
  refractoryMs: 350, // minimum time between two detected gestures
  twistThreshold: 4.5, // rad/s of rotation to count as a wrist twist
};

const SETTINGS_LIMITS = {
  triggerThreshold: { min: 2, max: 30, step: 0.5 },
  refractoryMs: { min: 100, max: 1000, step: 25 },
  twistThreshold: { min: 1, max: 15, step: 0.5 },
};

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...SETTINGS_DEFAULTS, ...stored };
  } catch (err) {
    return { ...SETTINGS_DEFAULTS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
