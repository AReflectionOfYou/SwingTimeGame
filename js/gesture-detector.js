// Heuristic, threshold-based gesture classifier (no ML). Listens to
// devicemotion, watches for a swing that crosses `triggerThreshold`, and
// classifies it by which device axis dominates and its sign.
//
// The phone is held in a "hatchet grip" (rotated 90° from portrait, screen's
// left edge pointing down), not upright portrait:
//   x = the phone's left/right edge axis, now VERTICAL: +x = up, -x = down.
//   y, z = the two remaining, roughly horizontal axes. Whichever of the two
//     reads larger at the moment of a swing is treated as the left/right
//     axis, since which one actually carries the sideways-swing signal
//     depends on which way the screen faces while held.
class GestureDetector {
  constructor({ onGesture, onSample, settings } = {}) {
    this.onGesture = onGesture || (() => {});
    this.onSample = onSample || (() => {});
    this.settings = settings || { ...SETTINGS_DEFAULTS };
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
    const horizontal = Math.abs(y) >= Math.abs(z) ? y : z;

    const gesture =
      absX >= Math.abs(horizontal) ? (x > 0 ? 'up' : 'down') : horizontal > 0 ? 'right' : 'left';

    this.lastGestureTime = now;
    this.onGesture(gesture, { x, y, z, magnitude });
  }
}
