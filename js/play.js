// The phone. Reads its role from the address the QR code carried:
//   play.html?song=<id>&size=<1-4>&player=<1-4>   → a ringing player
//   play.html?song=<id>&mode=toddler              → Toddler mode
//   play.html?size=<n>&player=<n>                 → default layout, no song
//   play.html                                     → pick a role by hand
// Nothing about the role is saved on the phone, so the most recent scan
// always wins.
(function () {
  const $ = (id) => document.getElementById(id);
  const bell = new BellSynth();
  const wakeLock = new WakeLockKeeper();
  const settings = loadSettings();
  let hand = loadHand();

  let mode = null; // 'player' | 'setup' | 'toddler'
  let layoutSlots = null; // { forward, back, left, right } for this phone
  let motionOn = false;
  let permissionGranted = false;
  let flashTimer = null;

  // One motion pipeline, routed to whichever mode is active.
  const detector = new GestureDetector({ settings, hand, onGesture: onGesture });
  const toddlerTrigger = new ToddlerTrigger({ settings, onTrigger: onToddlerTrigger });
  const motion = new MotionSource((s) => {
    if (mode === 'player') detector.sample(s);
    else if (mode === 'toddler') toddlerTrigger.sample(s);
  });

  function params() {
    return new URLSearchParams(location.search);
  }

  function showOnly(id) {
    ['player', 'setup', 'toddler'].forEach((s) => ($(s).hidden = s !== id));
  }

  // Asks for motion permission and unlocks audio. Both must start inside the
  // tap handler on iOS, so this is called synchronously from a click.
  function enableMotion() {
    bell.unlock();
    if (permissionGranted) {
      motion.start();
      return Promise.resolve(true);
    }
    return MotionSource.requestPermission()
      .then((granted) => {
        if (granted) {
          permissionGranted = true;
          motion.start();
        }
        return granted;
      })
      .catch(() => false);
  }

  function disableMotion() {
    motion.stop();
    wakeLock.release();
  }

  // ---------------------------------------------------------------- player

  function renderPlayer(song, arrangement, lane) {
    mode = 'player';
    showOnly('player');
    layoutSlots = arrangement.layout[lane.letter];

    const root = $('player');
    root.style.setProperty('--lane', lane.color);
    root.style.setProperty('--ink', lane.ink);
    document.querySelector('meta[name="theme-color"]').content = lane.color;
    document.body.style.background = lane.color;

    $('p-num').textContent = lane.number;
    $('p-color').textContent = 'Player ' + lane.number + ' · ' + lane.name;
    $('p-song').textContent = song ? song.title : 'Default ' + arrangement.size + '-phone layout';

    const cross = $('note-cross');
    cross.querySelectorAll('.note-btn').forEach((b) => b.remove());
    GESTURES.forEach((g) => {
      const name = layoutSlots[g];
      const label = noteLabel(name);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'note-btn';
      btn.dataset.gesture = g;
      btn.innerHTML = '<span class="arrow"></span><span class="name"></span><span class="oct"></span>';
      btn.querySelector('.arrow').textContent = GESTURE_INFO[g].arrow;
      btn.querySelector('.name').textContent = label.base;
      btn.querySelector('.oct').textContent = label.octaveWord;
      btn.setAttribute('aria-label', GESTURE_INFO[g].label + ': ' + name);
      btn.addEventListener('click', () => {
        bell.unlock();
        ring(g);
      });
      cross.appendChild(btn);
    });
    $('note-center').textContent = '';

    // Switch to another player of the same group without rescanning.
    const sw = $('player-switch');
    sw.innerHTML = '';
    if (arrangement.size > 1) {
      arrangement.phones.forEach((letter) => {
        const l = laneByLetter(letter);
        const b = document.createElement('button');
        b.type = 'button';
        b.style.background = l.color;
        b.style.color = l.ink;
        b.textContent = l.number;
        b.className = l.letter === lane.letter ? 'active' : '';
        b.setAttribute('aria-label', 'Player ' + l.number + ' ' + l.name);
        b.addEventListener('click', () => {
          const p = params();
          p.set('player', l.number);
          history.replaceState(null, '', '?' + p);
          boot();
        });
        sw.appendChild(b);
      });
    }

    const q = location.search;
    $('debug-link').href = 'debug.html' + q;
    $('change-link').href = 'play.html?setup=1' + (q ? '&' + q.slice(1) : '');
    updateMotionButton();
    renderHand();
  }

  function ring(gesture) {
    const name = layoutSlots && layoutSlots[gesture];
    if (!name) return;
    bell.ringNote(name);
    const btn = document.querySelector('.note-btn[data-gesture="' + gesture + '"]');
    document.querySelectorAll('.note-btn.flash').forEach((b) => b.classList.remove('flash'));
    if (btn) btn.classList.add('flash');
    $('note-center').textContent = noteLabel(name).base;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      document.querySelectorAll('.note-btn.flash').forEach((b) => b.classList.remove('flash'));
      $('note-center').textContent = '';
    }, 450);
  }

  function onGesture(gesture) {
    ring(gesture);
  }

  function updateMotionButton() {
    $('motion-btn').textContent = motionOn ? 'Stop Motion' : 'Enable Motion';
    $('motion-btn').classList.toggle('btn-primary', !motionOn);
  }

  $('motion-btn').addEventListener('click', () => {
    if (motionOn) {
      disableMotion();
      motionOn = false;
      $('p-status').textContent = 'Motion stopped.';
      updateMotionButton();
      return;
    }
    $('p-status').textContent = 'Asking for motion…';
    enableMotion().then((granted) => {
      if (!granted) {
        $('p-status').textContent = 'Motion was not allowed. Reload the page and tap Allow.';
        return;
      }
      motionOn = true;
      wakeLock.enable();
      $('p-status').textContent = 'Ready — swing to ring!';
      updateMotionButton();
    });
  });

  function renderHand() {
    document.querySelectorAll('#hand-seg button').forEach((b) => {
      b.classList.toggle('active', b.dataset.hand === hand);
    });
  }

  document.querySelectorAll('#hand-seg button').forEach((b) => {
    b.addEventListener('click', () => {
      hand = b.dataset.hand;
      saveHand(hand);
      detector.hand = hand;
      renderHand();
    });
  });

  // ---------------------------------------------------------------- setup

  function renderSetup(songs, defaults, pre) {
    mode = 'setup';
    showOnly('setup');
    document.body.style.background = '';
    const songSel = $('setup-song');
    const sizeSel = $('setup-size');
    songSel.innerHTML = '<option value="">Default layout (no song)</option>';
    songs.forEach((s) => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.title;
      songSel.appendChild(o);
    });
    songSel.value = songs.some((s) => s.id === pre.song) ? pre.song : '';
    let player = Number(pre.player) || 1;

    function sizesFor() {
      const s = songs.find((x) => x.id === songSel.value);
      return s ? availableSizes(s) : [1, 2, 3, 4];
    }

    function fillSizes() {
      const keep = Number(sizeSel.value || pre.size) || 2;
      sizeSel.innerHTML = '';
      sizesFor().forEach((n) => {
        const o = document.createElement('option');
        o.value = n;
        o.textContent = n + (n === 1 ? ' phone' : ' phones');
        sizeSel.appendChild(o);
      });
      const sizes = sizesFor();
      sizeSel.value = sizes.includes(keep) ? keep : sizes[0];
      fillPlayers();
    }

    function fillPlayers() {
      const n = Number(sizeSel.value);
      if (player > n) player = 1;
      const row = $('setup-player');
      row.innerHTML = '';
      LANES.slice(0, n).forEach((l) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lane-choice' + (l.number === player ? ' active' : '');
        b.style.background = l.color;
        b.style.color = l.ink;
        b.textContent = l.number;
        b.setAttribute('aria-label', 'Player ' + l.number + ' ' + l.name);
        b.addEventListener('click', () => {
          player = l.number;
          fillPlayers();
        });
        row.appendChild(b);
      });
    }

    songSel.onchange = fillSizes;
    sizeSel.onchange = fillPlayers;
    $('setup-go').onclick = () => {
      const p = new URLSearchParams();
      if (songSel.value) p.set('song', songSel.value);
      p.set('size', sizeSel.value);
      p.set('player', player);
      history.replaceState(null, '', '?' + p);
      boot();
    };
    fillSizes();
  }

  // ---------------------------------------------------------------- toddler

  let melody = [];
  let melodyIdx = 0;
  let swingFlip = false;
  let toddlerStarted = false;

  function renderToddler(song, songs) {
    mode = 'toddler';
    showOnly('toddler');
    document.body.style.background = '';
    melodyIdx = 0;
    if (!song) {
      $('t-title').textContent = 'Pick a song';
      $('t-start').hidden = true;
      $('t-bell').style.display = 'none';
      const list = $('t-songs');
      list.hidden = false;
      list.innerHTML = '';
      songs.filter(hasToddler).forEach((s) => {
        const a = document.createElement('a');
        a.href = 'play.html?song=' + encodeURIComponent(s.id) + '&mode=toddler';
        a.textContent = s.title;
        list.appendChild(a);
      });
      return;
    }
    melody = song.melody.filter(isNoteName);
    $('t-songs').hidden = true;
    $('t-bell').style.display = '';
    $('t-title').textContent = song.title;
    $('t-start').hidden = toddlerStarted;
    $('t-status').textContent = toddlerStarted ? '' : 'Tap, then wave the phone!';
  }

  $('t-start').addEventListener('click', () => {
    enableMotion().then((granted) => {
      toddlerStarted = true;
      $('t-start').hidden = true;
      wakeLock.enable();
      $('t-status').textContent = granted ? '' : 'Motion is off — tap the screen to play instead.';
    });
  });

  function onToddlerTrigger() {
    if (!toddlerStarted || !melody.length) return;
    const name = melody[melodyIdx];
    bell.ringNote(name);
    melodyIdx += 1;
    const looped = melodyIdx >= melody.length;
    if (looped) {
      melodyIdx = 0;
      flourish();
    }
    celebrate(looped);
  }

  // A soft sparkle when the tune comes round again.
  function flourish() {
    const ctx = bell.ensureContext();
    const t = ctx.currentTime + 0.45;
    ['Do3', 'Sol2', 'Mi2', 'Do2'].forEach((n, i) => {
      bell.ring(NOTES[n].freq, { volume: 0.25, when: t + i * 0.09 });
    });
  }

  function celebrate(big) {
    const b = $('t-bell');
    b.classList.remove('swing-a', 'swing-b');
    void b.offsetWidth; // restart the animation
    swingFlip = !swingFlip;
    b.classList.add(swingFlip ? 'swing-a' : 'swing-b');
    const root = $('toddler');
    root.style.setProperty('--hue', Math.floor(Math.random() * 360));
    const r = document.createElement('div');
    r.className = 'ripple';
    if (big) r.style.borderWidth = '22px';
    root.appendChild(r);
    setTimeout(() => r.remove(), 950);
  }

  // Taps play too (handy for very little ones and for testing), but never
  // leave the mode.
  $('toddler').addEventListener('pointerdown', (e) => {
    if (e.target.closest('#t-exit, #t-start, #t-songs')) return;
    if (toddlerStarted) onToddlerTrigger();
  });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Grown-up exit: press and hold the corner control for two seconds.
  (function holdToExit() {
    const btn = $('t-exit');
    let timer = null;
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
      btn.classList.remove('holding');
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('holding');
      $('t-hint').hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        disableMotion();
        location.href = 'index.html';
      }, 2000);
      setTimeout(() => ($('t-hint').hidden = true), 2500);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  })();

  // ---------------------------------------------------------------- boot

  function boot() {
    const p = params();
    const songId = p.get('song');
    const size = Number(p.get('size'));
    const lane = laneByNumber(p.get('player'));

    Promise.all([loadAllSongs(), loadDefaultLayouts()])
      .then(([songs, defaults]) => {
        const song = songs.find((s) => s.id === songId) || null;
        if (p.get('mode') === 'toddler') {
          renderToddler(song && hasToddler(song) ? song : null, songs);
          return;
        }
        if (motionOn && mode !== 'player') {
          disableMotion();
          motionOn = false;
        }
        if (!p.get('setup') && lane && size >= 1 && size <= 4 && lane.number <= size) {
          let arrangement = null;
          if (song) arrangement = resolveArrangement(song, size, defaults);
          else if (!songId) {
            const fake = { title: 'Default', arrangements: { [size]: { layout: 'default', parts: [] } } };
            arrangement = resolveArrangement(fake, size, defaults);
          }
          if (arrangement && arrangement.layout[lane.letter]) {
            renderPlayer(song, arrangement, lane);
            return;
          }
        }
        renderSetup(songs, defaults, { song: songId, size: p.get('size'), player: p.get('player') });
      })
      .catch((err) => {
        showOnly('setup');
        $('setup').innerHTML = '<p class="warn">Could not load songs: ' + err.message + '</p>';
      });
  }

  // Returning to a cached page (back/forward) re-reads the address.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) boot();
  });

  boot();
})();
