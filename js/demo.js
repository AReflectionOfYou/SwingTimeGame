// Demo: the first built-in song plays itself on this phone, every lane ringing
// through the speaker, then loops. It starts scrolling straight away, silent;
// the first tap anywhere unlocks audio (iOS requires a touch first). No motion
// permission is ever needed.
(function () {
  const LEAD_IN_BEATS = 2;
  const LOOP_PAUSE_MS = 1800;
  const $ = (id) => document.getElementById(id);

  const bell = new BellSynth();
  const wakeLock = new WakeLockKeeper();
  const view = new LaneView($('score-canvas'));
  let arrangement = null;
  let loopTimer = null;
  let soundOn = false;

  const clock = new BeatClock({
    bpm: 90,
    onFrame: (pos, prev) => {
      view.setPosition(pos);
      view.draw();
      if (soundOn && arrangement) {
        arrangement.cues.forEach((c) => {
          if (c.beat > prev && c.beat <= pos) bell.ringNote(c.note, { volume: 0.55 });
        });
      }
      if (arrangement && pos > arrangement.lastBeat + 2) loop();
    },
  });

  function loop() {
    clock.pause();
    clearTimeout(loopTimer);
    loopTimer = setTimeout(() => {
      clock.seek(-LEAD_IN_BEATS);
      clock.play();
    }, LOOP_PAUSE_MS);
  }

  function setPaused(paused) {
    clearTimeout(loopTimer);
    if (paused) clock.pause();
    else clock.play();
    $('pause-btn').textContent = paused ? 'Play' : 'Pause';
  }

  $('pause-btn').addEventListener('click', () => setPaused(clock.playing));
  $('restart-btn').addEventListener('click', () => {
    clock.seek(-LEAD_IN_BEATS);
    setPaused(false);
  });

  // First tap anywhere turns the sound on.
  document.addEventListener(
    'pointerdown',
    () => {
      bell.unlock();
      soundOn = true;
      $('tap-hint').hidden = true;
    },
    { once: true }
  );

  Promise.all([loadSongIndex(), loadDefaultLayouts()])
    .then(([ids, defaults]) => loadSong(ids[0]).then((song) => [song, defaults]))
    .then(([song, defaults]) => {
      // Show the most lanes the song offers, so several colors ring together.
      const sizes = availableSizes(song);
      const size = Math.max(...sizes);
      arrangement = resolveArrangement(song, size, defaults);
      view.setArrangement(arrangement, song.beatsPerMeasure);
      clock.bpm = song.bpm;
      $('demo-title').textContent = song.title;

      if (sizes.includes(1)) {
        $('try-btn').href = playerLink(song.id, 1, 1);
        $('try-btn').hidden = false;
      }
      if (hasToddler(song)) {
        $('toddler-btn').href = toddlerLink(song.id);
        $('toddler-btn').hidden = false;
      }
      clock.seek(-LEAD_IN_BEATS);
      clock.play();
      wakeLock.enable();
    })
    .catch((err) => {
      $('demo-error').hidden = false;
      $('demo-error').textContent = 'Could not load the demo song: ' + err.message;
    });
})();
