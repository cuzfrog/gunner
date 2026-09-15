import { test, expect, BASE_URL, loadFittingText, FITTING_THRASHER, FITTING_CERBERUS, importFittingViaPaste } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("ship hint", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("hovering the portrait shows the ship profile hint", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.locator("#ship-a-portrait .portrait-image").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect(hint.locator(".ship-hint-name")).toHaveText("Thrasher");
    await expect(hint.locator(".ship-hint-subtitle")).toContainText("Destroyer");
    const headings = hint.locator(".ship-hint-section-label");
    await expect(headings.nth(0)).toHaveText("Fitting");
    await expect(headings.nth(1)).toHaveText("Navigation");
    await expect(headings.nth(2)).toHaveText("Targeting");
    await expect(headings.nth(3)).toHaveText("Capacitor");
    await expect(headings.nth(4)).toHaveText("Defense");
    await expect(headings.nth(5)).toHaveText("Resists");
    await expect(hint.locator(".ship-hint-row", { hasText: "High slots" }).locator(".ship-hint-value")).toHaveText("8");
  });

  test("switching hulls updates the hint content", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
    await page.locator("#ship-a-portrait .portrait-image").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint.locator(".ship-hint-name")).toHaveText("Cerberus");
  });

  test("moving the pointer away hides the hint", async () => {
    await page.mouse.move(10, 540);
    await expect(page.locator("#hover-hint")).toBeHidden();
  });
});
