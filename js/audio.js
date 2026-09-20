// Synthesized bell tone: a stack of detuned/inharmonic sine partials under a
// sharp-attack, long-decay envelope. No external samples.
class BellSynth {
  constructor() {
    this.ctx = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  getState() {
    return this.ctx ? this.ctx.state : 'not started';
  }

  ring(freq) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const duration = 2.2;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.9, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    // Fundamental plus a couple of inharmonic partials, typical of real
    // bells (whose overtones aren't pure integer multiples).
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
}
