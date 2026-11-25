// Bell sound. Plays recorded handbell samples (sounds/*.m4a, listed in
// sounds/manifest.json), decoded into Web Audio buffers once at startup.
// Until the samples are ready, or if any fails to load, it falls back to a
// synthesized bell so the app never goes silent. A compressor on the output
// keeps chords (several bells at once, as in Demo mode) from clipping.

const SOUNDS_VERSION = 2; // bump after regenerating the files in sounds/

class BellSynth {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.samples = null; // note name → { buffer, rate }
    this.status = 'loading'; // 'loading' | 'ready' | 'failed'
    this.voices = []; // sounding sample voices, oldest first
    this.ready = this._loadSamples();
  }

  // Call from inside a tap handler: iOS only lets a page start audio in
  // response to a user gesture.
  unlock() {
    // Safari 17+: play through the speaker even when the ringer switch is
    // set to silent, which otherwise mutes Web Audio entirely.
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (err) {
      // not supported
    }
    const ctx = this.ensureContext();
    // A one-sample silent buffer fully unlocks output on older iOS.
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
    return ctx;
  }

  get isRunning() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // Creating the context needs no tap (it starts suspended), so the samples
  // can be decoded before anyone touches the screen.
  _context() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.knee.value = 8;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      comp.connect(this.ctx.destination);
      this.out = comp;
    }
    return this.ctx;
  }

  ensureContext() {
    const ctx = this._context();
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') ctx.resume();
    return ctx;
  }

  // ---- Samples ---------------------------------------------------------

  _loadSamples() {
    const toast = loadingToast();
    const v = '?v=' + SOUNDS_VERSION;
    return fetch('sounds/manifest.json' + v)
      .then((res) => {
        if (!res.ok) throw new Error('manifest ' + res.status);
        return res.json();
      })
      .then((manifest) => {
        const notes = manifest.notes || {};
        const files = [...new Set(Object.values(notes).map((n) => n.file))];
        return Promise.all(
          files.map((file) =>
            fetch('sounds/' + file + v)
              .then((res) => {
                if (!res.ok) throw new Error(file + ' ' + res.status);
                return res.arrayBuffer();
              })
              .then((data) => this._decode(data))
              .then((buffer) => [file, buffer])
          )
        ).then((decoded) => {
          const buffers = Object.fromEntries(decoded);
          const samples = {};
          Object.keys(notes).forEach((name) => {
            samples[name] = { buffer: buffers[notes[name].file], rate: notes[name].rate || 1 };
          });
          const missing = NOTE_NAMES.filter((n) => !samples[n]);
          if (missing.length) throw new Error('no sample for ' + missing.join(', '));
          this.samples = samples;
          this.status = 'ready';
          toast.done();
        });
      })
      .catch((err) => {
        // Any failure: use the synthesized bell for every note, so the
        // sound stays consistent.
        console.warn('[audio] Bell samples unavailable, using synthesized bell:', err.message);
        this.samples = null;
        this.status = 'failed';
        toast.done();
      });
  }

  _decode(data) {
    const ctx = this._context();
    // Older Safari only supports the callback form.
    return new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(data, resolve, reject);
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    });
  }

  _playSample(name, sample, volume, when) {
    const ctx = this.ensureContext();
    const now = Math.max(ctx.currentTime, when);

    // Overlapping strikes of the same note each ring out, but a note
    // retriggered very quickly fades its previous strike so they don't pile up.
    this.voices = this.voices.filter((v) => v.end > ctx.currentTime);
    this.voices.forEach((v) => {
      if (v.name === name && now - v.start < 0.25) fadeOut(v, now, 0.06);
    });
    if (this.voices.length >= 24) fadeOut(this.voices[0], now, 0.08);

    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    src.playbackRate.value = sample.rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    src.connect(gain);
    gain.connect(this.out);
    src.start(now);
    const voice = { name, src, gain, start: now, end: now + sample.buffer.duration / sample.rate };
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
    };
    this.voices.push(voice);
    return voice;
  }

  // ---- Synthesized fallback --------------------------------------------

  // A few inharmonic sine partials under a sharp-attack, long-decay envelope.
  ring(freq, { volume = 0.8, when = 0 } = {}) {
    const ctx = this.ensureContext();
    const now = Math.max(ctx.currentTime, when);
    const duration = 2.2;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(this.out);

    const partials = [
      { ratio: 1.0, gain: 1.0, detune: 0 },
      { ratio: 2.0, gain: 0.45, detune: 7 },
      { ratio: 2.4, gain: 0.3, detune: -5 },
      { ratio: 3.76, gain: 0.18, detune: 0 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * p.ratio, now);
      osc.detune.setValueAtTime(p.detune, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(p.gain, now);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // ---- Public ----------------------------------------------------------

  // volume: 0..1, default 0.8. when: an AudioContext time, to schedule ahead.
  // Returns a handle for damp() when a recorded sample was played.
  ringNote(name, { volume = 0.8, when = 0 } = {}) {
    const sample = this.samples && this.samples[name];
    if (sample) return this._playSample(name, sample, volume * 1.25, when);
    const note = NOTES[name];
    if (note) this.ring(note.freq, { volume, when });
    return null;
  }

  // Stop a ringing note quickly, as a ringer damps a bell against the shoulder.
  damp(voice, secs = 0.15) {
    if (!voice || !this.ctx || voice.end <= this.ctx.currentTime) return;
    fadeOut(voice, this.ctx.currentTime, secs);
  }
}

function fadeOut(voice, at, secs) {
  try {
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, at);
    voice.gain.gain.linearRampToValueAtTime(0, at + secs);
    voice.src.stop(at + secs + 0.01);
  } catch (err) {
    // already stopped
  }
  voice.end = at + secs;
}

// "Loading bells…" pill, shown only if loading takes more than a moment.
function loadingToast() {
  let el = null;
  let finished = false;
  const timer = setTimeout(() => {
    const show = () => {
      if (finished) return;
      el = document.createElement('div');
      el.className = 'loading-toast';
      el.setAttribute('role', 'status');
      el.textContent = 'Loading bells…';
      document.body.appendChild(el);
    };
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  }, 300);
  return {
    done() {
      finished = true;
      clearTimeout(timer);
      if (el) el.remove();
    },
  };
}
