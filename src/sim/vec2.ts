export class Vec2 {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(b: Vec2): Vec2 {
    return new Vec2(this.x + b.x, this.y + b.y);
  }

  sub(b: Vec2): Vec2 {
    return new Vec2(this.x - b.x, this.y - b.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  dot(b: Vec2): number {
    return this.x * b.x + this.y * b.y;
  }

  len(): number {
    return Math.hypot(this.x, this.y);
  }

  dist(b: Vec2): number {
    return this.sub(b).len();
  }

  norm(): Vec2 {
    const l = this.len();
    return l === 0 ? new Vec2(0, 0) : this.scale(1 / l);
  }

  perpCCW(): Vec2 {
    return new Vec2(this.y === 0 ? 0 : -this.y, this.x);
  }

  perpCW(): Vec2 {
    return new Vec2(this.y, this.x === 0 ? 0 : -this.x);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }
}
