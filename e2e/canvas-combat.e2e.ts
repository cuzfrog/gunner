import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, FITTING_CERBERUS, resetSim, BASE_URL } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

let page: Page;

test.describe.serial("canvas combat readouts", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_THRASHER));
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("portrait hp bars are full before start, drain under fire, and restore on reset", async () => {
    test.setTimeout(90000);
    await page.locator("#sim-speed").selectOption("8");
    // Start inside weapon range so the first hit lands without a long approach.
    await page.locator("#initial-distance").fill("8000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await resetSim(page, "8,000 m");
    const shieldBar = page.locator(".portrait-hp-bars-ship-a .portrait-hp-bar-shield");
    await expect(shieldBar).toBeVisible();
    const shieldFill = shieldBar.locator(".portrait-hp-fill");
    await expect.poll(async () => portraitLossPercent(shieldFill)).toBe(0);
    await page.locator("#play").click();
    await expect.poll(async () => portraitLossPercent(shieldFill), { timeout: 45000 }).toBeGreaterThan(5);
    // Pause before resetting: reset does not stop the sim, and an in-range fight
    // would immediately re-engage and damage the ships again after the reset.
    await resetSim(page, "8,000 m");
    await expect.poll(async () => portraitLossPercent(shieldFill)).toBe(0);
  });

  test("missile result cards show when launcher active", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_THRASHER));
    await expect(page.locator("#res-side-a")).toHaveClass(/is-missile/);
    await expect(page.locator("#res-sig-factor-a")).toBeVisible();
    await expect(page.locator("#res-hit-a")).toBeHidden();
    await expect(page.locator("#res-side-b")).toHaveClass(/is-turret/);
    await expect(page.locator("#res-hit-b")).toBeVisible();
    await expect(page.locator("#res-sig-factor-b")).toBeHidden();
  });

});

async function portraitLossPercent(fill: Locator): Promise<number> {
  return fill.evaluate((el) => parseFloat(el.style.width));
}
