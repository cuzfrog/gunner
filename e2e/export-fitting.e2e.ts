import { test, expect, loadFittingText, FITTING_THRASHER, FITTING_MERLIN, setClipboardText, getClipboardText, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

const THRASHER_TEXT = loadFittingText(FITTING_THRASHER);
const MERLIN_TEXT = loadFittingText(FITTING_MERLIN);

let page: Page;

test.describe.serial("fitting export", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("export copies the imported fitting to the clipboard", async () => {
    await expect(page.locator("#ship-a-export-fitting")).toBeDisabled();
    await expect(page.locator("#ship-b-export-fitting")).toBeDisabled();
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

  test("export copies the shipB fitting independently", async () => {
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
