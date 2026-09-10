import { test, expect, loadFittingText, FITTING_THRASHER, FITTING_MERLIN, setClipboardText, getClipboardText } from "./fixtures";

const THRASHER_TEXT = loadFittingText(FITTING_THRASHER);
const MERLIN_TEXT = loadFittingText(FITTING_MERLIN);

test.describe("fitting export", () => {
  test("export button is disabled without a fitting", async ({ cleanPage: page }) => {
    await expect(page.locator("#ship-a-export-fitting")).toBeDisabled();
    await expect(page.locator("#ship-b-export-fitting")).toBeDisabled();
  });

  test("export copies the imported fitting to the clipboard", async ({ cleanPage: page }) => {
    await setClipboardText(page, THRASHER_TEXT);
    await page.locator("#import-profile").click();
    await page.locator("#import-side-ship-a").click();
    await expect(page.locator("#ship-a-fitting-name")).toBeVisible();
    await expect(page.locator("#ship-a-export-fitting")).toBeEnabled();
    await page.locator("#ship-a-export-fitting").click();
    await expect(page.locator("#ship-a-fitting-name")).toHaveText(/Copied/);
    const clipboardText = await getClipboardText(page);
    expect(clipboardText).toContain("[Thrasher, Kitetackle Art Shield Thrasher]");
    expect(clipboardText).toContain("Damage Control II");
  });

  test("export copies the shipB fitting independently", async ({ cleanPage: page }) => {
    await setClipboardText(page, MERLIN_TEXT);
    await page.locator("#import-profile").click();
    await page.locator("#import-side-ship-b").click();
    await expect(page.locator("#ship-b-fitting-name")).toBeVisible();
    await page.locator("#ship-b-export-fitting").click();
    await expect(page.locator("#ship-b-fitting-name")).toHaveText(/Copied/);
    const clipboardText = await getClipboardText(page);
    expect(clipboardText).toContain("[Merlin, Tackle Blaster Shield Merlin]");
  });
});
