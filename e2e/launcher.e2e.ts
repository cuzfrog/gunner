import { test, expect, loadFittingText, FITTING_CERBERUS } from "./fixtures";
import type { Page } from "@playwright/test";

async function loadCerberus(page: Page): Promise<void> {
  const eftText = loadFittingText(FITTING_CERBERUS);
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

test.describe("launcher configuration", () => {
  test("weapon system switch to missile shows launcher panel", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    await expect(page.locator("#ship-a-weapon-system-missile")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-launcher-panel")).toBeVisible();
    await expect(page.locator("#ship-a-turret-panel")).toBeHidden();
  });

  test("launcher class selector shows allowed classes", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    const classOptions = page.locator("#ship-a-launcher-class-options");
    await expect(classOptions.locator("button")).not.toHaveCount(0);
  });

  test("change launcher class updates stats", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    const initialVolley = await page.locator("#ship-a-launcher-volley-damage").textContent();
    expect(initialVolley).toBeTruthy();
    const classButtons = page.locator("#ship-a-launcher-class-options button");
    const count = await classButtons.count();
    if (count > 1) {
      await classButtons.nth(1).click();
      const newVolley = await page.locator("#ship-a-launcher-volley-damage").textContent();
      expect(newVolley).toBeTruthy();
    }
  });

  test("missile ammo popup opens and lists missiles", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    await page.locator("#ship-a-launcher-ammo-trigger").click();
    await expect(page.locator("#ship-a-launcher-ammo-popup")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-ammo-list .launcher-ammo-item")).not.toHaveCount(0);
  });

  test("select missile updates summary", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    await page.locator("#ship-a-launcher-ammo-trigger").click();
    await page.locator("#ship-a-launcher-ammo-list .launcher-ammo-item").first().click();
    await expect(page.locator("#ship-a-launcher-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-launcher-ammo-summary").textContent();
    expect(summary).toBeTruthy();
    expect(summary).not.toBe("");
    await expect(page.locator("#ship-a-launcher-ammo-summary-icon")).toBeVisible();
  });

  test("attributes popup shows advanced missile stats", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    await page.locator("#ship-a-launcher-attributes-trigger").click();
    await expect(page.locator("#ship-a-launcher-attributes-popup")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-damage-reduction-factor")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-missile-velocity")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-flight-time")).toBeVisible();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-launcher-attributes-popup")).toBeHidden();
  });

  test("drone button is disabled", async ({ cleanPage: page }) => {
    await expect(page.locator("#ship-a-weapon-system-drone")).toBeDisabled();
  });

  test("weapon overload button toggles and increases launcher DPS", async ({ cleanPage: page }) => {
    await loadCerberus(page);
    const overloadButton = page.locator("#ship-a-launcher-weapon-overload-button");
    await expect(overloadButton).toHaveAttribute("aria-pressed", "false");
    const nominalDpsBefore = await page.locator("#res-nominal-dps-a").textContent();
    expect(nominalDpsBefore).not.toBe("-");
    await overloadButton.click();
    await expect(overloadButton).toHaveAttribute("aria-pressed", "true");
    const nominalDpsAfter = await page.locator("#res-nominal-dps-a").textContent();
    expect(nominalDpsAfter).not.toBe("-");
    expect(Number(nominalDpsAfter)).toBeGreaterThan(Number(nominalDpsBefore));
  });
});
