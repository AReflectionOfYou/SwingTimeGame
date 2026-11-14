// Debug view: live sensor readout, a log of detected swings with the note
// each one rings, and sliders for every threshold. Takes the same address
// values as play.html, so the "Debug" link on a player screen keeps its role.
(function () {
  const $ = (id) => document.getElementById(id);
  const bell = new BellSynth();
  const settings = loadSettings();
  let hand = loadHand();
  let slots = null; // this role's notes
  let toddlerTest = false;
  let peak = 0;
  let peakTime = 0;
  const log = [];

  const fmt = (n) => (Math.abs(n) < 10 ? n.toFixed(2) : n.toFixed(1));

  function addLog(label, s, note) {
    log.unshift({ label, note, s, time: performance.now() });
    if (log.length > 25) log.pop();
    renderLog();
  }

  function renderLog() {
    const now = performance.now();
    $('log').innerHTML = log
      .map(
        (e) =>
          '<li><span class="g">' + e.label + (e.note ? ' → ' + e.note : '') + '</span>' +
          '<span class="v">x ' + fmt(e.s.x) + ' · z ' + fmt(e.s.z) + ' · |a| ' + fmt(e.s.magnitude) +
          ' · rot ' + Math.round(e.s.rotation) + '</span>' +
          '<span class="v">' + ((now - e.time) / 1000).toFixed(1) + 's</span></li>'
      )
      .join('');
  }
  setInterval(renderLog, 500);

  const detector = new GestureDetector({
    settings,
    hand,
    onGesture: (g, s) => {
      const note = slots && slots[g];
      if (note) bell.ringNote(note);
      addLog(GESTURE_INFO[g].label, s, note);
    },
  });
  const toddler = new ToddlerTrigger({
    settings,
    onTrigger: (s) => {
      bell.ringNote('Sol');
      addLog('Toddler wave', s, 'Sol');
    },
  });

  // The readout repaints a few times a second so the numbers are legible.
  let lastPaint = 0;
  const motion = new MotionSource((s) => {
    if (toddlerTest) toddler.sample(s);
    else detector.sample(s);
    if (s.magnitude > peak || s.time - peakTime > 1500) {
      peak = s.magnitude;
      peakTime = s.time;
    }
    if (s.time - lastPaint < 200) return;
    lastPaint = s.time;
    $('r-x').textContent = fmt(s.x);
    $('r-y').textContent = fmt(s.y);
    $('r-z').textContent = fmt(s.z);
    $('r-mag').textContent = fmt(s.magnitude);
    $('r-rot').textContent = Math.round(s.rotation);
    $('r-peak').textContent = fmt(peak);
  });

  let running = false;
  $('motion-btn').addEventListener('click', () => {
    if (running) {
      motion.stop();
      running = false;
      $('motion-btn').textContent = 'Enable Motion';
      $('status').textContent = 'Motion stopped.';
      return;
    }
    bell.unlock();
    MotionSource.requestPermission()
      .then((ok) => {
        if (!ok) {
          $('status').textContent = 'Motion permission denied. Reload to try again.';
          return;
        }
        motion.start();
        running = true;
        $('motion-btn').textContent = 'Stop Motion';
        $('status').textContent = 'Motion on — live readout below.';
      })
      .catch((err) => ($('status').textContent = 'Could not enable motion: ' + err.message));
  });

  // Hand
  function renderHand() {
    document.querySelectorAll('#hand-seg button').forEach((b) => b.classList.toggle('active', b.dataset.hand === hand));
  }
  document.querySelectorAll('#hand-seg button').forEach((b) =>
    b.addEventListener('click', () => {
      hand = b.dataset.hand;
      saveHand(hand);
      detector.hand = hand;
      renderHand();
    })
  );
  renderHand();

  $('toddler-test').addEventListener('change', (e) => (toddlerTest = e.target.checked));

  // Sliders
  function buildSliders() {
    const box = $('sliders');
    box.innerHTML = '';
    Object.keys(SETTINGS_LIMITS).forEach((key) => {
      const lim = SETTINGS_LIMITS[key];
      const row = document.createElement('div');
      row.className = 'slider-row';
      row.innerHTML =
        '<label for="s-' + key + '"><span>' + lim.label + '</span><span class="val"></span></label>' +
        '<input type="range" id="s-' + key + '" min="' + lim.min + '" max="' + lim.max + '" step="' + lim.step + '" />';
      const input = row.querySelector('input');
      const val = row.querySelector('.val');
      input.value = settings[key];
      val.textContent = settings[key] + lim.unit;
      input.addEventListener('input', () => {
        settings[key] = Number(input.value);
        val.textContent = settings[key] + lim.unit;
        saveSettings(settings);
      });
      box.appendChild(row);
    });
  }
  buildSliders();

  $('reset-btn').addEventListener('click', () => {
    Object.assign(settings, SETTINGS_DEFAULTS);
    saveSettings(settings);
    buildSliders();
  });

  // Bells: every note, tappable, plus a whole-range scale.
  const grid = $('bell-grid');
  NOTE_NAMES.forEach((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = name;
    b.addEventListener('click', () => {
      bell.unlock();
      bell.ringNote(name);
    });
    grid.appendChild(b);
  });
  $('play-all').addEventListener('click', () => {
    const ctx = bell.unlock();
    const t = ctx.currentTime + 0.05;
    NOTE_NAMES.forEach((name, i) => bell.ringNote(name, { when: t + i * 0.45 }));
  });
  bell.ready.then(() => {
    $('bell-status').textContent =
      bell.status === 'ready'
        ? 'Recorded handbells loaded. Do–Ti are the recordings played an octave lower.'
        : 'Recordings did not load — using the synthesized backup bell.';
  });

  // Role, from the same address values as play.html.
  const p = new URLSearchParams(location.search);
  $('back-link').href = 'play.html' + location.search;
  const size = Number(p.get('size')) || 2;
  const lane = laneByNumber(p.get('player')) || LANES[0];
  Promise.all([p.get('song') ? loadSong(p.get('song')).catch(() => null) : null, loadDefaultLayouts()]).then(
    ([song, defaults]) => {
      const src = song || { title: 'Default', arrangements: { [size]: { layout: 'default', parts: [] } } };
      const arr = resolveArrangement(src, size, defaults) ||
        resolveArrangement({ title: 'Default', arrangements: { [size]: { layout: 'default' } } }, size, defaults);
      slots = arr && arr.layout[lane.letter];
      const notes = slots ? GESTURES.map((g) => GESTURE_INFO[g].short + ' ' + slots[g]).join(' · ') : 'none';
      $('role-line').textContent =
        'Player ' + lane.number + ' (' + lane.name + ') of ' + size + ', ' + (song ? song.title : 'default layout') + ': ' + notes;
    }
  );
})();
