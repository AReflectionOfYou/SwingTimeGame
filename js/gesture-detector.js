// Heuristic, threshold-based gesture classifier (no ML). Listens to
// devicemotion, watches for a swing that crosses `triggerThreshold`, and
// classifies it by which device axis dominates and its sign.
//
// The phone is held in a "hatchet grip" (rotated 90° from portrait), not
// upright portrait:
//   x = the phone's left/right edge axis, now VERTICAL (up/down chop).
//     Right-handed: left edge down, so +x = up, -x = down.
//     Left-handed: mirrored grip, right edge down, so +x = down, -x = up.
//   z = the screen-normal axis, used for left/right: a swing with the
//     screen face leading is "right" (+z), one with the back leading is
//     "left" (-z). This convention doesn't flip with handedness.
class GestureDetector {
  constructor({ onGesture, onSample, settings, handedness } = {}) {
    this.onGesture = onGesture || (() => {});
    this.onSample = onSample || (() => {});
    this.settings = settings || { ...SETTINGS_DEFAULTS };
    this.handedness = handedness || 'right';
    this.lastGestureTime = 0;
    this._handleMotion = this._handleMotion.bind(this);
  }

  static needsPermissionRequest() {
    return (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    );
  }

  static async requestPermission() {
    if (!GestureDetector.needsPermissionRequest()) {
      return true;
    }
    const result = await DeviceMotionEvent.requestPermission();
    return result === 'granted';
  }

  updateSettings(settings) {
    this.settings = settings;
  }

  updateHandedness(handedness) {
    this.handedness = handedness;
  }

  start() {
    window.addEventListener('devicemotion', this._handleMotion);
  }

  stop() {
    window.removeEventListener('devicemotion', this._handleMotion);
  }

  _handleMotion(event) {
    const accel =
      event.acceleration && event.acceleration.x !== null
        ? event.acceleration
        : event.accelerationIncludingGravity;
    if (!accel) return;

    const rotation = event.rotationRate || {};
    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;
    const gammaRate = rotation.gamma || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    this.onSample({ x, y, z, magnitude, gammaRate });

    const now = performance.now();
    if (now - this.lastGestureTime < this.settings.refractoryMs) return;
    if (magnitude < this.settings.triggerThreshold) return;

    const absX = Math.abs(x);
    const isRightHanded = this.handedness !== 'left';

    let gesture;
    if (absX >= Math.abs(z)) {
      const isUp = isRightHanded ? x > 0 : x < 0;
      gesture = isUp ? 'up' : 'down';
    } else {
      gesture = z > 0 ? 'right' : 'left';
    }

    this.lastGestureTime = now;
    this.onGesture(gesture, { x, y, z, magnitude });
  }
}
