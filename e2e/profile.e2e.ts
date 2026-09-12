import { test, expect, importFittingViaPaste, loadFittingText, FITTING_THRASHER, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("profile management", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("create profiles via popup and load a different one", async () => {
    await page.locator("#profile-new").click();
    await expect(page.locator("#new-profile-popup")).toBeVisible();
    await page.locator("#new-profile-name").fill("ProfileA");
    await page.locator("#new-profile-confirm").click();
    await expect(page.locator("#profile-select-label")).toContainText("ProfileA");
    await page.locator("#initial-distance").fill("10000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#profile-save").click();
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("ProfileB");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#initial-distance").fill("30000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#profile-save").click();
    await page.locator("#profile-select-trigger").click();
    await expect(page.locator("#profile-popup .profile-menu-item", { hasText: "ProfileA" })).toBeVisible();
    await page.locator("#profile-popup .profile-menu-item", { hasText: "ProfileA" }).click();
    await expect(page.locator("#initial-distance")).toHaveValue("10000");
    await page.locator("#profile-select-trigger").click();
    await page.locator("#profile-popup .profile-menu-item", { hasText: "ProfileB" }).click();
    await expect(page.locator("#initial-distance")).toHaveValue("30000");
    await page.locator("#profile-select-trigger").click();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#profile-popup")).toBeHidden();
  });

  test("dirty state tracking shows unsaved indicator", async () => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("DirtyTest");
    await page.locator("#new-profile-confirm").click();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.locator("#ship-a-speed").fill("500");
    await page.locator("#ship-a-speed").dispatchEvent("input");
    await expect(page.locator("#profile-save")).toBeEnabled();
    await page.locator("#profile-save").click();
    await expect(page.locator("#profile-save")).toBeDisabled();
  });

  test("delete profile removes it; cancel confirm preserves it", async () => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("DeleteMe");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#profile-delete").click();
    await expect(page.locator("#confirm-popup")).toBeVisible();
    await expect(page.locator("#confirm-message")).toBeVisible();
    await page.locator("#confirm-ok").click();
    await expect(page.locator("#confirm-popup")).toBeHidden();
    await page.locator("#profile-select-trigger").click();
    await expect(page.locator("#profile-popup .profile-menu-item", { hasText: "DeleteMe" })).toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#profile-popup")).toBeHidden();

    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("KeepMe");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#profile-delete").click();
    await expect(page.locator("#confirm-popup")).toBeVisible();
    await page.locator("#confirm-cancel").click();
    await expect(page.locator("#confirm-popup")).toBeHidden();
    await page.locator("#profile-select-trigger").click();
    await expect(page.locator("#profile-popup .profile-menu-item", { hasText: "KeepMe" })).toBeVisible();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#profile-popup")).toBeHidden();
  });

  test("clear session with confirm dialog restores defaults", async () => {
    await page.locator("#initial-distance").fill("99999");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#profile-new").click();
    await expect(page.locator("#new-profile-popup")).toBeVisible();
    await page.locator("#new-profile-clear-session").click();
    await expect(page.locator("#confirm-popup")).toBeVisible();
    await page.locator("#confirm-ok").click();
    await expect(page.locator("#confirm-popup")).toBeHidden();
    await expect(page.locator("#initial-distance")).toHaveValue("20000");
  });
});
