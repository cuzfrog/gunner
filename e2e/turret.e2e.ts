import { test, expect, loadFittingText, FITTING_THRASHER } from "./fixtures";
import type { Page } from "@playwright/test";

async function loadThrasher(page: Page): Promise<void> {
  const eftText = loadFittingText(FITTING_THRASHER);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: () => Promise.reject(new Error("denied")), writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  await page.locator("#ship-a-import-fitting").click();
  await expect(page.locator("#ship-a-paste-popup")).toBeVisible();
  await page.locator("#ship-a-paste-input").evaluate((el, text) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true }));
  }, eftText);
  await expect(page.locator("#ship-a-fitting-name")).toBeVisible();
}

test.describe("turret configuration", () => {
  test("weapon system switch shows turret panel", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await expect(page.locator("#ship-a-weapon-system-turret")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-turret-panel")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-panel")).toBeHidden();
  });

  test("change sig resolution updates turret", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-sig-res-options [data-value='M']").click();
    await expect(page.locator("#ship-a-sig-res-options [data-value='M']")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-sig-res-options [data-value='S']")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#effective-ship-a-tracking")).toBeVisible();
  });

  test("tracking input updates effective tracking", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-tracking").fill("0.5");
    await page.locator("#ship-a-tracking").dispatchEvent("input");
    const effectiveTracking = await page.locator("#effective-ship-a-tracking").textContent();
    expect(effectiveTracking).toBeTruthy();
    expect(effectiveTracking).not.toBe("");
  });

  test("tracking unit toggle switches rad/s to score", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await expect(page.locator("#ship-a-tracking-unit-rad")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#ship-a-tracking-unit-score").click();
    await expect(page.locator("#ship-a-tracking-unit-score")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-tracking-unit-rad")).toHaveAttribute("aria-pressed", "false");
    const effectiveTracking = await page.locator("#effective-ship-a-tracking").textContent();
    expect(effectiveTracking).toBeTruthy();
  });

  test("optimal and falloff inputs update effective values", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-optimal").fill("8000");
    await page.locator("#ship-a-optimal").dispatchEvent("input");
    await page.locator("#ship-a-falloff").fill("3000");
    await page.locator("#ship-a-falloff").dispatchEvent("input");
    const effectiveOptimal = await page.locator("#effective-ship-a-optimal").textContent();
    const effectiveFalloff = await page.locator("#effective-ship-a-falloff").textContent();
    expect(effectiveOptimal).toBeTruthy();
    expect(effectiveFalloff).toBeTruthy();
  });

  test("ammo popup opens and shows cargo list", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-ammo-trigger").click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeVisible();
    await expect(page.locator("#ship-a-ammo-cargo-list .ammo-item")).not.toHaveCount(0);
  });

  test("select ammo from cargo updates summary", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-ammo-trigger").click();
    await page.locator("#ship-a-ammo-cargo-list .ammo-item").first().click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-ammo-summary").textContent();
    expect(summary).toBeTruthy();
    expect(summary).not.toBe("");
    await expect(page.locator("#ship-a-ammo-summary-icon")).toBeVisible();
  });

  test("expand all ammo shows full charge list", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-ammo-trigger").click();
    await expect(page.locator("#ship-a-ammo-all-section")).toBeHidden();
    await page.locator("#ship-a-ammo-expand").click();
    await expect(page.locator("#ship-a-ammo-all-section")).toBeVisible();
    await expect(page.locator("#ship-a-ammo-all-list .ammo-item")).not.toHaveCount(0);
  });

  test("select ammo from all-ammo list", async ({ cleanPage: page }) => {
    await loadThrasher(page);
    await page.locator("#ship-a-ammo-trigger").click();
    await page.locator("#ship-a-ammo-expand").click();
    await expect(page.locator("#ship-a-ammo-all-section")).toBeVisible();
    await page.locator("#ship-a-ammo-all-list .ammo-item").first().click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-ammo-summary").textContent();
    expect(summary).toBeTruthy();
  });
});
