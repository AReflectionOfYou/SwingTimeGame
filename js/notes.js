// Diatonic scale (C major) split into two tetrachords, each mapped to the
// same four gesture classes.
const GESTURE_ORDER = ['forward', 'back', 'left', 'right'];

const TETRACHORDS = {
  lower: {
    label: 'Lower',
    notes: [
      { name: 'Do', freq: 261.63 }, // C4
      { name: 'Re', freq: 293.66 }, // D4
      { name: 'Mi', freq: 329.63 }, // E4
      { name: 'Fa', freq: 349.23 }, // F4
    ],
  },
  upper: {
    label: 'Upper',
    notes: [
      { name: 'Sol', freq: 392.0 }, // G4
      { name: 'La', freq: 440.0 }, // A4
      { name: 'Ti', freq: 493.88 }, // B4
      { name: 'Do', freq: 523.25 }, // C5
    ],
  },
};

function noteForGesture(tetrachordKey, gesture) {
  const index = GESTURE_ORDER.indexOf(gesture);
  if (index === -1) return null;
  const tetrachord = TETRACHORDS[tetrachordKey];
  if (!tetrachord) return null;
  return tetrachord.notes[index];
}
