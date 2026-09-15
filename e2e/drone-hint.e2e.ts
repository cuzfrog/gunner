import { test, expect, BASE_URL, loadFittingText, FITTING_ISHTAR, importFittingViaPaste } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("drone hint", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("hovering a drone catalog item shows the drone stats hint", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_ISHTAR));
    await page.locator("#ship-a-drone-trigger").click();
    const catalogItem = page.locator("#ship-a-drone-catalog-light .drone-catalog-item").first();
    await expect(catalogItem).toBeVisible();
    await catalogItem.hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    const damage = hint.locator(".stat-hint-section", { hasText: "Damage" }).first();
    await expect(damage.locator(".stat-hint-row", { hasText: "Total" }).locator(".stat-hint-value")).not.toHaveText("0");
    await expect(damage.locator(".stat-hint-row", { hasText: "Cycle time" }).locator(".stat-hint-value")).toContainText("s");
    const targeting = hint.locator(".stat-hint-section", { hasText: "Targeting" });
    await expect(targeting.locator(".stat-hint-row", { hasText: "Optimal range" })).toBeVisible();
    const fit = hint.locator(".stat-hint-section", { hasText: "Fit" });
    await expect(fit.locator(".stat-hint-row", { hasText: "Drone bandwidth" })).toBeVisible();
  });

  test("moving the pointer away hides the drone hint", async () => {
    await page.mouse.move(10, 540);
    await expect(page.locator("#hover-hint")).toBeHidden();
    await page.keyboard.press("Escape");
  });
});
