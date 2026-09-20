(function () {
  const TETRACHORD_KEY = 'handbell-tetrachord';
  const HAND_KEY = 'handbell-handedness';

  const bell = new BellSynth();
  const wakeLock = new WakeLockKeeper();
  const settings = loadSettings();

  let currentTetrachord = localStorage.getItem(TETRACHORD_KEY) || 'lower';
  let currentHand = localStorage.getItem(HAND_KEY) || 'right';

  const tetrachordButtons = Array.from(document.querySelectorAll('[data-tetrachord]'));
  const handButtons = Array.from(document.querySelectorAll('[data-hand]'));
  const noteChips = Array.from(document.querySelectorAll('.note-chip'));
  const enableButton = document.getElementById('enable-motion');
  const statusLine = document.getElementById('status-line');
  const noteFlash = document.getElementById('note-flash');

  let flashTimer = null;

  function renderTetrachord() {
    tetrachordButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tetrachord === currentTetrachord);
    });
    const notes = TETRACHORDS[currentTetrachord].notes;
    noteChips.forEach((chip, i) => {
      chip.querySelector('strong').textContent = notes[i].name;
    });
  }

  function renderHand() {
    handButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.hand === currentHand);
    });
  }

  tetrachordButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTetrachord = btn.dataset.tetrachord;
      localStorage.setItem(TETRACHORD_KEY, currentTetrachord);
      renderTetrachord();
    });
  });

  handButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentHand = btn.dataset.hand;
      localStorage.setItem(HAND_KEY, currentHand);
      detector.updateHandedness(currentHand);
      renderHand();
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
    handedness: currentHand,
    onGesture: handleGesture,
  });

  let motionActive = false;
  let permissionGranted = false;

  async function startMotion() {
    enableButton.disabled = true;
    if (!permissionGranted) {
      statusLine.textContent = 'Requesting permission…';
      try {
        bell.ensureContext();
        const granted = await GestureDetector.requestPermission();
        if (!granted) {
          statusLine.textContent = 'Motion permission denied. Reload to try again.';
          enableButton.disabled = false;
          return;
        }
        permissionGranted = true;
      } catch (err) {
        statusLine.textContent = 'Could not enable motion: ' + err.message;
        enableButton.disabled = false;
        return;
      }
    }
    detector.start();
    const lockedScreen = await wakeLock.enable();
    motionActive = true;
    enableButton.textContent = 'Stop Motion';
    enableButton.disabled = false;
    statusLine.textContent = lockedScreen
      ? 'Motion enabled — ready to ring.'
      : 'Motion enabled — ready to ring (screen may sleep).';
  }

  function stopMotion() {
    detector.stop();
    wakeLock.release();
    motionActive = false;
    enableButton.textContent = 'Enable Motion';
    statusLine.textContent = 'Motion stopped.';
  }

  enableButton.addEventListener('click', () => {
    if (motionActive) {
      stopMotion();
    } else {
      startMotion();
    }
  });

  renderTetrachord();
  renderHand();
})();
