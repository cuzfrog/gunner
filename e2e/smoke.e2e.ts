import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("page loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page.locator("#scene")).toBeVisible();
    await expect(page.locator(".app-header")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("both side panels render", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".side-panel-ship-a")).toBeVisible();
    await expect(page.locator(".side-panel-ship-b")).toBeVisible();
  });

  test("play button is present and labeled Start", async ({ page }) => {
    await page.goto("/");
    const playButton = page.locator("#play");
    await expect(playButton).toBeVisible();
    await expect(playButton).toHaveText("Start");
  });

  test("language switch works", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator("#lang-zh").click();
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#lang-en").click();
  });

  test("ship select popup opens", async ({ page }) => {
    await page.goto("/");
    const trigger = page.locator("#ship-a-ship-select-trigger");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await page.waitForTimeout(300);
    const popup = page.locator("#ship-a-ship-select-popup");
    await expect(popup).toBeVisible();
  });
});
