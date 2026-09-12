import { test, expect, importFittingViaClipboard, importFittingViaPaste, loadFittingText, FITTING_CURSE_EWAR, FITTING_ISHTAR, FITTING_THRASHER, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("persistence", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("profile with fitted ships persists across page reload", async () => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("PersistTest");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#initial-distance").fill("25000");
    await page.locator("#initial-distance").dispatchEvent("input");
    // Ishtar drone fit computes a negative mwdSigBloomMultiplier; regression guard
    // for the dropped-save bug where read validation rejected freshly written profiles.
    await importFittingViaClipboard(page, "ship-a", loadFittingText(FITTING_ISHTAR));
    await importFittingViaClipboard(page, "ship-b", loadFittingText(FITTING_CURSE_EWAR));
    await page.locator("#profile-save").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#profile-select-label")).toContainText("PersistTest");
    await expect(page.locator("#initial-distance")).toHaveValue("25000");
    // The Ishtar fit restored: the mass input reflects the fitted hull, not the default.
    await expect(page.locator("#ship-a-mass")).not.toHaveValue("1200000");
  });

  test("preferences and saved fittings persist across page reload", async () => {
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.3");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await page.locator("#canvas-settings-trigger").click();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#grid-brightness-slider")).toHaveValue("0.3");
    await expect(page.locator("#grid-brightness-value")).toContainText("30%");
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-saved-list .fitting-item")).toHaveCount(1, { min: 1 });
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });
});
