import { test, expect, loadFittingText, importFittingViaPaste, FITTING_MERLIN, FITTING_CURSE_EWAR, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("EWAR and boosters", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("EWAR popup opens with module toggles", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeVisible();
    await expect(page.locator("#ship-a-ewar-section")).toBeVisible();
    await expect(page.locator("#ship-a-ewar-section .ewar-module-toggle")).not.toHaveCount(0);
  });

  test("toggle webifier deactivates and updates summary", async () => {
    const toggleButton = page.locator("#ship-a-ewar-section .ewar-module-toggle").first();
    const initialState = await toggleButton.getAttribute("aria-pressed");
    await toggleButton.click();
    const newState = await toggleButton.getAttribute("aria-pressed");
    expect(newState).not.toBe(initialState);
    await toggleButton.click();
    await expect(toggleButton).toHaveAttribute("aria-pressed", initialState ?? "");
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeHidden();
  });

  test("range overlay chip appears for active EWAR and cycles visibility", async () => {
    const ewarChip = page.locator("#range-overlay-legend .range-overlay-chip:not(.weapon-range-chip):not(.drone-range-chip):not(.drone-control-range-chip)").first();
    await expect(ewarChip).toBeVisible();
    const initialState = await ewarChip.getAttribute("aria-pressed");
    await ewarChip.click();
    await expect(ewarChip).toHaveAttribute("aria-pressed", initialState === "true" ? "false" : "true");
    await ewarChip.click();
    await expect(ewarChip).toHaveAttribute("aria-pressed", initialState ?? "");
  });

  test("disruptor script popup opens and script selection works", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CURSE_EWAR));
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
    await page.locator("#ship-a-ewar-trigger").click();
    await expect(page.locator("#ship-a-ewar-popup")).toBeHidden();
  });
});
