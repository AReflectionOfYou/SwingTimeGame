(function () {
  const TETRACHORD_KEY = 'handbell-tetrachord';

  const bell = new BellSynth();
  const wakeLock = new WakeLockKeeper();
  const settings = loadSettings();

  let currentTetrachord = localStorage.getItem(TETRACHORD_KEY) || 'lower';

  const toggleButtons = Array.from(document.querySelectorAll('.tetrachord-toggle button'));
  const noteChips = Array.from(document.querySelectorAll('.note-chip'));
  const enableButton = document.getElementById('enable-motion');
  const statusLine = document.getElementById('status-line');
  const noteFlash = document.getElementById('note-flash');

  let flashTimer = null;

  function renderTetrachord() {
    toggleButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tetrachord === currentTetrachord);
    });
    const notes = TETRACHORDS[currentTetrachord].notes;
    noteChips.forEach((chip, i) => {
      chip.querySelector('strong').textContent = notes[i].name;
    });
  }

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTetrachord = btn.dataset.tetrachord;
      localStorage.setItem(TETRACHORD_KEY, currentTetrachord);
      renderTetrachord();
    });
  });

  noteChips.forEach((chip, i) => {
    chip.addEventListener('click', () => {
      const note = TETRACHORDS[currentTetrachord].notes[i];
      bell.ring(note.freq);
      flashNote(note.name);
    });
  });

  function flashNote(name) {
    noteFlash.textContent = name;
    noteFlash.classList.remove('show');
    // Force reflow so the transition re-triggers on rapid repeat notes.
    void noteFlash.offsetWidth;
    noteFlash.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => noteFlash.classList.remove('show'), 500);
  }

  function handleGesture(gesture) {
    const note = noteForGesture(currentTetrachord, gesture);
    if (!note) return;
    bell.ring(note.freq);
    flashNote(note.name);
  }

  const detector = new GestureDetector({
    settings,
    onGesture: handleGesture,
  });

  async function enableMotion() {
    enableButton.disabled = true;
    statusLine.textContent = 'Requesting permission…';
    try {
      bell.ensureContext();
      const granted = await GestureDetector.requestPermission();
      if (!granted) {
        statusLine.textContent = 'Motion permission denied. Reload to try again.';
        enableButton.disabled = false;
        return;
      }
      detector.start();
      const lockedScreen = await wakeLock.enable();
      enableButton.hidden = true;
      statusLine.textContent = lockedScreen
        ? 'Motion enabled — ready to ring.'
        : 'Motion enabled — ready to ring (screen may sleep).';
    } catch (err) {
      statusLine.textContent = 'Could not enable motion: ' + err.message;
      enableButton.disabled = false;
    }
  }

  enableButton.addEventListener('click', enableMotion);

  // Best-effort only: iOS Safari does not support screen orientation lock
  // for regular (non-fullscreen) web pages. The CSS orientation guard in
  // index.html covers that case.
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('portrait').catch(() => {});
  }

  renderTetrachord();
})();
