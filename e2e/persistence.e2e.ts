import { test, expect, loadFittingText, FITTING_THRASHER, getClipboardText, importFittingViaClipboard } from "./fixtures";

test.describe("persistence", () => {
  test("profile persists across page reload", async ({ cleanPage: page }) => {
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("PersistTest");
    await page.locator("#new-profile-confirm").click();
    await page.locator("#initial-distance").fill("25000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#profile-save").click();
    await page.reload();
    await expect(page.locator("#profile-select-label")).toContainText("PersistTest");
    await expect(page.locator("#initial-distance")).toHaveValue("25000");
  });

  test("preferences persist across page reload", async ({ cleanPage: page }) => {
    await page.locator("#lang-zh").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.3");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await page.locator("#canvas-settings-trigger").click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#grid-brightness-slider")).toHaveValue("0.3");
    await expect(page.locator("#grid-brightness-value")).toContainText("30%");
  });

  test("saved fitting persists across reload", async ({ cleanPage: page }) => {
    const eftText = loadFittingText(FITTING_THRASHER);
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { readText: () => Promise.reject(new Error("denied")), writeText: () => Promise.resolve() },
        configurable: true,
      });
    });
    await page.locator("#ship-a-import-fitting").click();
    await expect(page.locator("#ship-a-paste-popup")).toBeVisible();
    await page.locator("#ship-a-paste-input").evaluate((el, text) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true }));
    }, eftText);
    await expect(page.locator("#ship-a-fitting-name")).toBeVisible();
    await page.reload();
    await page.locator("#ship-a-ship-select-trigger").click();
    await page.locator("#ship-a-hull").fill("Thrasher");
    await expect(page.locator("#ship-a-fitting-saved-list .fitting-item")).toHaveCount(1, { min: 1 });
  });

  test("share URL restores profile on navigation", async ({ cleanPage: page }) => {
    await page.locator("#initial-distance").fill("18000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    expect(shareUrl).toContain("?c=");
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl);
    await expect(newPage.locator("#initial-distance")).toHaveValue("18000");
    await newPage.close();
  });

  test("share URL does not include display preferences", async ({ cleanPage: page }) => {
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
    const settings = JSON.parse(decoded);
    expect(settings.language).toBeUndefined();
    expect(settings.gridBrightness).toBeUndefined();
    expect(settings.autoZoom).toBeUndefined();
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl);
    const lang = await newPage.locator("html").getAttribute("lang");
    expect(lang).not.toBe("zh");
    await newPage.close();
  });

  test("weapon overload state persists across page reload via share URL", async ({ cleanPage: page }) => {
    const eftText = loadFittingText(FITTING_THRASHER);
    await importFittingViaClipboard(page, "ship-a", eftText);
    await page.locator("#ship-a-turret-weapon-overload-button").click();
    await expect(page.locator("#ship-a-turret-weapon-overload-button")).toHaveAttribute("aria-pressed", "true");
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl);
    await expect(newPage.locator("#ship-a-turret-weapon-overload-button")).toHaveAttribute("aria-pressed", "true");
    await newPage.close();
  });
});
