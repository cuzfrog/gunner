import { test, expect, loadFittingText, importFittingViaPaste, FITTING_CERBERUS, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("launcher configuration", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("weapon system switch to missile shows launcher panel", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
    await page.locator("#ship-a-weapon-system-missile").click();
    await expect(page.locator("#ship-a-weapon-system-missile")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-launcher-panel")).toBeVisible();
    await expect(page.locator("#ship-a-turret-panel")).toBeHidden();
  });

  test("launcher class selector shows allowed classes", async () => {
    await expect(page.locator("#ship-a-launcher-class-options").locator("button")).not.toHaveCount(0);
  });

  test("missile ammo popup opens and lists missiles", async () => {
    await page.locator("#ship-a-launcher-ammo-trigger").click();
    await expect(page.locator("#ship-a-launcher-ammo-popup")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-ammo-list .launcher-ammo-item")).not.toHaveCount(0);
  });

  test("select missile updates summary", async () => {
    await page.locator("#ship-a-launcher-ammo-list .launcher-ammo-item").first().click();
    await expect(page.locator("#ship-a-launcher-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-launcher-ammo-summary").textContent();
    expect(summary).not.toBe("");
    await expect(page.locator("#ship-a-launcher-ammo-summary-icon")).toBeVisible();
  });

  test("attributes popup shows advanced missile stats", async () => {
    await page.locator("#ship-a-launcher-attributes-trigger").click();
    await expect(page.locator("#ship-a-launcher-attributes-popup")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-damage-reduction-factor")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-missile-velocity")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-flight-time")).toBeVisible();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-launcher-attributes-popup")).toBeHidden();
  });

  test("drone button is enabled alongside turret and missile", async () => {
    await expect(page.locator("#ship-a-weapon-system-drone")).toBeEnabled();
  });

  test("weapon overload button toggles and increases launcher DPS", async () => {
    const overloadButton = page.locator("#ship-a-launcher-weapon-overload-button");
    await expect(overloadButton).toHaveAttribute("aria-pressed", "false");
    const nominalDpsBefore = await page.locator("#res-nominal-dps-a").textContent();
    expect(nominalDpsBefore).not.toBe("-");
    await overloadButton.click();
    await expect(overloadButton).toHaveAttribute("aria-pressed", "true");
    const nominalDpsAfter = await page.locator("#res-nominal-dps-a").textContent();
    expect(Number(nominalDpsAfter)).toBeGreaterThan(Number(nominalDpsBefore ?? ""));
    await overloadButton.click();
    await expect(overloadButton).toHaveAttribute("aria-pressed", "false");
  });
});
