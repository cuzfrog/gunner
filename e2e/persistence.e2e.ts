import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, BASE_URL } from "./fixtures";
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

  test("profile persists across page reload", async () => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("PersistTest");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#initial-distance").fill("25000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#profile-save").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#profile-select-label")).toContainText("PersistTest");
    await expect(page.locator("#initial-distance")).toHaveValue("25000");
  });

  test("preferences persist across page reload", async () => {
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.3");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await page.locator("#canvas-settings-trigger").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#grid-brightness-slider")).toHaveValue("0.3");
    await expect(page.locator("#grid-brightness-value")).toContainText("30%");
    await page.locator("#canvas-settings-trigger").click();
  });

  test("saved fitting persists across reload", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-saved-list .fitting-item")).toHaveCount(1, { min: 1 });
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });
});
