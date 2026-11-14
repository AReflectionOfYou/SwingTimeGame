// Motion input. Two listeners share one devicemotion pipeline:
//   GestureDetector — classifies a swing as forward / back / left / right.
//   ToddlerTrigger  — fires on any motion at all, in any direction.
//
// Grip (carried over from the prototypes, tuned on an iPhone): the phone is
// held like a hatchet — sideways, not upright portrait.
//   x = the phone's long left/right edge axis, now vertical. A forward swing
//     (a downward chop) pivots at the elbow, so the reading is dominated by
//     centripetal acceleration toward the pivot, opposite the direction of
//     travel. Right-handed: -x = back (up), +x = forward (down).
//     Left-handed grip is mirrored.
//   z = the screen-normal axis, used for left/right snaps; the sign flips
//     with handedness. The signs in GestureDetector.sample are the ones last
//     confirmed on an iPhone in the prototypes — re-check them in the debug
//     view if left and right ever come out swapped.

const GRAVITY = 9.81;

// Normalizes a devicemotion event to linear acceleration (gravity removed)
// plus rotation rate. Falls back to a running gravity estimate on devices
// that only report accelerationIncludingGravity.
class MotionSource {
  constructor(onSample) {
    this.onSample = onSample;
    this.gravity = null;
    this._handle = this._handle.bind(this);
  }

  static needsPermissionRequest() {
    return (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    );
  }

  // Must be called synchronously inside a tap handler on iOS.
  static requestPermission() {
    if (!MotionSource.needsPermissionRequest()) return Promise.resolve(true);
    return DeviceMotionEvent.requestPermission().then((r) => r === 'granted');
  }

  start() {
    window.addEventListener('devicemotion', this._handle);
  }

  stop() {
    window.removeEventListener('devicemotion', this._handle);
  }

  _handle(event) {
    let x;
    let y;
    let z;
    const a = event.acceleration;
    if (a && a.x !== null && a.x !== undefined) {
      x = a.x || 0;
      y = a.y || 0;
      z = a.z || 0;
    } else {
      const g = event.accelerationIncludingGravity;
      if (!g) return;
      const raw = [g.x || 0, g.y || 0, g.z || 0];
      if (!this.gravity) this.gravity = raw.slice();
      for (let i = 0; i < 3; i++) this.gravity[i] = 0.9 * this.gravity[i] + 0.1 * raw[i];
      x = raw[0] - this.gravity[0];
      y = raw[1] - this.gravity[1];
      z = raw[2] - this.gravity[2];
    }
    const r = event.rotationRate || {};
    const alpha = r.alpha || 0;
    const beta = r.beta || 0;
    const gamma = r.gamma || 0;
    this.onSample({
      x,
      y,
      z,
      magnitude: Math.sqrt(x * x + y * y + z * z),
      rotation: Math.sqrt(alpha * alpha + beta * beta + gamma * gamma),
      time: performance.now(),
    });
  }
}

class GestureDetector {
  constructor({ settings, hand, onGesture }) {
    this.settings = settings;
    this.hand = hand || 'right';
    this.onGesture = onGesture || (() => {});
    this.lastGestureTime = -Infinity;
  }

  // Feed one sample from MotionSource.
  sample(s) {
    if (s.time - this.lastGestureTime < this.settings.refractoryMs) return;
    if (s.magnitude < this.settings.triggerThreshold) return;

    const rightHanded = this.hand !== 'left';
    let gesture;
    if (Math.abs(s.x) >= Math.abs(s.z)) {
      const isBack = rightHanded ? s.x < 0 : s.x > 0;
      gesture = isBack ? 'back' : 'forward';
    } else {
      const isLeft = rightHanded ? s.z < 0 : s.z > 0;
      gesture = isLeft ? 'left' : 'right';
    }
    this.lastGestureTime = s.time;
    this.onGesture(gesture, s);
  }
}

class ToddlerTrigger {
  constructor({ settings, onTrigger }) {
    this.settings = settings;
    this.onTrigger = onTrigger || (() => {});
    this.lastTime = -Infinity;
  }

  sample(s) {
    if (s.time - this.lastTime < this.settings.toddlerGapMs) return;
    if (
      s.magnitude < this.settings.toddlerThreshold &&
      s.rotation < this.settings.toddlerRotation
    ) {
      return;
    }
    this.lastTime = s.time;
    this.onTrigger(s);
  }
}
