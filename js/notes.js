// Two octaves of C major plus the top C (no sharps or flats in V1).
// "Do" is C5 (handbell register, matching the recorded samples); a trailing
// 2 or 3 means one or two octaves higher, up to Do3 = C7.
const NOTE_NAMES = [
  'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti',
  'Do2', 'Re2', 'Mi2', 'Fa2', 'Sol2', 'La2', 'Ti2',
  'Do3',
];

const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const DO_FREQ = 523.2511; // C5

const NOTES = {};
NOTE_NAMES.forEach((name, i) => {
  const octave = Math.floor(i / 7);
  const semis = octave * 12 + MAJOR_SCALE_SEMITONES[i % 7];
  NOTES[name] = {
    name,
    index: i,
    base: name.replace(/\d$/, ''),
    octave: octave + 1, // 1, 2 or 3
    freq: DO_FREQ * Math.pow(2, semis / 12),
  };
});

function isNoteName(name) {
  return Object.prototype.hasOwnProperty.call(NOTES, name);
}

// Friendly label: base syllable plus "high"/"top" for the upper octaves.
function noteLabel(name) {
  const n = NOTES[name];
  if (!n) return { base: name, octaveWord: '' };
  return { base: n.base, octaveWord: n.octave === 2 ? 'high' : n.octave === 3 ? 'top' : '' };
}

// Gestures in display order. Forward and back are the most reliable swings,
// so layouts put each phone's most-used notes there.
const GESTURES = ['forward', 'back', 'left', 'right'];

const GESTURE_INFO = {
  forward: { label: 'Swing forward', short: 'Forward', arrow: '↑' },
  back: { label: 'Swing back', short: 'Back', arrow: '↓' },
  left: { label: 'Snap left', short: 'Left', arrow: '←' },
  right: { label: 'Snap right', short: 'Right', arrow: '→' },
};
