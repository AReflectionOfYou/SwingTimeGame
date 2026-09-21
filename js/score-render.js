// Static grid renderer for the shared score display (Phase 1: no playhead).
// Rows run high-to-low, top to bottom, matching the visual convention that
// higher pitches sit higher on the page.
const SCORE_ROWS = [
  { label: 'Do', tetrachord: 'upper' },
  { label: 'Ti', tetrachord: 'upper' },
  { label: 'La', tetrachord: 'upper' },
  { label: 'Sol', tetrachord: 'upper' },
  { label: 'Fa', tetrachord: 'lower' },
  { label: 'Mi', tetrachord: 'lower' },
  { label: 'Re', tetrachord: 'lower' },
  { label: 'Do', tetrachord: 'lower' },
];

// The song format names notes without an octave marker, so "Do" alone is
// ambiguous between the upper and lower row. Searching bottom-up resolves it
// to the lower Do, which is correct for every Phase 1/2 test song (none of
// which reach the upper Do); a later tier that needs the upper Do will need
// an octave marker added to the format.
function scoreRowIndexForNote(name) {
  for (let i = SCORE_ROWS.length - 1; i >= 0; i--) {
    if (SCORE_ROWS[i].label === name) return i;
  }
  return -1;
}

function scoreTotalBeats(song) {
  const maxBeat = song.notes.reduce((max, n) => Math.max(max, n.beat), 0);
  const measures = Math.ceil((maxBeat + 1) / song.beatsPerMeasure);
  return measures * song.beatsPerMeasure;
}

function renderScore(song, container) {
  container.innerHTML = '';

  const totalBeats = scoreTotalBeats(song);
  const grid = document.createElement('div');
  grid.className = 'score-grid';
  grid.style.gridTemplateColumns = 'var(--score-label-width) repeat(' + totalBeats + ', 1fr)';
  grid.style.gridTemplateRows = 'repeat(' + SCORE_ROWS.length + ', 1fr)';

  // Indexed by [rowIndex][beat] so notes can be dropped into their cell
  // below, rather than positioned as separate grid items (an absolutely
  // positioned grid item ignores grid-row/grid-column placement and instead
  // covers the whole grid, so marks must nest inside their cell).
  const cellsByRowAndBeat = SCORE_ROWS.map(() => []);

  SCORE_ROWS.forEach((row, rowIndex) => {
    const label = document.createElement('div');
    label.className = 'score-row-label score-tetra-' + row.tetrachord;
    label.textContent = row.label;
    label.style.gridRow = String(rowIndex + 1);
    label.style.gridColumn = '1';
    grid.appendChild(label);

    for (let beat = 0; beat < totalBeats; beat++) {
      const cell = document.createElement('div');
      cell.className = 'score-cell score-tetra-' + row.tetrachord;
      if (beat % song.beatsPerMeasure === 0) {
        cell.classList.add('score-measure-start');
      }
      cell.style.gridRow = String(rowIndex + 1);
      cell.style.gridColumn = String(beat + 2);
      grid.appendChild(cell);
      cellsByRowAndBeat[rowIndex][beat] = cell;
    }
  });

  song.notes.forEach((note) => {
    const rowIndex = scoreRowIndexForNote(note.note);
    if (rowIndex === -1) return;
    const cell = cellsByRowAndBeat[rowIndex][note.beat];
    if (!cell) return;
    const mark = document.createElement('div');
    mark.className = 'score-mark score-tetra-' + SCORE_ROWS[rowIndex].tetrachord;
    cell.appendChild(mark);
  });

  container.appendChild(grid);
}
