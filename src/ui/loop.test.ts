import { RafLoop } from "./loop";

// The bun test environment has no real rAF clock; install a controllable fake
// (same pattern as main.test.ts) so frames are driven by the test, not by wall time.
describe("RafLoop", () => {
  let frameCallback: FrameRequestCallback | undefined;
  let nowMs: number;
  let savedRaf: (typeof globalThis)["requestAnimationFrame"] | undefined;
  let savedCancel: (typeof globalThis)["cancelAnimationFrame"] | undefined;
  let savedPerformance: (typeof globalThis)["performance"] | undefined;
  let cancelCalls: number[];

  beforeEach(() => {
    frameCallback = undefined;
    nowMs = 0;
    cancelCalls = [];
    savedRaf = globalThis.requestAnimationFrame;
    savedCancel = globalThis.cancelAnimationFrame;
    savedPerformance = globalThis.performance;
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => { frameCallback = callback; return 7; }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => { cancelCalls.push(id); }) as typeof cancelAnimationFrame;
    globalThis.performance = { now: () => nowMs } as unknown as typeof performance;
  });

  afterEach(() => {
    restoreGlobal("requestAnimationFrame", savedRaf);
    restoreGlobal("cancelAnimationFrame", savedCancel);
    restoreGlobal("performance", savedPerformance);
  });

  test("runs speed-scaled fixed-step ticks per rAF frame", () => {
    const loop = new RafLoop();
    const ticks: number[] = [];
    loop.setTickHandler((dt) => ticks.push(dt));
    loop.setSpeed(4);
    loop.start();
    nowMs = 100;
    frameCallback!(nowMs);
    expect(ticks).toHaveLength(24); // 100ms * 4x speed = 0.4 sim seconds at 60 steps/s
    expect(ticks.every((dt) => Math.abs(dt - 1 / 60) < 1e-9)).toBe(true);
  });

  test("fires the frame handler exactly once per rAF when at least one tick ran", () => {
    const loop = new RafLoop();
    let frames = 0;
    loop.setTickHandler(() => {});
    loop.setFrameHandler(() => { frames++; });
    loop.setSpeed(4);
    loop.start();
    nowMs = 100;
    frameCallback!(nowMs);
    nowMs = 200;
    frameCallback!(nowMs);
    expect(frames).toBe(2);
  });

  test("does not fire the frame handler when no tick ran in the frame", () => {
    const loop = new RafLoop();
    let ticks = 0;
    let frames = 0;
    loop.setTickHandler(() => { ticks++; });
    loop.setFrameHandler(() => { frames++; });
    loop.start();
    nowMs = 1;
    frameCallback!(nowMs);
    expect(ticks).toBe(0);
    expect(frames).toBe(0);
  });

  test("frame handler runs after all ticks of the frame", () => {
    const loop = new RafLoop();
    const order: string[] = [];
    loop.setTickHandler(() => { order.push("tick"); });
    loop.setFrameHandler(() => { order.push("frame"); });
    loop.setSpeed(4);
    loop.start();
    nowMs = 100;
    frameCallback!(nowMs);
    expect(order).toEqual([...Array.from({ length: 24 }, () => "tick"), "frame"]);
  });

  test("reset clears the accumulator so no catch-up ticks run after the reset", () => {
    const loop = new RafLoop();
    let ticks = 0;
    loop.setTickHandler(() => { ticks++; });
    loop.start();
    nowMs = 100;
    frameCallback!(nowMs);
    expect(ticks).toBe(6); // 100ms at 1x speed
    loop.reset();
    nowMs = 200;
    frameCallback!(nowMs);
    expect(ticks).toBe(12);
  });

  test("stop cancels the pending frame callback and halts the loop", () => {
    const loop = new RafLoop();
    loop.setTickHandler(() => {});
    loop.start();
    loop.stop();
    expect(cancelCalls).toEqual([7]);
    const ticks: number[] = [];
    loop.setTickHandler((dt) => ticks.push(dt));
    frameCallback!(1000);
    expect(ticks).toHaveLength(0);
  });
});

function restoreGlobal(key: string, value: unknown): void {
  if (value === undefined) delete (globalThis as Record<string, unknown>)[key];
  else (globalThis as Record<string, unknown>)[key] = value;
}
