import { test, expect } from "./fixtures";

test.describe("language switching", () => {
  test("switch to Chinese updates html lang and UI text", async ({ cleanPage: page }) => {
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(page.locator("#play")).not.toHaveText("Start");
    await expect(page.locator("[data-i18n='label.initialDistance']")).not.toHaveText("Initial distance");
  });

  test("switch to Japanese updates html lang and UI text", async ({ cleanPage: page }) => {
    await page.locator("#lang-ja").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("#play")).not.toHaveText("Start");
  });

  test("switch back to English restores text", async ({ cleanPage: page }) => {
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#lang-en").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#play")).toHaveText("Start");
    await expect(page.locator("[data-i18n='label.initialDistance']")).toHaveText("Initial distance");
  });

  test("hull datalist repopulates on language change", async ({ cleanPage: page }) => {
    await page.locator("#ship-a-ship-select-trigger").click();
    await expect(page.locator("#ship-a-ship-select-popup")).toBeVisible();
    await page.locator("#ship-a-hull").fill("Abaddon");
    await expect(page.locator("#ship-a-hull")).toHaveValue("Abaddon");
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await expect(page.locator("#ship-a-hull")).not.toHaveValue("");
    const optionCount = await page.locator("#hull-options option").count();
    expect(optionCount).toBeGreaterThan(0);
  });
});
