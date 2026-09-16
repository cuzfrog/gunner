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
    await expect(hint.locator(".stat-hint-name")).toHaveText("Thrasher");
    await expect(hint.locator(".stat-hint-subtitle")).toContainText("Destroyer");
    const headings = hint.locator(".stat-hint-section-label");
    await expect(headings.nth(0)).toHaveText("Fitting");
    await expect(headings.nth(1)).toHaveText("Navigation");
    await expect(headings.nth(2)).toHaveText("Targeting");
    await expect(headings.nth(3)).toHaveText("Capacitor");
    await expect(headings.nth(4)).toHaveText("Defense");
    await expect(headings.nth(5)).toHaveText("Minmatar Destroyer bonuses (per skill level)");
    await expect(headings.nth(6)).toHaveText("Role Bonus");
    await expect(headings.nth(7)).toHaveText("Resists");
    await expect(hint.locator(".stat-hint-row", { hasText: "High slots" }).locator(".stat-hint-value")).toHaveText("8");
    await expect(hint.locator(".stat-hint-row-statement", { hasText: "5% bonus to Small Projectile Turret damage" })).toBeVisible();
  });

  test("switching hulls updates the hint content", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
    await page.locator("#ship-a-portrait .portrait-image").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint.locator(".stat-hint-name")).toHaveText("Cerberus");
  });

  test("moving the pointer away hides the hint", async () => {
    await page.mouse.move(10, 540);
    await expect(page.locator("#hover-hint")).toBeHidden();
  });
});

test.describe.serial("ship hint geometry", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 990, height: 700 } });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // The hint is capped at --hover-hint-max-width and clamped to the viewport gap on both edges,
  // so the widest hints never overflow horizontally at narrow viewports.
  test("keeps the widest hint inside the viewport at a narrow width", async () => {
    await page.locator("#ship-a-portrait .portrait-image").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    const box = await hint.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(990);
    expect(box!.width).toBeLessThanOrEqual(420);
  });

  test("scrollable hint keeps the thin scrollbar and stays visible at a short height", async () => {
    await page.setViewportSize({ width: 1540, height: 500 });
    await page.locator("#ship-a-portrait .portrait-image").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toHaveClass(/hover-hint-scrollable/);
    await expect(hint).toHaveCSS("scrollbar-width", "thin");
    const box = await hint.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(500);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1540);
  });
});
