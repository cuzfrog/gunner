import { test, expect, loadFittingText, FITTING_THRASHER } from "./fixtures";
import type { Page } from "@playwright/test";

async function importThrasher(page: Page): Promise<void> {
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

test.describe("ship selection and fitting", () => {
  test("ship select popup opens with hull search", async ({ cleanPage: page }) => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await expect(page.locator("#ship-a-ship-select-popup")).toBeVisible();
    await expect(page.locator("#ship-a-hull")).toBeVisible();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-preset-list .fitting-item")).not.toHaveCount(0);
  });

  test("type hull name loads ship profile", async ({ cleanPage: page }) => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await page.locator("#ship-a-hull").press("Tab");
    const mass = await page.locator("#ship-a-mass").inputValue();
    expect(mass).not.toBe("1200000");
  });

  test("invalid hull shows error state", async ({ cleanPage: page }) => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("NonexistentShipXYZ");
    await page.locator("#ship-a-hull").press("Tab");
    await expect(page.locator("#ship-a-hull")).toHaveClass(/hull-invalid/);
  });

  test("clear hull input resets side", async ({ cleanPage: page }) => {
    await importThrasher(page);
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("");
    await page.locator("#ship-a-hull").press("Tab");
    await expect(page.locator("#play")).toBeDisabled();
  });

  test("select preset fitting from ship select popup", async ({ cleanPage: page }) => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-preset-list .fitting-item")).not.toHaveCount(0);
    await page.locator("#ship-a-fitting-preset-list .fitting-item").first().click();
    await expect(page.locator("#ship-a-fitting-eye")).toBeEnabled();
  });

  test("fitting eye toggles preview popup", async ({ cleanPage: page }) => {
    await importThrasher(page);
    await page.locator("#ship-a-fitting-eye").click();
    await expect(page.locator("#ship-a-fitting-preview")).toBeVisible();
    await page.locator("#ship-a-fitting-eye").click();
    await expect(page.locator("#ship-a-fitting-preview")).toBeHidden();
  });

  test("saved fitting appears in list after import", async ({ cleanPage: page }) => {
    await importThrasher(page);
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-saved-list .fitting-item")).not.toHaveCount(0);
  });

  test("delete saved fitting via trash icon", async ({ cleanPage: page }) => {
    await importThrasher(page);
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    const savedList = page.locator("#ship-a-fitting-saved-list");
    await expect(savedList.locator(".fitting-item")).not.toHaveCount(0);
    const initialCount = await savedList.locator(".fitting-item").count();
    await savedList.locator(".fitting-delete").first().click();
    await expect(savedList.locator(".fitting-item")).toHaveCount(initialCount - 1);
  });
});
