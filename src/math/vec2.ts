export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const len = (v: Vec2): number => Math.hypot(v.x, v.y);

export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));

export const norm = (v: Vec2): Vec2 => {
  const l = len(v);
  return l === 0 ? vec(0, 0) : scale(v, 1 / l);
};

/** 90-degree counter-clockwise rotation. */
export const perpCCW = (v: Vec2): Vec2 => ({
  x: v.y === 0 ? 0 : -v.y,
  y: v.x,
});

/** 90-degree clockwise rotation. */
export const perpCW = (v: Vec2): Vec2 => ({
  x: v.y,
  y: v.x === 0 ? 0 : -v.x,
});

export const angle = (v: Vec2): number => Math.atan2(v.y, v.x);
