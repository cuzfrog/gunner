import { test, expect, loadFittingText, FITTING_THRASHER, FITTING_CERBERUS } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function importViaPaste(page: Page, side: "ship-a" | "ship-b", eftText: string): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: () => Promise.reject(new Error("denied")), writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  await page.locator(`#${side}-import-fitting`).click();
  await expect(page.locator(`#${side}-paste-popup`)).toBeVisible();
  await page.locator(`#${side}-paste-input`).evaluate((el, text) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true }));
  }, eftText);
  await expect(page.locator(`#${side}-fitting-name`)).toBeVisible();
}

async function loadBothSides(page: Page): Promise<void> {
  await importViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
  await importViaPaste(page, "ship-b", loadFittingText(FITTING_THRASHER));
}

function parseDistance(text: string): number {
  const cleaned = text.replace(/[,]/g, "").trim();
  if (cleaned.includes("km")) return parseFloat(cleaned) * 1000;
  if (cleaned.includes("m")) return parseFloat(cleaned);
  return parseFloat(cleaned.replace(/[^0-9.]/g, ""));
}

test.describe("canvas settings and playback", () => {
  test("canvas settings popup opens", async ({ cleanPage: page }) => {
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeVisible();
    await expect(page.locator("#zoom-slider")).toBeVisible();
    await expect(page.locator("#auto-zoom")).toBeVisible();
    await expect(page.locator("#grid-brightness-slider")).toBeVisible();
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#canvas-settings-popup")).toBeHidden();
  });

  test("grid brightness slider updates output", async ({ cleanPage: page }) => {
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#grid-brightness-slider").fill("0.8");
    await page.locator("#grid-brightness-slider").dispatchEvent("input");
    await expect(page.locator("#grid-brightness-value")).toContainText("80%");
  });

  test("zoom slider updates output", async ({ cleanPage: page }) => {
    await page.locator("#canvas-settings-trigger").click();
    await page.locator("#auto-zoom").uncheck();
    await expect(page.locator("#zoom-slider")).toBeEnabled();
    await page.locator("#zoom-slider").fill("2");
    await page.locator("#zoom-slider").dispatchEvent("input");
    await expect(page.locator("#zoom-value")).toContainText("2.00");
  });

  test("auto-zoom checkbox disables zoom slider", async ({ cleanPage: page }) => {
    await page.locator("#canvas-settings-trigger").click();
    await expect(page.locator("#auto-zoom")).toBeChecked();
    await expect(page.locator("#zoom-slider")).toBeDisabled();
    await page.locator("#auto-zoom").uncheck();
    await expect(page.locator("#zoom-slider")).toBeEnabled();
    await page.locator("#auto-zoom").check();
    await expect(page.locator("#zoom-slider")).toBeDisabled();
  });

  test("weapon range button cycles visibility", async ({ cleanPage: page }) => {
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

  test("play button starts simulation and label changes to Pause", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    await expect(page.locator("#play")).toHaveText("Start");
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Pause");
    await page.waitForTimeout(500);
    const distance = await page.locator("#res-distance").textContent();
    expect(distance).toBeTruthy();
    await page.locator("#play").click();
  });

  test("pause stops simulation", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Pause");
    await page.waitForTimeout(300);
    await page.locator("#play").click();
    await expect(page.locator("#play")).toHaveText("Start");
    const distance1 = await page.locator("#res-distance").textContent();
    await page.waitForTimeout(500);
    const distance2 = await page.locator("#res-distance").textContent();
    expect(distance2).toBe(distance1);
  });

  test("reset returns simulation to initial state", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    await page.locator("#play").click();
    await page.waitForTimeout(500);
    await page.locator("#play").click();
    await page.locator("#reset").click();
    await expect(page.locator("#res-distance")).toHaveText("20.0 km");
  });

  test("sim speed select changes playback speed", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    const initial = 20000;
    await page.locator("#sim-speed").selectOption("8");
    await page.locator("#play").click();
    await page.waitForTimeout(300);
    const distanceFast = await page.locator("#res-distance").textContent();
    await page.locator("#play").click();
    await page.locator("#reset").click();
    await page.locator("#sim-speed").selectOption("0.25");
    await page.locator("#play").click();
    await page.waitForTimeout(300);
    const distanceSlow = await page.locator("#res-distance").textContent();
    await page.locator("#play").click();
    const fastNum = parseDistance(distanceFast!);
    const slowNum = parseDistance(distanceSlow!);
    const fastChange = Math.abs(fastNum - initial);
    const slowChange = Math.abs(slowNum - initial);
    expect(fastChange).toBeGreaterThan(slowChange);
  });

  test("initial distance input updates starting positions", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    await page.locator("#initial-distance").fill("30000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await page.locator("#reset").click();
    await page.locator("#play").click();
    await page.waitForTimeout(200);
    await page.locator("#play").click();
    const distance = await page.locator("#res-distance").textContent();
    const distNum = parseDistance(distance!);
    expect(distNum).toBeGreaterThan(25000);
  });

  test("result grid updates during simulation", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    await page.locator("#play").click();
    await page.waitForTimeout(500);
    const hitA = await page.locator("#res-hit-a").textContent();
    expect(hitA).toBeTruthy();
    expect(hitA).not.toBe("0%");
    const appliedDpsA = await page.locator("#res-applied-dps-a").textContent();
    expect(appliedDpsA).not.toBe("-");
    const nominalDpsA = await page.locator("#res-nominal-dps-a").textContent();
    expect(nominalDpsA).not.toBe("-");
    await page.locator("#play").click();
  });

  test("missile result cards show when launcher active", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_CERBERUS));
    await importViaPaste(page, "ship-b", loadFittingText(FITTING_THRASHER));
    await expect(page.locator("#res-side-a")).toHaveClass(/is-missile/);
    await expect(page.locator("#res-sig-factor-a")).toBeVisible();
    await expect(page.locator("#res-hit-a")).toBeHidden();
    await expect(page.locator("#res-side-b")).toHaveClass(/is-turret/);
    await expect(page.locator("#res-hit-b")).toBeVisible();
    await expect(page.locator("#res-sig-factor-b")).toBeHidden();
  });

  test("portraits appear when hull selected", async ({ cleanPage: page }) => {
    await loadBothSides(page);
    const portraitA = page.locator("#ship-a-portrait");
    await expect(portraitA).toBeVisible();
    await expect(portraitA.locator("img")).toBeVisible();
    const portraitB = page.locator("#ship-b-portrait");
    await expect(portraitB).toBeVisible();
    await expect(portraitB.locator("img")).toBeVisible();
  });

  test("portrait hp bars drain under sustained fire", async ({ cleanPage: page }) => {
    test.setTimeout(90000);
    await loadBothSides(page);
    const shieldBar = page.locator(".portrait-hp-bars-ship-a .portrait-hp-bar-shield");
    await expect(shieldBar).toBeVisible();
    const shieldFill = shieldBar.locator(".portrait-hp-fill");
    await expect.poll(async () => portraitLossPercent(shieldFill)).toBe(0);
    await page.locator("#play").click();
    await expect.poll(async () => portraitLossPercent(shieldFill), { timeout: 45000 }).toBeGreaterThan(20);
  });
});

async function portraitLossPercent(fill: Locator): Promise<number> {
  return fill.evaluate((el) => parseFloat(el.style.width));
}
