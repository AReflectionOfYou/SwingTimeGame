// Heuristic, threshold-based gesture classifier (no ML). Listens to
// devicemotion, watches for a swing that crosses `triggerThreshold` (or a
// wrist twist that crosses `twistThreshold`), and classifies it into one of
// four directions based on which axis dominates and its sign.
//
// Device axes in portrait orientation:
//   x = left/right across the screen
//   y = up/down along the screen
//   z = toward/away from the user's face (out of the screen)
// rotationRate.gamma = rotation around the y-axis, in degrees/second, which
// is what a wrist-twist (snap right / twist for "fa") mostly shows up as.
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

    const overSwingThreshold = magnitude >= this.settings.triggerThreshold;
    const overTwistThreshold = Math.abs(gammaRate) >= this.settings.twistThreshold;
    if (!overSwingThreshold && !overTwistThreshold) return;

    let gesture = null;
    if (overSwingThreshold) {
      const absX = Math.abs(x);
      const absZ = Math.abs(z);
      if (absZ >= absX) {
        gesture = z > 0 ? 'forward' : 'back';
      } else {
        gesture = x < 0 ? 'left' : 'right';
      }
    } else if (overTwistThreshold) {
      gesture = 'right'; // twist is an alternate trigger for "fa"
    }

    if (gesture) {
      this.lastGestureTime = now;
      this.onGesture(gesture, { x, y, z, magnitude, gammaRate });
    }
  }
}
