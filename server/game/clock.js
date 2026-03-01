/**
 * Accelerated game clock.
 * The server is authoritative on game time.
 * Real-time seconds are multiplied by timeFactor to advance the virtual clock.
 */
class GameClock {
  constructor(timeFactor = 10) {
    this.timeFactor = timeFactor;
    this.startReal = Date.now();
    // Game starts at 08:00 the current day
    this.startGame = new Date();
    this.startGame.setHours(8, 0, 0, 0);
    this._interval = null;
    this._listeners = [];
  }

  /** Current virtual game time */
  now() {
    const elapsedReal = Date.now() - this.startReal;
    const elapsedGame = elapsedReal * this.timeFactor;
    return new Date(this.startGame.getTime() + elapsedGame);
  }

  /** Formatted HH:MM:SS */
  formatted() {
    const t = this.now();
    const h = String(t.getHours()).padStart(2, '0');
    const m = String(t.getMinutes()).padStart(2, '0');
    const s = String(t.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /** Current hour (0-23) — useful for call frequency curves */
  hour() {
    return this.now().getHours();
  }

  setTimeFactor(factor) {
    // Freeze current game time, then restart with new factor
    const frozen = this.now();
    this.startReal = Date.now();
    this.startGame = frozen;
    this.timeFactor = factor;
  }

  /** Register a tick listener called every real second */
  onTick(fn) {
    this._listeners.push(fn);
  }

  start() {
    if (this._interval) return;
    this._interval = setInterval(() => {
      const gameTime = this.now();
      for (const fn of this._listeners) {
        fn(gameTime, this.formatted());
      }
    }, 1000);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = { GameClock };
