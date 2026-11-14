// Synthesized bell tone: a few inharmonic sine partials under a sharp-attack,
// long-decay envelope. No samples. A compressor on the output keeps chords
// (several bells at once, as in Demo mode) from clipping.
class BellSynth {
  constructor() {
    this.ctx = null;
    this.out = null;
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

  ensureContext() {
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
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  ring(freq, { volume = 0.8, when = 0 } = {}) {
    const ctx = this.ensureContext();
    const now = Math.max(ctx.currentTime, when);
    const duration = 2.2;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(this.out);

    // Fundamental plus inharmonic partials, as in real bells.
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

  ringNote(name, opts) {
    const note = NOTES[name];
    if (note) this.ring(note.freq, opts);
  }
}
