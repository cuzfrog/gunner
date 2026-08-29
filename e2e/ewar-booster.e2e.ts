import { test, expect, loadFittingText, FITTING_MERLIN, FITTING_CURSE_EWAR } from "./fixtures";
import type { Page } from "@playwright/test";

async function importViaPaste(page: Page, side: "ship-a" | "ship-b", eftText: string): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: () => Promise.reject(new Error("denied")), writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  await page.locator(`#${side}-import-fitting`).click();
  await expect(page.locator(`#${side}-paste-popup`)).toBeVisible();
  await page.locator(`#${side}-paste-input`).evaluate((el, text) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true }));
  }, eftText);
  await expect(page.locator(`#${side}-fitting-name`)).toBeVisible();
}

const ABADDON_WITH_EWAR = `[Abaddon, Test Ewar Booster]

Multispectrum Energized Membrane II
Heat Sink II
Multispectrum Energized Membrane II
Reactive Armor Hardener
1600mm Steel Plates II
1600mm Steel Plates II
Heat Sink II

Optical Compact Tracking Computer, Tracking Speed Script
Heavy F-RX Compact Capacitor Booster, Navy Cap Booster 800
100MN Y-S8 Compact Afterburner
Stasis Webifier I

Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L
Mega Pulse Laser II, Imperial Navy Multifrequency L

Large Trimark Armor Pump I
Large Trimark Armor Pump I
Large Trimark Armor Pump I


Navy Cap Booster 800 x24
Optimal Range Script x1
Conflagration L x2
Conflagration L x6
Scorch L x8`;

test.describe("EWAR and boosters", () => {
  test("EWAR popup opens with module toggles", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeVisible();
    await expect(page.locator("#ship-a-ewar-section")).toBeVisible();
    await expect(page.locator("#ship-a-ewar-section .ewar-module-toggle")).not.toHaveCount(0);
  });

  test("toggle webifier deactivates and updates summary", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-ewar-trigger").click();
    const toggleButton = page.locator("#ship-a-ewar-section .ewar-module-toggle").first();
    const initialState = await toggleButton.getAttribute("aria-pressed");
    await toggleButton.click();
    const newState = await toggleButton.getAttribute("aria-pressed");
    expect(newState).not.toBe(initialState);
  });

  test("toggle overload on EWAR module", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-ewar-trigger").click();
    const overloadButton = page.locator("#ship-a-ewar-section .ewar-overload-button").first();
    await expect(overloadButton).toBeVisible();
    const initialState = await overloadButton.getAttribute("aria-pressed");
    await overloadButton.click();
    const newState = await overloadButton.getAttribute("aria-pressed");
    expect(newState).not.toBe(initialState);
  });

  test("disruptor script popup opens and script selection works", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_CURSE_EWAR));
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeVisible();
    const gearIcon = page.locator("#ship-a-ewar-section .ewar-script-gear").first();
    if (await gearIcon.count() > 0) {
      await gearIcon.click();
      const scriptPopup = page.locator("#ship-a-ewar-script-popup");
      await expect(scriptPopup).toBeVisible();
      const scriptOptions = scriptPopup.locator(".ewar-script-option");
      await expect(scriptOptions).not.toHaveCount(0);
      await scriptOptions.first().click();
      await expect(scriptPopup).toBeHidden();
    }
  });

  test("booster toggle activates tracking computer", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", ABADDON_WITH_EWAR);
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-booster-section")).toBeVisible();
    const toggleButton = page.locator("#ship-a-booster-section .ewar-module-toggle").first();
    const initialState = await toggleButton.getAttribute("aria-pressed");
    await toggleButton.click();
    const newState = await toggleButton.getAttribute("aria-pressed");
    expect(newState).not.toBe(initialState);
  });

  test("booster script selection works", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", ABADDON_WITH_EWAR);
    await page.locator("#ship-a-ewar-trigger").click();
    const gearIcon = page.locator("#ship-a-booster-section .ewar-script-gear").first();
    if (await gearIcon.count() > 0) {
      await gearIcon.click();
      const scriptPopup = page.locator("#ship-a-booster-script-popup");
      await expect(scriptPopup).toBeVisible();
      const scriptOptions = scriptPopup.locator(".ewar-script-option");
      await expect(scriptOptions).not.toHaveCount(0);
      await scriptOptions.first().click();
      await expect(scriptPopup).toBeHidden();
    }
  });

  test("range overlay chips appear when EWAR active", async ({ cleanPage: page }) => {
    const legend = page.locator("#range-overlay-legend");
    const initialChips = await legend.locator(".range-overlay-chip").count();
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.waitForTimeout(200);
    const ewarChips = await legend.locator(".range-overlay-chip").count();
    expect(ewarChips).toBeGreaterThan(initialChips);
  });

  test("clicking range overlay chip cycles visibility", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-ewar-trigger").click();
    const toggleButton = page.locator("#ship-a-ewar-section .ewar-module-toggle").first();
    await toggleButton.click();
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeHidden();
    await page.waitForTimeout(200);
    const ewarChip = page.locator("#range-overlay-legend .range-overlay-chip:not(.weapon-range-chip)").first();
    await expect(ewarChip).toBeVisible();
    const initialState = await ewarChip.getAttribute("aria-pressed");
    await ewarChip.click();
    const newState = await ewarChip.getAttribute("aria-pressed");
    expect(newState).not.toBe(initialState);
  });
});
