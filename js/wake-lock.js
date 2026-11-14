// Keeps the screen awake while playing. Re-acquires the lock when the page
// becomes visible again, since the OS drops it whenever the tab is hidden.
class WakeLockKeeper {
  constructor() {
    this.sentinel = null;
    this.wanted = false;
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') this._acquire();
    });
  }

  async enable() {
    this.wanted = true;
    return this._acquire();
  }

  async _acquire() {
    if (!('wakeLock' in navigator)) return false;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      return true;
    } catch (err) {
      return false;
    }
  }

  async release() {
    this.wanted = false;
    if (!this.sentinel) return;
    try {
      await this.sentinel.release();
    } catch (err) {
      // already released
    }
    this.sentinel = null;
  }
}
