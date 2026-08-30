import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const PORT = 4321;
export const BASE_URL = `http://localhost:${PORT}`;

export const FITTING_THRASHER = "data/ship-fittings/Thrasher/Kitetackle_Art_Shield_Thrasher.txt";
export const FITTING_MERLIN = "data/ship-fittings/Merlin/Tackle_Blaster_Shield_Merlin.txt";
export const FITTING_ABADDON = "data/ship-fittings/Abaddon/Pulse_Armor_Abaddon.txt";
export const FITTING_CERBERUS = "data/ship-fittings/Cerberus/Missile_Shield_Cerberus.txt";
export const FITTING_VIGIL_ROCKET = "data/ship-fittings/Vigil_Fleet_Issue/Kitetackle_Rocket_Shield_Vigil_Fleet_Issue.txt";
export const FITTING_CURSE_EWAR = "data/ship-fittings/Curse/Ewar_Armor_Curse.txt";

const fittingCache = new Map<string, string>();

export function loadFittingText(relativePath: string): string {
  const cached = fittingCache.get(relativePath);
  if (cached !== undefined) return cached;
  const text = readFileSync(relativePath, "utf-8").trim();
  fittingCache.set(relativePath, text);
  return text;
}

const test = base.extend<{ cleanPage: Page; rawPage: Page }>({
  rawPage: async ({ page }, use) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await use(page);
  },
  cleanPage: async ({ page }, use) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL);
    await expect(page.locator("#scene")).toBeVisible();
    await use(page);
  },
});

export { test, expect };

export async function setClipboardText(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
}

export async function getClipboardText(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

export async function waitForPopupVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

export async function waitForPopupHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

export async function clickOutsidePopup(page: Page): Promise<void> {
  await page.locator("body").click({ position: { x: 0, y: 0 } });
}

export async function loadShipViaSearch(page: Page, side: "ship-a" | "ship-b", hullName: string): Promise<void> {
  await page.locator(`#${side}-ship-select-trigger`).click();
  await expect(page.locator(`#${side}-ship-select-popup`)).toBeVisible();
  await page.locator(`#${side}-hull`).fill(hullName);
  await page.locator(`#${side}-hull`).press("Tab");
  await expect(page.locator(`#${side}-fitting-name`)).toBeVisible();
}

export async function importFittingViaClipboard(page: Page, side: "ship-a" | "ship-b", eftText: string): Promise<void> {
  await setClipboardText(page, eftText);
  await page.locator("#import-profile").click();
  await expect(page.locator("#import-side-popup")).toBeVisible();
  await page.locator(`#import-side-${side}`).click();
  await expect(page.locator(`#${side}-fitting-name`)).toBeVisible();
}

export async function importFittingViaPaste(page: Page, side: "ship-a" | "ship-b", eftText: string): Promise<void> {
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
