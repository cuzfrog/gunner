import { test, expect } from "./fixtures";
import { readFileSync } from "node:fs";

test.describe("page load", () => {
  test("page loads without console errors", async ({ rawPage: page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page.locator("#scene")).toBeVisible();
    await expect(page.locator(".app-header")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("default control values are present", async ({ cleanPage: page }) => {
    await expect(page.locator("#ship-a-tracking")).toHaveValue("0.32");
    await expect(page.locator("#ship-a-optimal")).toHaveValue("5000");
    await expect(page.locator("#ship-a-falloff")).toHaveValue("5000");
    await expect(page.locator("#ship-a-speed")).toHaveValue("0");
    await expect(page.locator("#ship-a-mass")).toHaveValue("1200000");
    await expect(page.locator("#ship-a-inertia")).toHaveValue("3");
    await expect(page.locator("#ship-a-sig")).toHaveValue("40");
    await expect(page.locator("#ship-a-range")).toHaveValue("5000");
    await expect(page.locator("#ship-b-speed")).toHaveValue("1000");
    await expect(page.locator("#ship-b-mass")).toHaveValue("10000000");
    await expect(page.locator("#ship-b-inertia")).toHaveValue("0.45");
    await expect(page.locator("#initial-distance")).toHaveValue("20000");
    await expect(page.locator("#sim-speed")).toHaveValue("4");
    await expect(page.locator("#ship-a-mode")).toHaveValue("keepAtRange");
    await expect(page.locator("#ship-b-mode")).toHaveValue("orbit");
  });

  test("result grid shows initial placeholders", async ({ cleanPage: page }) => {
    await expect(page.locator("#res-distance")).toHaveText("20.0 km");
    await expect(page.locator("#res-applied-dps-a")).toHaveText("-");
    await expect(page.locator("#res-actual-dps-a")).toHaveText("-");
    await expect(page.locator("#res-nominal-dps-a")).toHaveText("-");
    await expect(page.locator("#res-side-a")).toHaveClass(/is-turret/);
    await expect(page.locator("#res-hit-a")).toBeVisible();
    await expect(page.locator("#res-sig-factor-a")).toBeHidden();
    await expect(page.locator("#res-hit-a")).toHaveText("-");
  });

  test("both side panels and canvas frame render", async ({ cleanPage: page }) => {
    await expect(page.locator(".side-panel-ship-a")).toBeVisible();
    await expect(page.locator(".side-panel-ship-b")).toBeVisible();
    await expect(page.locator(".canvas-frame")).toBeVisible();
    await expect(page.locator(".profile-bar")).toBeVisible();
    await expect(page.locator(".result-grid")).toBeVisible();
    await expect(page.locator(".app-footer")).toBeVisible();
  });

  test("app version matches package.json", async ({ cleanPage: page }) => {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    await expect(page.locator("#app-version")).toHaveText(`v${pkg.version}`);
  });
});
