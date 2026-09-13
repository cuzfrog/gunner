import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("turret configuration", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("weapon system switch shows turret panel", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await expect(page.locator("#ship-a-weapon-system-turret")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-turret-panel")).toBeVisible();
    await expect(page.locator("#ship-a-launcher-panel")).toBeHidden();
  });

  test("change sig resolution updates turret", async () => {
    await page.locator("#ship-a-sig-res-options [data-value='M']").click();
    await expect(page.locator("#ship-a-sig-res-options [data-value='M']")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-sig-res-options [data-value='S']")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#effective-ship-a-tracking")).toBeVisible();
    await page.locator("#ship-a-sig-res-options [data-value='S']").click();
    await expect(page.locator("#ship-a-sig-res-options [data-value='S']")).toHaveAttribute("aria-pressed", "true");
  });

  test("tracking unit toggle switches rad/s to score", async () => {
    await expect(page.locator("#ship-a-tracking-unit-rad")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#ship-a-tracking-unit-score").click();
    await expect(page.locator("#ship-a-tracking-unit-score")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-tracking-unit-rad")).toHaveAttribute("aria-pressed", "false");
    const effectiveTracking = await page.locator("#effective-ship-a-tracking").textContent();
    expect(effectiveTracking).toBeTruthy();
    await page.locator("#ship-a-tracking-unit-rad").click();
    await expect(page.locator("#ship-a-tracking-unit-rad")).toHaveAttribute("aria-pressed", "true");
  });

  test("weapon overload button toggles and increases DPS for long-range turrets", async () => {
    const overloadButton = page.locator("#ship-a-turret-weapon-overload-button");
    await expect(overloadButton).toHaveAttribute("aria-pressed", "false");
    const nominalDpsBefore = await page.locator("#res-nominal-dps-a").textContent();
    expect(nominalDpsBefore).not.toBe("-");
    await overloadButton.click();
    await expect(overloadButton).toHaveAttribute("aria-pressed", "true");
    const nominalDpsAfter = await page.locator("#res-nominal-dps-a").textContent();
    expect(Number(nominalDpsAfter)).toBeGreaterThan(Number(nominalDpsBefore ?? ""));
    await overloadButton.click();
    await expect(overloadButton).toHaveAttribute("aria-pressed", "false");
    const nominalDpsOff = await page.locator("#res-nominal-dps-a").textContent();
    expect(Number(nominalDpsOff)).toBeCloseTo(Number(nominalDpsBefore ?? ""), 1);
  });

  test("ammo popup opens and shows cargo list", async () => {
    await page.locator("#ship-a-ammo-trigger").click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeVisible();
    await expect(page.locator("#ship-a-ammo-cargo-list .ammo-item")).not.toHaveCount(0);
  });

  test("select ammo from cargo updates summary", async () => {
    await page.locator("#ship-a-ammo-cargo-list .ammo-item").first().click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-ammo-summary").textContent();
    expect(summary).not.toBe("");
    await expect(page.locator("#ship-a-ammo-summary-icon")).toBeVisible();
  });

  test("expand all ammo shows full charge list and selecting from it works", async () => {
    await page.locator("#ship-a-ammo-trigger").click();
    await expect(page.locator("#ship-a-ammo-all-section")).toBeHidden();
    await page.locator("#ship-a-ammo-expand").click();
    await expect(page.locator("#ship-a-ammo-all-section")).toBeVisible();
    await expect(page.locator("#ship-a-ammo-all-list .ammo-item")).not.toHaveCount(0);
    await page.locator("#ship-a-ammo-all-list .ammo-item").first().click();
    await expect(page.locator("#ship-a-ammo-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-ammo-summary").textContent();
    expect(summary).toBeTruthy();
  });
});
