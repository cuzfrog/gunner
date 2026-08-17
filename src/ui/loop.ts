export interface Loop {
  setTickHandler(handler: (dt: number) => void): void;
  start(): void;
  stop(): void;
  toggle(): void;
  isRunning(): boolean;
  setSpeed(speed: number): void;
  reset(): void;
}

const FIXED_DT = 1 / 60; // simulation seconds per step

export class RafLoop implements Loop {
  private running = false;
  private rafId = 0;
  private lastT = 0;
  private accumulator = 0;
  private speed = 1;
  private onTick?: (dt: number) => void;

  setTickHandler(handler: (dt: number) => void): void {
    this.onTick = handler;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  toggle(): void {
    if (this.running) this.stop();
    else this.start();
  }

  isRunning(): boolean {
    return this.running;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  reset(): void {
    this.accumulator = 0;
    this.lastT = performance.now();
  }

  private frame(t: number): void {
    if (!this.running) return;
    const frameDelta = Math.min((t - this.lastT) / 1000, 0.25); // cap at 250ms
    this.lastT = t;
    this.accumulator += frameDelta * this.speed;

    while (this.accumulator >= FIXED_DT) {
      this.onTick?.(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.rafId = requestAnimationFrame((next) => this.frame(next));
  }
}
