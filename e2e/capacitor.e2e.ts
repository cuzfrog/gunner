import { test, expect, loadFittingText, importFittingViaPaste, pauseIfPlaying, resetSim, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

const SECTION_A = "#ship-a-capacitor-section";

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

  test("capacitor popup renders stats, usage rows, and no booster row", async () => {
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", KILLMAIL_HARBINGER);
    // Stats block and usage rows render; the killmail fit carries no capacitor booster
    // (booster row rendering itself is unit-covered in capacitorController.test.ts).
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator("#ship-a-capacitor-popup")).toBeVisible();
    await expect(page.locator(`${SECTION_A} .capacitor-bar-row`)).toBeVisible();
    const statRows = page.locator(`${SECTION_A} .capacitor-stat-row`);
    await expect(statRows).not.toHaveCount(0);
    await expect(statRows.filter({ hasText: "GJ" }).first()).toBeVisible();
    await expect(statRows.filter({ hasText: "GJ/s" }).first()).toBeVisible();
    const usageRows = page.locator(`${SECTION_A} .capacitor-usage-row`);
    await expect(usageRows.first()).toBeVisible();
    // Non-blocking warp disruptors drain capacitor and appear as usage rows (regression: they
    // used to be absent from the fitting DB, silently under-reporting capacitor usage).
    await expect(usageRows.filter({ hasText: "Initiated Compact Warp Disruptor" })).toHaveCount(1);
    await expect(page.locator(`${SECTION_A} .capacitor-booster-row`)).toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("toggling propulsion off drops its usage row and restoring it brings the debit back", async () => {
    await page.locator("#ship-a-capacitor-trigger").click();
    const usageRows = page.locator(`${SECTION_A} .capacitor-usage-row`);
    const propulsionRow = usageRows.filter({ hasText: "100MN Y-S8 Compact Afterburner" });
    await expect(propulsionRow).toHaveCount(1);
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

  test("runtime drain: finite fit drains after the propulsion retoggle; infinite mode pins the bar", async () => {
    test.setTimeout(60000);
    const barA = page.locator(`${SECTION_A} .capacitor-bar-value`);
    const barB = page.locator("#ship-b-capacitor-section .capacitor-bar-value");
    const fullA = gjValue(await barA.textContent());
    const fullB = gjValue(await barB.textContent());
    expect(fullA).toBeGreaterThan(0);
    expect(fullB).toBeGreaterThan(0);
    await page.locator("#sim-speed").selectOption("8");
    await page.locator("#initial-distance").fill("10000");
    await page.locator("#initial-distance").dispatchEvent("input");
    await resetSim(page, "10.0 km");

    // Finite: replay the propulsion retoggle, then every debit path (turret groups,
    // propulsion, scheduled ewar drains) drains both killmail fits from the first cycle.
    const activeButton = page.locator("#ship-a-propulsion-options button[aria-pressed='true']");
    const propulsionId = await activeButton.getAttribute("data-value");
    expect(propulsionId).toBeTruthy();
    await activeButton.click();
    await expect(page.locator("#ship-a-propulsion-options button[aria-pressed='true']")).toHaveCount(0);
    await page.locator(`#ship-a-propulsion-options button[data-value='${propulsionId}']`).click();
    await expect(activeButton).toHaveCount(1);
    await page.locator("#play").click();
    await expect.poll(async () => gjValue(await barA.textContent()), { timeout: 30000 }).toBeLessThan(fullA * 0.9);
    expect(gjValue(await barB.textContent())).toBeLessThan(fullB);
    await pauseIfPlaying(page);
    await resetSim(page, "10.0 km");

    // Infinite: ship-a's bar pins at full while ship-b keeps draining.
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION_A} .segmented-control button[data-value="infinite"]`).click();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
    await page.locator("#play").click();
    await expect.poll(async () => gjValue(await barB.textContent()), { timeout: 30000 }).toBeLessThan(fullB * 0.98);
    expect(gjValue(await barA.textContent())).toBe(fullA);
    await pauseIfPlaying(page);
    await resetSim(page, "10.0 km");
  });
});

function gjValue(text: string | null): number {
  const match = text?.match(/([\d,.]+) \/ /);
  return match ? parseFloat(match[1].replace(/,/g, "")) : -1;
}
