import { test as base, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const PORT = 4321;
export const BASE_URL = `http://localhost:${PORT}`;

export const FITTING_THRASHER = "data/ship-fittings/Thrasher/Brawl_(artillery)_Thrasher.txt";
export const FITTING_MERLIN = "data/ship-fittings/Merlin/Brawl_-_1_web_Merlin.txt";
export const FITTING_ABADDON = "data/ship-fittings/Abaddon/Pulse_Armor_Abaddon.txt";
export const FITTING_CERBERUS = "data/ship-fittings/Cerberus/Missile_Shield_Cerberus.txt";
export const FITTING_VIGIL_ROCKET = "data/ship-fittings/Vigil_Fleet_Issue/Scram_kite_Vigil_Fleet_Issue.txt";
export const FITTING_CURSE_EWAR = "data/ship-fittings/Curse/Ewar_Armor_Curse.txt";
export const FITTING_ISHTAR = "data/ship-fittings/Ishtar/Drone_Shield_Ishtar.txt";

const fittingCache = new Map<string, string>();

export function loadFittingText(relativePath: string): string {
  const cached = fittingCache.get(relativePath);
  if (cached !== undefined) return cached;
  const text = readFileSync(relativePath, "utf-8").trim();
  fittingCache.set(relativePath, text);
  return text;
}

const test = base;

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
    const holder = window as { __originalClipboard?: Clipboard };
    holder.__originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { readText: () => Promise.reject(new Error("denied")), writeText: () => Promise.resolve() },
      configurable: true,
    });
  });
  try {
    await page.locator(`#${side}-import-fitting`).click();
    await expect(page.locator(`#${side}-paste-popup`)).toBeVisible();
    await page.locator(`#${side}-paste-input`).evaluate((el, text) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData("text/plain", text);
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dataTransfer, bubbles: true }));
    }, eftText);
    await expect(page.locator(`#${side}-fitting-name`)).toBeVisible();
  } finally {
    await page.evaluate(() => {
      const holder = window as { __originalClipboard?: Clipboard };
      if (holder.__originalClipboard) {
        Object.defineProperty(navigator, "clipboard", { value: holder.__originalClipboard, configurable: true });
        delete holder.__originalClipboard;
      }
    });
  }
}

// A kill flips the button to "Restart" (the loop auto-stops), so a click meant
// to pause can land after the death and restart the sim instead. Retry.
export async function pauseIfPlaying(page: Page): Promise<void> {
  const play = page.locator("#play");
  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await play.textContent()) !== "Pause") return;
    await play.click();
    try {
      await expect(play).toHaveText("Start", { timeout: 1000 });
      return;
    } catch { /* death restarted the sim mid-click; pause again */ }
  }
}

export async function resetSim(page: Page, expectedDistance = "20.0 km"): Promise<void> {
  await pauseIfPlaying(page);
  await page.locator("#reset").click();
  await expect(page.locator("#res-distance")).toHaveText(expectedDistance);
}
