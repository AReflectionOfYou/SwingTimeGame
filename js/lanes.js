// One lane (and one phone) per player. The four colors were chosen to step
// down clearly in brightness (CIE L* ≈ 88, 76, 58, 40) so lanes stay
// distinguishable in greyscale and for color-blind players. Arrow shapes and
// lane order carry the meaning; color only reinforces it.
const LANES = [
  { letter: 'A', number: 1, name: 'Yellow', color: '#FFD93D', ink: '#14110a' },
  { letter: 'B', number: 2, name: 'Blue', color: '#66C7FF', ink: '#06121c' },
  { letter: 'C', number: 3, name: 'Pink', color: '#F0507F', ink: '#1a060c' },
  { letter: 'D', number: 4, name: 'Purple', color: '#6A3BE0', ink: '#ffffff' },
];

function laneByLetter(letter) {
  return LANES.find((l) => l.letter === letter) || null;
}

function laneByNumber(number) {
  return LANES.find((l) => l.number === Number(number)) || null;
}
