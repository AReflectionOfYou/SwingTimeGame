const SCORE_MIN_BPM = 40;
const SCORE_MAX_BPM = 208;

// Builds play/pause/restart/tempo controls for one song and drives its
// playhead. Position is tracked in beats (not elapsed time) so a mid-playback
// tempo change takes effect immediately without any rescaling.
function createScorePlayer(song, handle) {
  let bpm = song.bpm;
  let beatPosition = 0;
  let playing = false;
  let lastTimestamp = null;
  let rafId = null;

  const controls = document.createElement('div');
  controls.className = 'score-controls';

  const playButton = document.createElement('button');
  playButton.type = 'button';
  playButton.className = 'score-btn score-btn-play';
  playButton.textContent = 'Play';

  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.className = 'score-btn';
  restartButton.textContent = 'Restart';

  const tempoRow = document.createElement('div');
  tempoRow.className = 'score-tempo';
  const tempoText = document.createElement('span');
  tempoText.className = 'score-tempo-label';
  tempoText.textContent = 'Tempo';
  const tempoSlider = document.createElement('input');
  tempoSlider.type = 'range';
  tempoSlider.min = String(SCORE_MIN_BPM);
  tempoSlider.max = String(SCORE_MAX_BPM);
  tempoSlider.step = '1';
  tempoSlider.value = String(bpm);
  const tempoValue = document.createElement('span');
  tempoValue.className = 'score-tempo-value';
  tempoValue.textContent = bpm + ' BPM';
  tempoRow.appendChild(tempoText);
  tempoRow.appendChild(tempoSlider);
  tempoRow.appendChild(tempoValue);

  const beatCounter = document.createElement('span');
  beatCounter.className = 'score-beat-counter';

  controls.appendChild(playButton);
  controls.appendChild(restartButton);
  controls.appendChild(tempoRow);
  controls.appendChild(beatCounter);

  function updateBeatCounter() {
    const measure = Math.floor(beatPosition / song.beatsPerMeasure) + 1;
    const beatInMeasure = (Math.floor(beatPosition) % song.beatsPerMeasure) + 1;
    beatCounter.textContent = 'Measure ' + measure + ' · Beat ' + beatInMeasure;
  }

  function setBeatPosition(pos) {
    beatPosition = pos;
    handle.setPlayheadFraction(beatPosition / handle.totalBeats);
    updateBeatCounter();
  }

  function pause() {
    playing = false;
    playButton.textContent = 'Play';
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function tick(timestamp) {
    if (!playing) return;
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dtSeconds = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const next = beatPosition + dtSeconds * (bpm / 60);
    if (next >= handle.totalBeats) {
      setBeatPosition(handle.totalBeats);
      pause();
      return;
    }
    setBeatPosition(next);
    rafId = requestAnimationFrame(tick);
  }

  function play() {
    if (playing) return;
    if (beatPosition >= handle.totalBeats) setBeatPosition(0);
    playing = true;
    lastTimestamp = null;
    playButton.textContent = 'Pause';
    rafId = requestAnimationFrame(tick);
  }

  function restart() {
    pause();
    setBeatPosition(0);
  }

  playButton.addEventListener('click', () => {
    if (playing) pause();
    else play();
  });
  restartButton.addEventListener('click', restart);
  tempoSlider.addEventListener('input', () => {
    bpm = Number(tempoSlider.value);
    tempoValue.textContent = bpm + ' BPM';
  });

  setBeatPosition(0);

  return controls;
}
