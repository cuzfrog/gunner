import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, FITTING_ISHTAR } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("portrait effect hint", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1300, height: 700 } });
    page = await context.newPage();
    await page.goto("http://localhost:4321", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ISHTAR));
    await page.locator("#play").click();
    // Let the sim stabilize before hovering: during the first seconds the effect list churns
    // (drones launching, weapons cycling), which would drop the hover before the hint shows.
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("drone weapon icon shows applied DPS and the active drone count", async () => {
    const icon = page.locator("#ship-a-portrait .portrait-effect-icon[data-weapon-kind='drone']");
    await expect(icon).toBeVisible();
    await icon.hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect(hint.locator(".stat-hint-subtitle")).toHaveText("Drones");
    await expect(hint.locator(".stat-hint-row", { hasText: "Active drones" }).locator(".stat-hint-value")).toHaveText(/\d+\/\d+/);
    await expect(hint.locator(".stat-hint-row", { hasText: "Applied DPS" }).locator(".stat-hint-value")).toContainText("DPS");
  });

  // The effect icons sit near the page bottom; the hint must flip above (or fit) instead of
  // opening below the anchor beyond the visible viewport.
  test("tall weapon hint stays inside the viewport at a short height", async () => {
    await page.mouse.move(5, 5);
    await expect(page.locator("#hover-hint")).toBeHidden();
    const icon = page.locator("#ship-a-portrait .portrait-effect-icon[data-weapon-kind='drone']");
    await icon.hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect.poll(async () => {
      const box = await hint.boundingBox();
      if (box === null) return false;
      const viewport = page.viewportSize();
      if (viewport === null) return false;
      return box.y >= 0 && box.y + box.height <= viewport.height;
    }, { timeout: 5000 }).toBe(true);
  });

  test("repairer icon shows layer, repair per second and per cycle", async () => {
    await page.mouse.move(5, 5);
    await expect(page.locator("#hover-hint")).toBeHidden();
    const icon = page.locator("#ship-b-portrait .portrait-effect-icon[data-effect-kind='repairer']").first();
    await expect(icon).toBeVisible();
    await icon.hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect(hint.locator(".stat-hint-subtitle")).toContainText(/Shield|Armor|Hull/);
    await expect(hint.locator(".stat-hint-row", { has: page.locator(".stat-hint-label", { hasText: "HP/s" }) })).toBeVisible();
    await expect(hint.locator(".stat-hint-row", { has: page.locator(".stat-hint-label", { hasText: "HP/cycle" }) })).toBeVisible();
  });
});
