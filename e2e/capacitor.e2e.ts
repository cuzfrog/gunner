import { test, expect, loadFittingText, importFittingViaPaste, FITTING_ABADDON, pauseIfPlaying, resetSim, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

const SECTION = "#ship-a-capacitor-section";

// The user-reported killmail fitting: 6 turret groups, afterburner, webs, no cap booster and
// no RAH, so every runtime debit path (turret groups, propulsion, scheduled ewar drains) matters.
const KILLMAIL_HARBINGER = `[Harbinger, Killmail 137572701]
Damage Control II
Heat Sink II
Heat Sink II
Mark I Compact Reinforced Bulkheads
Reinforced Bulkheads II
Reinforced Bulkheads II

100MN Y-S8 Compact Afterburner
Fleeting Compact Stasis Webifier
Initiated Compact Warp Disruptor
Fleeting Compact Stasis Webifier

Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
Heavy Pulse Laser II, Conflagration M
[Empty High slot]

Medium Transverse Bulkhead II
Medium Transverse Bulkhead II
Medium Transverse Bulkhead II


Infiltrator II x5


Scorch M x6
Imperial Navy Gamma M x6
Imperial Navy Multifrequency M x6`;

let page: Page;

test.describe.serial("Capacitor", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("popup opens with runtime bar, stats block, usage rows, and booster rows", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator("#ship-a-capacitor-popup")).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-bar-row`)).toBeVisible();
    const statRows = page.locator(`${SECTION} .capacitor-stat-row`);
    await expect(statRows).not.toHaveCount(0);
    await expect(statRows.filter({ hasText: "GJ" }).first()).toBeVisible();
    await expect(statRows.filter({ hasText: "GJ/s" }).first()).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-usage-row`).first()).toBeVisible();
    // The Abaddon fit carries a capacitor booster; the usage and booster rows must both render.
    await expect(page.locator(`${SECTION} .capacitor-booster-row`).first()).toBeVisible();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("toggling propulsion off drops its usage row; a fit without cap booster shows none", async () => {
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await page.locator("#ship-a-capacitor-trigger").click();
    const usageRows = page.locator(`${SECTION} .capacitor-usage-row`);
    const propulsionRow = usageRows.filter({ hasText: "100MN Y-S8 Compact Afterburner" });
    await expect(propulsionRow).toHaveCount(1);
    await expect(page.locator(`${SECTION} .capacitor-booster-row`)).toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
    const activeButton = page.locator("#ship-a-propulsion-options button[aria-pressed='true']");
    const propulsionId = await activeButton.getAttribute("data-value");
    expect(propulsionId).toBeTruthy();
    await activeButton.click();
    await expect(page.locator("#ship-a-propulsion-options button[aria-pressed='true']")).toHaveCount(0);
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(propulsionRow).toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await page.locator(`#ship-a-propulsion-options button[data-value='${propulsionId}']`).click();
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(propulsionRow).toHaveCount(1);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("turret, propulsion, and ewar debits drain the killmail fit while the opponent drains", async () => {
    test.setTimeout(60000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
    const barA = page.locator("#ship-a-capacitor-section .capacitor-bar-value");
    const barB = page.locator("#ship-b-capacitor-section .capacitor-bar-value");
    const beforeA = gjValue(await barA.textContent());
    const beforeB = gjValue(await barB.textContent());
    expect(beforeA).toBeGreaterThan(0);
    expect(beforeB).toBeGreaterThan(0);
    await page.locator("#sim-speed").selectOption("8");
    await page.locator("#initial-distance").fill("10000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await resetSim(page, "10.0 km");
    await page.locator("#play").click();
    // The killmail fit drops ~43 GJ/s net once in turret range; the Abaddon fit
    // drains through its own modules from the first cycle.
    await expect.poll(async () => gjValue(await barA.textContent()), { timeout: 30000 }).toBeLessThan(beforeA * 0.9);
    expect(gjValue(await barB.textContent())).toBeLessThan(beforeB);
    await pauseIfPlaying(page);
    await resetSim(page, "10.0 km");
  });

  test("infinite capacitor keeps the bar full while the opponent drains", async () => {
    test.setTimeout(60000);
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`).click();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
    const barA = page.locator(`${SECTION} .capacitor-bar-value`);
    const barB = page.locator("#ship-b-capacitor-section .capacitor-bar-value");
    const beforeA = gjValue(await barA.textContent());
    const beforeB = gjValue(await barB.textContent());
    await page.locator("#play").click();
    await expect.poll(async () => gjValue(await barB.textContent()), { timeout: 30000 }).toBeLessThan(beforeB * 0.98);
    expect(gjValue(await barA.textContent())).toBe(beforeA);
    await pauseIfPlaying(page);
    await resetSim(page, "10.0 km");
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION} .segmented-control button[data-value="finite"]`).click();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("toggling propulsion off and on keeps the killmail fit draining", async () => {
    test.setTimeout(60000);
    const activeButton = page.locator("#ship-a-propulsion-options button[aria-pressed='true']");
    await expect(activeButton).toHaveCount(1);
    const propulsionId = await activeButton.getAttribute("data-value");
    expect(propulsionId).toBeTruthy();
    await activeButton.click();
    await expect(page.locator("#ship-a-propulsion-options button[aria-pressed='true']")).toHaveCount(0);
    await page.locator(`#ship-a-propulsion-options button[data-value='${propulsionId}']`).click();
    await expect(page.locator("#ship-a-propulsion-options button[aria-pressed='true']")).toHaveCount(1);
    const barA = page.locator("#ship-a-capacitor-section .capacitor-bar-value");
    const beforeA = gjValue(await barA.textContent());
    await page.locator("#play").click();
    await expect.poll(async () => gjValue(await barA.textContent()), { timeout: 30000 }).toBeLessThan(beforeA * 0.9);
    await pauseIfPlaying(page);
    await resetSim(page, "10.0 km");
  });
});

function gjValue(text: string | null): number {
  const match = text?.match(/([\d,.]+) \/ /);
  return match ? parseFloat(match[1].replace(/,/g, "")) : -1;
}
