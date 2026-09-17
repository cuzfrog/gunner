import { test, expect, BASE_URL, loadFittingText, FITTING_CURSE_EWAR, importFittingViaPaste } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("module hint", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("hovering an ewar module row shows the module stats hint", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_CURSE_EWAR));
    await page.locator("#ship-a-ewar-trigger").click();
    const webButton = page.locator("#ship-a-ewar-section .ewar-row .ewar-module-toggle").first();
    await expect(webButton).toBeVisible();
    await webButton.hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    const effect = hint.locator(".stat-hint-section", { hasText: "Effect" }).first();
    await expect(effect.locator(".stat-hint-row", { hasText: "Max velocity" }).locator(".stat-hint-value")).toHaveText("-55%");
    await expect(effect.locator(".stat-hint-row", { hasText: "Max range" }).locator(".stat-hint-value")).toContainText("km");
    const activation = hint.locator(".stat-hint-section", { hasText: "Activation" }).first();
    await expect(activation.locator(".stat-hint-row", { hasText: "Cycle time" })).toBeVisible();
    await expect(activation.locator(".stat-hint-row", { hasText: "Capacitor need" })).toBeVisible();
  });

  test("hovering the warp scrambler row shows the propulsion statement", async () => {
    const scramblerRow = page.locator("#ship-a-ewar-section .ewar-row", { hasText: "Warp Scrambler" }).first();
    await scramblerRow.locator(".ewar-module-toggle").hover();
    const hint = page.locator("#hover-hint");
    await expect(hint).toBeVisible();
    await expect(hint.locator(".stat-hint-row-emphasis", { hasText: "Disables MWD" })).toBeVisible();
    await expect(hint.locator(".stat-hint-row", { hasText: "Max range" })).toBeVisible();
  });

  test("moving the pointer away hides the module hint", async () => {
    await page.mouse.move(10, 540);
    await expect(page.locator("#hover-hint")).toBeHidden();
    await page.keyboard.press("Escape");
  });
});
