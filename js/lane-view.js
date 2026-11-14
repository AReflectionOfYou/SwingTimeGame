// Canvas lane score. Horizontal lanes stacked top to bottom, one per phone;
// time runs left to right; a fixed playhead sits a quarter of the way in and
// the score scrolls beneath it. A block's left edge reaching the playhead is
// the moment to ring.

const LANE_VIEW_DEFAULTS = {
  lookAhead: 6, // beats visible to the right of the playhead
  playheadFrac: 0.25,
  showNames: true,
};

class LaneView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lookAhead = opts.lookAhead || LANE_VIEW_DEFAULTS.lookAhead;
    this.playheadFrac = opts.playheadFrac || LANE_VIEW_DEFAULTS.playheadFrac;
    this.showNames = opts.showNames !== undefined ? opts.showNames : LANE_VIEW_DEFAULTS.showNames;
    this.position = 0;
    this.arrangement = null;
    this.beatsPerMeasure = 4;
    this.lanes = [];
    this.dpr = 1;
    this.width = 0;
    this.height = 0;

    this._resize = this._resize.bind(this);
    if (window.ResizeObserver) {
      new ResizeObserver(this._resize).observe(canvas);
    }
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  setArrangement(arrangement, beatsPerMeasure) {
    this.arrangement = arrangement;
    this.beatsPerMeasure = beatsPerMeasure || 4;
    this.lanes = arrangement.phones.map((p) => laneByLetter(p));
    this.draw();
  }

  setPosition(beat) {
    this.position = beat;
  }

  setLookAhead(beats) {
    this.lookAhead = beats;
    this.draw();
  }

  setShowNames(show) {
    this.showNames = show;
    this.draw();
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, W, H);
    if (!this.arrangement) return;

    const n = this.lanes.length;
    const gap = Math.max(4, H * 0.015);
    const laneH = (H - gap * (n + 1)) / n;
    const playX = Math.round(W * this.playheadFrac);
    const pxPerBeat = (W - playX) / this.lookAhead;
    const pos = this.position;
    const xOf = (beat) => playX + (beat - pos) * pxPerBeat;
    const firstBeat = Math.floor(pos - playX / pxPerBeat) - 1;
    const lastBeat = Math.ceil(pos + this.lookAhead) + 1;

    // Which lanes are sounding right now (for the lane light-up).
    const lit = {};
    this.arrangement.cues.forEach((c) => {
      const since = pos - c.beat;
      if (since >= 0 && since < 0.45) lit[c.phone] = Math.max(lit[c.phone] || 0, 1 - since / 0.45);
    });

    this.lanes.forEach((lane, i) => {
      const y = gap + i * (laneH + gap);
      const glow = lit[lane.letter] || 0;

      // Faint strip so every player can always find their row.
      ctx.globalAlpha = 0.16 + 0.34 * glow;
      ctx.fillStyle = lane.color;
      roundRect(ctx, 0, y, W, laneH, Math.min(18, laneH * 0.18));
      ctx.fill();
      ctx.globalAlpha = 1;

      // Beat and bar lines.
      for (let b = firstBeat; b <= lastBeat; b++) {
        const x = xOf(b);
        if (x < 0 || x > W) continue;
        const isBar = ((b % this.beatsPerMeasure) + this.beatsPerMeasure) % this.beatsPerMeasure === 0;
        ctx.fillStyle = isBar ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(x - (isBar ? 1 : 0.5), y + 4, isBar ? 2 : 1, laneH - 8);
      }

      // Player number at the far left of the lane.
      const labelSize = Math.min(laneH * 0.5, playX * 0.32);
      ctx.font = '800 ' + labelSize + 'px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = lane.color;
      ctx.globalAlpha = 0.85;
      ctx.fillText(String(lane.number), Math.max(8, laneH * 0.12), y + laneH / 2);
      ctx.globalAlpha = 1;
    });

    // Blocks.
    const blockW = Math.max(10, pxPerBeat * 0.86);
    this.arrangement.cues.forEach((c) => {
      const x = xOf(c.beat);
      if (x + blockW < 0 || x > W) return;
      const laneIdx = this.arrangement.phones.indexOf(c.phone);
      const lane = this.lanes[laneIdx];
      const y = gap + laneIdx * (laneH + gap);
      const bh = laneH * 0.82;
      const by = y + (laneH - bh) / 2;
      const ahead = c.beat - pos; // beats until it reaches the playhead

      // Dim far-off blocks, brighten as they approach; fade once passed.
      let alpha;
      if (ahead >= 0) alpha = 1 - 0.5 * Math.min(1, ahead / this.lookAhead);
      else alpha = Math.max(0.12, 0.55 + ahead * 0.35);
      const hit = ahead <= 0 && ahead > -0.45;
      if (hit) alpha = 1;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = lane.color;
      roundRect(ctx, x, by, blockW, bh, Math.min(16, blockW * 0.18, bh * 0.18));
      ctx.fill();
      ctx.lineWidth = hit ? Math.max(3, bh * 0.05) : 2;
      ctx.strokeStyle = hit ? '#ffffff' : 'rgba(255,255,255,0.35)';
      ctx.stroke();

      const arrowSize = Math.min(bh * 0.66, blockW * 0.86);
      drawArrow(ctx, c.gesture, x + blockW / 2, by + bh * (this.showNames ? 0.45 : 0.5), arrowSize, lane.ink);

      if (this.showNames && blockW > 26) {
        const fs = Math.max(10, Math.min(bh * 0.13, blockW * 0.22));
        ctx.font = '700 ' + fs + 'px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = lane.ink;
        ctx.globalAlpha = alpha * 0.75;
        ctx.fillText(c.note, x + blockW / 2, by + bh - fs * 0.45);
      }
      ctx.globalAlpha = 1;
    });

    // Playhead.
    const phW = Math.max(3, W * 0.004);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.fillRect(playX - phW / 2, 0, phW, H);
    ctx.shadowBlur = 0;
    const tri = Math.max(10, phW * 4);
    ctx.beginPath();
    ctx.moveTo(playX - tri, 0);
    ctx.lineTo(playX + tri, 0);
    ctx.lineTo(playX, tri * 1.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(playX - tri, H);
    ctx.lineTo(playX + tri, H);
    ctx.lineTo(playX, H - tri * 1.1);
    ctx.closePath();
    ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A bold block arrow centered on (cx, cy), pointing up for forward, down for
// back, left and right for the snaps.
function drawArrow(ctx, gesture, cx, cy, size, color) {
  const angle = { forward: 0, right: Math.PI / 2, back: Math.PI, left: -Math.PI / 2 }[gesture] || 0;
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  // Points up, spanning -s..s vertically.
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.92, -s * 0.05);
  ctx.lineTo(s * 0.36, -s * 0.05);
  ctx.lineTo(s * 0.36, s);
  ctx.lineTo(-s * 0.36, s);
  ctx.lineTo(-s * 0.36, -s * 0.05);
  ctx.lineTo(-s * 0.92, -s * 0.05);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// Beat clock. Position is tracked in beats, not seconds, so a tempo change
// takes effect immediately without jumping.
class BeatClock {
  constructor({ bpm, onFrame }) {
    this.bpm = bpm;
    this.position = 0;
    this.playing = false;
    this.onFrame = onFrame || (() => {});
    this._last = null;
    this._raf = null;
    this._tick = this._tick.bind(this);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this._last = null;
    this._raf = requestAnimationFrame(this._tick);
  }

  pause() {
    this.playing = false;
    if (this._raf !== null) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  seek(beat) {
    this.position = beat;
    this.onFrame(beat, beat);
  }

  _tick(ts) {
    if (!this.playing) return;
    if (this._last === null) this._last = ts;
    // Clamp long gaps (tab switch) so the score doesn't leap.
    const dt = Math.min(0.1, (ts - this._last) / 1000);
    this._last = ts;
    const prev = this.position;
    this.position += dt * (this.bpm / 60);
    this.onFrame(this.position, prev);
    if (this.playing) this._raf = requestAnimationFrame(this._tick);
  }
}
