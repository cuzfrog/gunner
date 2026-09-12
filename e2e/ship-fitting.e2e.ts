import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("ship selection and fitting", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("ship select popup opens with hull search", async () => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await expect(page.locator("#ship-a-ship-select-popup")).toBeVisible();
    await expect(page.locator("#ship-a-hull")).toBeVisible();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-preset-list .fitting-item")).not.toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });

  test("type hull name loads ship profile", async () => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await page.locator("#ship-a-hull").press("Tab");
    const mass = await page.locator("#ship-a-mass").inputValue();
    expect(mass).not.toBe("1200000");
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });

  test("invalid hull shows error state", async () => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("NonexistentShipXYZ");
    await page.locator("#ship-a-hull").press("Tab");
    await expect(page.locator("#ship-a-hull")).toHaveClass(/hull-invalid/);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });

  test("preset fitting from ship select popup enables the fitting eye", async () => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-preset-list .fitting-item")).not.toHaveCount(0);
    await page.locator("#ship-a-fitting-preset-list .fitting-item").first().click();
    await expect(page.locator("#ship-a-fitting-eye")).toBeEnabled();
  });

  test("fitting eye toggles preview popup", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.locator("#ship-a-fitting-eye").click();
    await expect(page.locator("#ship-a-fitting-preview")).toBeVisible();
    await page.locator("#ship-a-fitting-eye").click();
    await expect(page.locator("#ship-a-fitting-preview")).toBeHidden();
  });

  test("saved fitting appears in list after import and deletes via trash icon", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    const savedList = page.locator("#ship-a-fitting-saved-list");
    await expect(savedList.locator(".fitting-item")).not.toHaveCount(0);
    const initialCount = await savedList.locator(".fitting-item").count();
    await savedList.locator(".fitting-delete").first().click();
    await expect(savedList.locator(".fitting-item")).toHaveCount(initialCount - 1);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-ship-select-popup")).toBeHidden();
  });
});
