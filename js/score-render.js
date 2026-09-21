// Grid renderer for the shared score display. Rows run high-to-low, top to
// bottom, matching the visual convention that higher pitches sit higher on
// the page.
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

// Renders the score grid into `container` and returns a handle for
// positioning the playhead. The label column and the beat track are separate
// flex children so the playhead (and beat math generally) can use a plain
// 0-1 fraction of the track's width, independent of the label column's width.
function renderScore(song, container) {
  container.innerHTML = '';

  const totalBeats = scoreTotalBeats(song);

  const grid = document.createElement('div');
  grid.className = 'score-grid';

  const labelCol = document.createElement('div');
  labelCol.className = 'score-label-col';

  const track = document.createElement('div');
  track.className = 'score-track';

  const cells = document.createElement('div');
  cells.className = 'score-cells';
  cells.style.gridTemplateColumns = 'repeat(' + totalBeats + ', 1fr)';
  cells.style.gridTemplateRows = 'repeat(' + SCORE_ROWS.length + ', 1fr)';

  const cellsByRowAndBeat = SCORE_ROWS.map(() => []);

  SCORE_ROWS.forEach((row, rowIndex) => {
    const label = document.createElement('div');
    label.className = 'score-row-label score-tetra-' + row.tetrachord;
    label.textContent = row.label;
    labelCol.appendChild(label);

    for (let beat = 0; beat < totalBeats; beat++) {
      const cell = document.createElement('div');
      cell.className = 'score-cell score-tetra-' + row.tetrachord;
      if (beat % song.beatsPerMeasure === 0) {
        cell.classList.add('score-measure-start');
      }
      cell.style.gridRow = String(rowIndex + 1);
      cell.style.gridColumn = String(beat + 1);
      cells.appendChild(cell);
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

  const playhead = document.createElement('div');
  playhead.className = 'score-playhead';
  playhead.style.left = '0%';

  track.appendChild(cells);
  track.appendChild(playhead);
  grid.appendChild(labelCol);
  grid.appendChild(track);
  container.appendChild(grid);

  return {
    totalBeats: totalBeats,
    setPlayheadFraction: function (fraction) {
      playhead.style.left = Math.max(0, Math.min(1, fraction)) * 100 + '%';
    },
  };
}
