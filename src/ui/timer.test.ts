import { DefaultTimer } from "./timer";

describe("DefaultTimer", () => {
  test("setTimeout schedules a callback", async () => {
    const timer = new DefaultTimer();
    let called = false;
    timer.setTimeout(() => {
      called = true;
    }, 0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(called).toBe(true);
  });

  test("clearTimeout cancels a callback", async () => {
    const timer = new DefaultTimer();
    let called = false;
    const id = timer.setTimeout(() => {
      called = true;
    }, 0);
    timer.clearTimeout(id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(called).toBe(false);
  });

  test("setInterval schedules recurring callbacks", async () => {
    const timer = new DefaultTimer();
    let count = 0;
    const id = timer.setInterval(() => {
      count++;
    }, 10);
    await new Promise((resolve) => setTimeout(resolve, 50));
    timer.clearInterval(id);
    expect(count).toBeGreaterThan(0);
  });

  test("clearInterval stops recurring callbacks", async () => {
    const timer = new DefaultTimer();
    let count = 0;
    const id = timer.setInterval(() => {
      count++;
    }, 10);
    timer.clearInterval(id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(count).toBe(0);
  });
});
