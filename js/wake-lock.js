// Keeps the screen awake during play. Re-acquires the lock when the page
// regains visibility, since the OS releases it whenever the tab is hidden.
class WakeLockKeeper {
  constructor() {
    this.sentinel = null;
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  async enable() {
    if (!('wakeLock' in navigator)) return false;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      return true;
    } catch (err) {
      return false;
    }
  }

  async _onVisibilityChange() {
    if (this.sentinel && document.visibilityState === 'visible') {
      await this.enable();
    }
  }
}
