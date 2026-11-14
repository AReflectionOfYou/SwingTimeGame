// Shared screen: song picker → group size → one QR code per phone → Start →
// countdown → scrolling lane score. No networking: the screen can't see the
// phones, so the host presses Start when everyone is ready.
(function () {
  const LEAD_IN_BEATS = 2;
  const COUNTDOWN_STEP_MS = 800;

  const $ = (id) => document.getElementById(id);
  const steps = ['step-song', 'step-size', 'step-codes', 'step-toddler', 'step-score'];
  const wakeLock = new WakeLockKeeper();

  let songs = [];
  let defaultLayouts = null;
  let song = null;
  let size = null; // 1-4 or 'toddler'
  let arrangement = null;

  function showStep(id) {
    steps.forEach((s) => ($(s).hidden = s !== id));
    $('back-btn').hidden = id === 'step-song';
    if (id !== 'step-score') stopScore();
  }

  function setHeader(title, subtitle) {
    $('host-title').textContent = title;
    $('host-subtitle').textContent = subtitle || '';
  }

  function showError(msg) {
    $('host-error').hidden = false;
    $('host-error').textContent = msg;
  }

  // ---- URL state (so Back works and a setup can be bookmarked) ----

  function readState() {
    const p = new URLSearchParams(location.search);
    return { song: p.get('song'), size: p.get('size') };
  }

  function go(state, replace) {
    const p = new URLSearchParams();
    if (state.song) p.set('song', state.song);
    if (state.song && state.size) p.set('size', state.size);
    const url = location.pathname + (p.toString() ? '?' + p : '');
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    render();
  }

  window.addEventListener('popstate', render);

  $('back-btn').addEventListener('click', () => {
    if (!$('step-score').hidden) {
      showCodes();
      return;
    }
    const st = readState();
    if (st.size) go({ song: st.song });
    else go({});
  });

  function render() {
    const st = readState();
    song = songs.find((s) => s.id === st.song) || null;
    if (!song) {
      size = null;
      renderSongPicker();
      return;
    }
    const sizes = availableSizes(song);
    if (st.size === 'toddler' && hasToddler(song)) {
      size = 'toddler';
      renderToddler();
    } else if (sizes.includes(Number(st.size))) {
      size = Number(st.size);
      arrangement = resolveArrangement(song, size, defaultLayouts);
      showCodes();
    } else {
      size = null;
      renderSizePicker();
    }
  }

  // ---- Step 1: song ----

  function sizeSummary(s) {
    const sizes = availableSizes(s);
    let text = '';
    if (sizes.length) {
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
      text = min === max ? min + ' phone' + (min === 1 ? '' : 's') : min + '–' + max + ' phones';
    }
    if (hasToddler(s)) text += (text ? ' · ' : '') + 'Toddler';
    return text;
  }

  function renderSongPicker() {
    setHeader(APP_CONFIG.name, 'Shared screen');
    const grid = $('song-grid');
    grid.innerHTML = '';
    songs.forEach((s) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'song-card';
      card.innerHTML = '<h3></h3><p></p>';
      card.querySelector('h3').textContent = s.title;
      card.querySelector('p').textContent = sizeSummary(s);
      card.addEventListener('click', () => go({ song: s.id }));
      grid.appendChild(card);
    });
    showStep('step-song');
  }

  // ---- Step 2: group size ----

  function dots(n) {
    return LANES.slice(0, n)
      .map((l) => '<span style="background:' + l.color + '"></span>')
      .join('');
  }

  function renderSizePicker() {
    setHeader(song.title, 'Pick the number of phones');
    const row = $('size-row');
    row.innerHTML = '';
    availableSizes(song).forEach((n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size-btn';
      b.innerHTML =
        '<span class="num">' + n + '</span><span class="dots">' + dots(n) + '</span>' +
        '<span class="what">' + (n === 1 ? 'phone' : 'phones') + '</span>';
      b.addEventListener('click', () => go({ song: song.id, size: String(n) }));
      row.appendChild(b);
    });
    if (hasToddler(song)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'size-btn size-toddler';
      b.innerHTML = '<span class="num">🔔</span><span class="what">Toddler</span>';
      b.addEventListener('click', () => go({ song: song.id, size: 'toddler' }));
      row.appendChild(b);
    }
    showStep('step-size');
  }

  // ---- Step 3: QR codes ----

  function baseWarning() {
    const base = appBaseUrl();
    const u = new URL(base);
    const local = u.protocol === 'file:' || /^(localhost|127\.|\[::1\])/.test(u.hostname);
    return (
      'Codes open ' + base +
      (local ? ' — this is a local address, so phones can’t reach it. Use the GitHub Pages site or your computer’s network address.' : '')
    );
  }

  function layoutQrGrid() {
    const grid = $('qr-grid');
    const n = grid.children.length;
    if (!n) return;
    const rect = grid.getBoundingClientRect();
    const W = rect.width;
    const H = Math.max(200, window.innerHeight - rect.top - 110);
    const labelH = 70;
    let best = { cols: 1, size: 0 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const s = Math.min(W / cols - 24, (H - rows * labelH) / rows);
      if (s > best.size) best = { cols, size: s };
    }
    grid.style.setProperty('--cols', best.cols);
    grid.style.setProperty('--qr-max', Math.max(160, best.size) + 'px');
  }

  window.addEventListener('resize', () => {
    if (!$('step-codes').hidden) layoutQrGrid();
  });

  function showCodes() {
    setHeader(song.title, size + (size === 1 ? ' phone' : ' phones') + ' — scan your color');
    const grid = $('qr-grid');
    grid.innerHTML = '';
    arrangement.phones.forEach((letter) => {
      const lane = laneByLetter(letter);
      const link = playerLink(song.id, size, lane.number);
      const card = document.createElement('div');
      card.className = 'qr-card';
      card.style.background = lane.color;
      card.style.color = lane.ink;
      card.appendChild(makeQrSvg(link, { label: 'Player ' + lane.number + ' code' }));
      const label = document.createElement('div');
      label.className = 'qr-label';
      label.textContent = 'Player ' + lane.number + ' · ' + lane.name;
      card.appendChild(label);
      grid.appendChild(card);
    });
    $('qr-url').textContent = baseWarning();
    showStep('step-codes');
    requestAnimationFrame(layoutQrGrid);
  }

  $('start-btn').addEventListener('click', () => {
    showStep('step-score');
    startScore();
  });

  // ---- Toddler ----

  function renderToddler() {
    setHeader(song.title, 'Toddler mode');
    const box = $('toddler-qr');
    box.innerHTML = '';
    box.appendChild(makeQrSvg(toddlerLink(song.id), { label: 'Toddler mode code' }));
    const label = document.createElement('div');
    label.className = 'qr-label';
    label.textContent = '🔔 Toddler';
    box.appendChild(label);
    const trail = $('melody-trail');
    trail.innerHTML = '';
    song.melody.forEach((name) => {
      const span = document.createElement('span');
      const l = noteLabel(name);
      span.textContent = l.base;
      trail.appendChild(span);
    });
    $('toddler-url').textContent = baseWarning();
    showStep('step-toddler');
  }

  // ---- Step 4: scrolling score ----

  const view = new LaneView($('score-canvas'), {
    lookAhead: storageGet('lookAhead', LANE_VIEW_DEFAULTS.lookAhead),
    showNames: storageGet('showNames', true),
  });
  let lastBeat = 0;
  let countdownToken = 0;
  let wantPlaying = false;

  const clock = new BeatClock({
    bpm: 90,
    onFrame: (pos) => {
      view.setPosition(pos);
      view.draw();
      if (pos > lastBeat + 2) finish();
    },
  });

  function updatePlayButton() {
    $('play-btn').textContent = wantPlaying ? 'Pause' : 'Play';
  }

  function startScore() {
    view.setArrangement(arrangement, song.beatsPerMeasure);
    lastBeat = arrangement.lastBeat;
    clock.bpm = song.bpm;
    $('tempo').value = song.bpm;
    $('tempo-out').textContent = song.bpm + ' BPM';
    setHeader(song.title, size + (size === 1 ? ' phone' : ' phones'));
    wakeLock.enable();
    restart();
  }

  function stopScore() {
    countdownToken++;
    clock.pause();
    wantPlaying = false;
    $('countdown').hidden = true;
    wakeLock.release();
  }

  function countdownThenPlay() {
    const token = ++countdownToken;
    wantPlaying = true;
    updatePlayButton();
    $('score-done').hidden = true;
    const el = $('countdown');
    let n = 3;
    el.hidden = false;
    el.textContent = n;
    const step = () => {
      if (token !== countdownToken) return;
      n -= 1;
      if (n === 0) {
        el.hidden = true;
        clock.play();
        return;
      }
      el.textContent = n;
      setTimeout(step, COUNTDOWN_STEP_MS);
    };
    setTimeout(step, COUNTDOWN_STEP_MS);
  }

  function pause() {
    countdownToken++;
    $('countdown').hidden = true;
    clock.pause();
    wantPlaying = false;
    updatePlayButton();
  }

  function restart() {
    pause();
    clock.seek(-LEAD_IN_BEATS);
    view.draw();
    countdownThenPlay();
  }

  function finish() {
    pause();
    $('score-done').hidden = false;
  }

  $('play-btn').addEventListener('click', () => {
    if (wantPlaying) pause();
    else if (clock.position > lastBeat + 2) restart();
    else countdownThenPlay();
  });
  $('restart-btn').addEventListener('click', restart);
  $('again-btn').addEventListener('click', restart);
  $('codes-btn').addEventListener('click', () => {
    stopScore();
    showCodes();
  });

  $('tempo').addEventListener('input', (e) => {
    clock.bpm = Number(e.target.value);
    $('tempo-out').textContent = clock.bpm + ' BPM';
  });

  const lookInput = $('lookahead');
  lookInput.value = view.lookAhead;
  $('lookahead-out').textContent = view.lookAhead + ' beats';
  lookInput.addEventListener('input', () => {
    const v = Number(lookInput.value);
    view.setLookAhead(v);
    $('lookahead-out').textContent = v + ' beats';
    storageSet('lookAhead', v);
  });

  const namesInput = $('names');
  namesInput.checked = view.showNames;
  namesInput.addEventListener('change', () => {
    view.setShowNames(namesInput.checked);
    storageSet('showNames', namesInput.checked);
  });

  const root = document.documentElement;
  if (root.requestFullscreen || root.webkitRequestFullscreen) {
    $('fullscreen-btn').hidden = false;
    $('fullscreen-btn').addEventListener('click', () => {
      const inFs = document.fullscreenElement || document.webkitFullscreenElement;
      if (inFs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    });
  }

  // Space bar toggles play/pause on a laptop.
  document.addEventListener('keydown', (e) => {
    if ($('step-score').hidden || e.code !== 'Space') return;
    if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    e.preventDefault();
    $('play-btn').click();
  });

  // ---- Boot ----

  Promise.all([loadAllSongs(), loadDefaultLayouts()])
    .then(([list, defs]) => {
      songs = list;
      defaultLayouts = defs;
      render();
    })
    .catch((err) => showError('Could not load songs: ' + err.message));
})();
