import { test, expect, loadFittingText, importFittingViaClipboard, FITTING_THRASHER, getClipboardText, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("share URL", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("share URL restores profile on navigation", async () => {
    await page.locator("#initial-distance").fill("18000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    expect(shareUrl).toContain("?c=");
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await expect(newPage.locator("#initial-distance")).toHaveValue("18000");
    await newPage.close();
  });

  test("share URL does not include display preferences", async () => {
    await page.locator("#lang-zh").click();
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.9");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    const url = new URL(shareUrl);
    const encoded = url.searchParams.get("c");
    expect(encoded).toBeTruthy();
    const decoded = Buffer.from(encoded!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const settings = JSON.parse(decoded) as { language?: string; gridBrightness?: number; autoZoom?: boolean };
    expect(settings.language).toBeUndefined();
    expect(settings.gridBrightness).toBeUndefined();
    expect(settings.autoZoom).toBeUndefined();
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    const lang = await newPage.locator("html").getAttribute("lang");
    expect(lang).not.toBe("zh");
    await newPage.close();
  });

  test("weapon overload state persists across page reload via share URL", async () => {
    await importFittingViaClipboard(page, "ship-a", loadFittingText(FITTING_THRASHER));
    await page.locator("#ship-a-turret-weapon-overload-button").click();
    await expect(page.locator("#ship-a-turret-weapon-overload-button")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await expect(newPage.locator("#ship-a-turret-weapon-overload-button")).toHaveAttribute("aria-pressed", "true");
    await newPage.close();
  });
});
