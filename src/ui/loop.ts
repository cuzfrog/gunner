const FIXED_DT = 1 / 60; // simulation seconds per step

export class Loop {
  private running = false;
  private rafId = 0;
  private lastT = 0;
  private accumulator = 0;
  private speed = 1;
  private onTick: (dt: number) => void;

  constructor(onTick: (dt: number) => void) {
    this.onTick = onTick;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  toggle() {
    this.running ? this.stop() : this.start();
  }

  isRunning() {
    return this.running;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }

  reset() {
    this.accumulator = 0;
    this.lastT = performance.now();
  }

  private frame(t: number) {
    if (!this.running) return;
    const frameDelta = Math.min((t - this.lastT) / 1000, 0.25); // cap at 250ms
    this.lastT = t;
    this.accumulator += frameDelta * this.speed;

    while (this.accumulator >= FIXED_DT) {
      this.onTick(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.rafId = requestAnimationFrame((next) => this.frame(next));
  }
}
