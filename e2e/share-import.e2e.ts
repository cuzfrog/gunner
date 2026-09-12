import { test, expect, loadFittingText, FITTING_THRASHER, setClipboardText, getClipboardText, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("share and import", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("copy as URL writes share link to clipboard", async () => {
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    await expect(page.locator("#share-status")).not.toHaveText("");
    const clipboardText = await getClipboardText(page);
    expect(clipboardText).toContain("?c=");
    expect(clipboardText).toContain("localhost");
  });

  test("copy as text writes profile text to clipboard", async () => {
    await page.locator("#share-link").click();
    await page.locator("#share-copy-text").click();
    await expect(page.locator("#share-status")).not.toHaveText("");
    const clipboardText = await getClipboardText(page);
    expect(clipboardText).not.toContain("?c=");
    expect(clipboardText.length).toBeGreaterThan(10);
  });

  test("import applies the fitting to the selected side", async () => {
    const eftText = loadFittingText(FITTING_THRASHER);
    await setClipboardText(page, eftText);
    await page.locator("#import-profile").click();
    await page.locator("#import-side-ship-a").click();
    await expect(page.locator("#ship-a-fitting-name")).toBeVisible();
    await expect(page.locator("#ship-a-turret-panel")).toBeVisible();
    await expect(page.locator("#ship-a-ammo-summary")).not.toHaveText("");
    await setClipboardText(page, eftText);
    await page.locator("#import-profile").click();
    await page.locator("#import-side-ship-b").click();
    await expect(page.locator("#ship-b-fitting-name")).toBeVisible();
    await expect(page.locator("#ship-b-turret-panel")).toBeVisible();
  });

  test("invalid clipboard shows error status", async () => {
    await setClipboardText(page, "this is not a valid fitting or profile");
    await page.locator("#import-profile").click();
    await expect(page.locator("#share-status")).not.toHaveText("");
    await expect(page.locator("#import-side-popup")).toBeHidden();
  });
});
