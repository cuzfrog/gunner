import { Mulberry32Rng, Mulberry32RngFactory } from "./rng";

describe("Mulberry32Rng", () => {
  test("same seed produces same sequence", () => {
    const a = new Mulberry32Rng(42);
    const b = new Mulberry32Rng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  test("different seeds produce different sequences", () => {
    const a = new Mulberry32Rng(42);
    const b = new Mulberry32Rng(43);
    let differs = false;
    for (let i = 0; i < 100; i++) {
      if (a.next() !== b.next()) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  test("values are in [0, 1)", () => {
    const rng = new Mulberry32Rng(12345);
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("distribution is roughly uniform", () => {
    const rng = new Mulberry32Rng(999);
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 100000; i++) {
      const v = rng.next();
      buckets[Math.floor(v * 10)]++;
    }
    for (const count of buckets) {
      expect(count).toBeGreaterThan(8000);
      expect(count).toBeLessThan(12000);
    }
  });
});

describe("Mulberry32RngFactory", () => {
  test("create returns Rng with given seed", () => {
    const factory = new Mulberry32RngFactory();
    const a = factory.create(100);
    const b = factory.create(100);
    expect(a.next()).toBe(b.next());
  });
});
