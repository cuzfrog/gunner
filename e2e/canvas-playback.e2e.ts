import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, FITTING_CERBERUS, BASE_URL } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function loadBothSides(page: Page): Promise<void> {
  await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
  await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_THRASHER));
}

async function resetSim(page: Page): Promise<void> {
  await page.locator("#reset").click();
  await expect(page.locator("#res-distance")).toHaveText("20.0 km");
}

function parseDistance(text: string): number {
  const cleaned = text.replace(/[,]/g, "").trim();
  if (cleaned.includes("km")) return parseFloat(cleaned) * 1000;
  if (cleaned.includes("m")) return parseFloat(cleaned);
  return parseFloat(cleaned.replace(/[^0-9.]/g, ""));
}

let page: Page;

test.describe.serial("canvas settings and playback", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("canvas settings popup opens", async () => {
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeVisible();
    await expect(page.locator("#zoom-slider")).toBeVisible();
    await expect(page.locator("#auto-zoom")).toBeVisible();
    await expect(page.locator("#grid-brightness-slider")).toBeVisible();
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeHidden();
  });

  test("grid brightness slider updates output", async () => {
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.8");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await expect(page.locator("#grid-brightness-value")).toContainText("80%");
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeHidden();
  });

  test("zoom slider updates output and auto-zoom disables it", async () => {
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#auto-zoom")).toBeChecked();
    await expect(page.locator("#zoom-slider")).toBeDisabled();
    await page.locator("#auto-zoom").uncheck();
    await expect(page.locator("#zoom-slider")).toBeEnabled();
    await page.locator("#zoom-slider").fill("2");
    await page.locator("#zoom-slider").dispatchEvent("input");
    await expect(page.locator("#zoom-value")).toContainText("2.00");
    await page.locator("#auto-zoom").check();
    await expect(page.locator("#zoom-slider")).toBeDisabled();
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeHidden();
  });

  test("weapon range button cycles visibility", async () => {
    const button = page.locator("#weapon-range-button");
    await expect(button).toHaveAttribute("data-weapon-range", "both");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await button.click();
    await expect(button).toHaveAttribute("data-weapon-range", "shipA");
    await button.click();
    await expect(button).toHaveAttribute("data-weapon-range", "shipB");
    await button.click();
    await expect(button).toHaveAttribute("data-weapon-range", "none");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("data-weapon-range", "both");
  });

  test("portraits appear and result grid updates during simulation", async () => {
    await loadBothSides(page);
    await expect(page.locator("#ship-a-portrait")).toBeVisible();
    await expect(page.locator("#ship-a-portrait .portrait-image")).toBeVisible();
    await expect(page.locator("#ship-b-portrait")).toBeVisible();
    await expect(page.locator("#ship-b-portrait .portrait-image")).toBeVisible();
    await page.locator("#play").click();
    await expect(page.locator("#res-hit-a")).not.toHaveText("-", { timeout: 15000 });
    await expect(page.locator("#res-hit-a")).not.toHaveText("0%", { timeout: 15000 });
    await expect(page.locator("#res-applied-dps-a")).not.toHaveText("-", { timeout: 15000 });
    await expect(page.locator("#res-nominal-dps-a")).not.toHaveText("-");
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Start");
  });

  test("pause stops simulation", async () => {
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Pause");
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Start");
    const distance1 = await page.locator("#res-distance").textContent();
    await page.waitForTimeout(500);
    const distance2 = await page.locator("#res-distance").textContent();
    expect(distance2).toBe(distance1);
  });

  test("sim speed select changes playback speed", async () => {
    const distance = page.locator("#res-distance");
    await page.locator("#sim-speed").selectOption("8");
    await page.locator("#play").click();
    await expect.poll(async () => parseDistance((await distance.textContent())!), { timeout: 15000 }).toBeLessThan(16000);
    await page.locator("#play").click();
    await resetSim(page);
    await page.locator("#sim-speed").selectOption("0.25");
    await page.locator("#play").click();
    await page.waitForTimeout(800);
    await page.locator("#play").click();
    expect(parseDistance((await distance.textContent())!)).toBeGreaterThan(17000);
    await page.locator("#sim-speed").selectOption("4");
    await resetSim(page);
  });

  test("initial distance input updates starting positions", async () => {
    await page.locator("#initial-distance").fill("30000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#reset").click();
    await expect(page.locator("#res-distance")).toHaveText("30.0 km");
    await page.locator("#initial-distance").fill("20000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await resetSim(page);
  });
});
