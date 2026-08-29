import { test, expect } from "./fixtures";

test.describe("profile management", () => {
  test("create new profile via new-profile popup", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await expect(page.locator("#new-profile-popup")).toBeVisible();
    await page.locator("#new-profile-name").fill("TestProfile1");
    await page.locator("#new-profile-confirm").click();
    await expect(page.locator("#profile-select-label")).toContainText("TestProfile1");
    await page.locator("#profile-select-trigger").click();
    await expect(page.locator("#profile-popup")).toBeVisible();
    await expect(page.locator("#profile-popup .profile-menu-item")).toContainText("TestProfile1");
  });

  test("save updates to existing profile", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("SaveTest");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#initial-distance").fill("15000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await expect(page.locator("#profile-save")).toBeEnabled();
    await page.locator("#profile-save").click();
    await page.reload();
    await expect(page.locator("#initial-distance")).toHaveValue("15000");
    await expect(page.locator("#profile-select-label")).toContainText("SaveTest");
  });

  test("dirty state tracking shows unsaved indicator", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("DirtyTest");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#ship-a-speed").fill("500");
    await page.locator("#ship-a-speed").dispatchEvent("input");
    await expect(page.locator("#profile-save")).toBeEnabled();
    await page.locator("#profile-save").click();
    await expect(page.locator("#profile-save")).toBeDisabled();
  });

  test("load a different profile", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("ProfileA");
    await page.locator("#new-profile-confirm").click();
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
    await page.locator("#profile-popup .profile-menu-item", { hasText: "ProfileA" }).click();
    await expect(page.locator("#initial-distance")).toHaveValue("10000");
    await page.locator("#profile-select-trigger").click();
    await page.locator("#profile-popup .profile-menu-item", { hasText: "ProfileB" }).click();
    await expect(page.locator("#initial-distance")).toHaveValue("30000");
  });

  test("delete profile with confirm dialog", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("DeleteMe");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#profile-delete").click();
    await expect(page.locator("#confirm-popup")).toBeVisible();
    await expect(page.locator("#confirm-message")).toBeVisible();
    await page.locator("#confirm-ok").click();
    await expect(page.locator("#confirm-popup")).toBeHidden();
    await page.locator("#profile-select-trigger").click();
    const items = page.locator("#profile-popup .profile-menu-item", { hasText: "DeleteMe" });
    await expect(items).toHaveCount(0);
  });

  test("cancel confirm dialog preserves profile", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("KeepMe");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#profile-delete").click();
    await expect(page.locator("#confirm-popup")).toBeVisible();
    await page.locator("#confirm-cancel").click();
    await expect(page.locator("#confirm-popup")).toBeHidden();
    await page.locator("#profile-select-trigger").click();
    await expect(page.locator("#profile-popup .profile-menu-item", { hasText: "KeepMe" })).toBeVisible();
  });

  test("clear session with confirm dialog restores defaults", async ({ cleanPage: page }) => {
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
