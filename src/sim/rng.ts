export interface Rng {
  next(): number; // uniform [0, 1)
}

export interface RngFactory {
  create(seed: number): Rng;
}

export class Mulberry32Rng implements Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export class Mulberry32RngFactory implements RngFactory {
  create(seed: number): Rng {
    return new Mulberry32Rng(seed);
  }
}
