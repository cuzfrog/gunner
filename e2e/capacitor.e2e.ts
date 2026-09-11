import { test, expect, loadFittingText, importFittingViaPaste, FITTING_ABADDON, FITTING_MERLIN, importFittingViaClipboard, getClipboardText, BASE_URL } from "./fixtures";
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

test.describe.serial("Capacitor popup", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("opens with runtime bar and stats block", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator("#ship-a-capacitor-popup")).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-bar-row`)).toBeVisible();
    const statRows = page.locator(`${SECTION} .capacitor-stat-row`);
    await expect(statRows).not.toHaveCount(0);
    await expect(statRows.filter({ hasText: "GJ" }).first()).toBeVisible();
    await expect(statRows.filter({ hasText: "GJ/s" }).first()).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-usage-row`).first()).toBeVisible();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("shows no booster rows for a fit without capacitor booster", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator(`${SECTION} .capacitor-stat-row`).first()).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-booster-row`)).toHaveCount(0);
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("toggles infinite capacitor", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    const infiniteButton = page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`);
    const finiteButton = page.locator(`${SECTION} .segmented-control button[data-value="finite"]`);
    await expect(finiteButton).toHaveAttribute("aria-pressed", "true");
    await infiniteButton.click();
    await expect(infiniteButton).toHaveAttribute("aria-pressed", "true");
    await expect(finiteButton).toHaveAttribute("aria-pressed", "false");
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-capacitor-popup")).toBeHidden();
  });

  test("infinite state persists via share URL", async () => {
    await importFittingViaClipboard(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`).click();
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await expect(newPage.locator("#ship-a-capacitor-trigger")).toBeEnabled();
    await newPage.locator("#ship-a-capacitor-trigger").click();
    await expect(newPage.locator(`#ship-a-capacitor-section .segmented-control button[data-value="infinite"]`)).toHaveAttribute("aria-pressed", "true");
    await newPage.close();
  });

  test("manual inject enables only in manual mode and consumes a charge", async () => {
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    const finiteButton = page.locator(`${SECTION} .segmented-control button[data-value="finite"]`);
    if (await finiteButton.getAttribute("aria-pressed") !== "true") await finiteButton.click();
    await expect(finiteButton).toHaveAttribute("aria-pressed", "true");
    const boosterRow = page.locator(`${SECTION} .capacitor-booster-row`).first();
    await expect(boosterRow).toBeVisible();
    const injectButton = boosterRow.locator(".capacitor-inject-button");
    await expect(injectButton).toBeDisabled();
    await boosterRow.locator('.segmented-control button[data-value="manual"]').click();
    const manualRow = page.locator(`${SECTION} .capacitor-booster-row`).first();
    const manualInject = manualRow.locator(".capacitor-inject-button");
    await expect(manualInject).toBeEnabled();
    const status = manualRow.locator(".capacitor-booster-status");
    const before = await status.textContent();
    await manualInject.click();
    await expect(status).not.toHaveText(before ?? "");
  });
});

function gjValue(text: string | null): number {
  const match = text?.match(/([\d,.]+) \/ /);
  return match ? parseFloat(match[1].replace(/,/g, "")) : -1;
}

test.describe.serial("Capacitor runtime drain", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  // 15s real at the default 4x speed = 60 sim seconds; the killmail fit depletes in ~90 sim seconds.
  test("turret, propulsion, and ewar debits drain the killmail fit during simulation", async ({ }) => {
    test.setTimeout(90000);
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
    const barA = page.locator("#ship-a-capacitor-section .capacitor-bar-value");
    const barB = page.locator("#ship-b-capacitor-section .capacitor-bar-value");
    const beforeA = gjValue(await barA.textContent());
    const beforeB = gjValue(await barB.textContent());
    await page.locator("#play").click();
    await page.waitForTimeout(15000);
    const afterA = gjValue(await barA.textContent());
    const afterB = gjValue(await barB.textContent());
    expect(beforeA).toBeGreaterThan(0);
    expect(afterA).toBeLessThan(beforeA * 0.7);
    expect(afterB).toBeLessThan(beforeB * 0.95);
    await page.locator("#reset").click();
  });

  test("toggling propulsion off and on keeps the killmail fit draining", async ({ }) => {
    test.setTimeout(120000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
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
    await page.waitForTimeout(15000);
    const afterA = gjValue(await barA.textContent());
    expect(beforeA).toBeGreaterThan(0);
    expect(afterA).toBeLessThan(beforeA * 0.7);
    await page.locator("#reset").click();
  });

  test("restoring a saved profile drains the killmail fit during simulation", async ({ }) => {
    test.setTimeout(120000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("CapDrainProfile");
    await page.locator("#new-profile-confirm").click();
    await expect(page.locator("#profile-select-label")).toContainText("CapDrainProfile");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#ship-a-capacitor-trigger")).toBeEnabled();
    const beforeA = gjValue(await page.locator("#ship-a-capacitor-section .capacitor-bar-value").textContent());
    await page.locator("#play").click();
    await page.waitForTimeout(15000);
    const afterA = gjValue(await page.locator("#ship-a-capacitor-section .capacitor-bar-value").textContent());
    expect(beforeA).toBeGreaterThan(0);
    expect(afterA).toBeLessThan(beforeA * 0.7);
    await page.locator("#reset").click();
  });

  test("a profile saved by an older build without a capacitor summary drains after restore", async ({ }) => {
    test.setTimeout(120000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
    await page.locator("#profile-new").click();
    await page.locator("#new-profile-name").fill("LegacyCapProfile");
    await page.locator("#new-profile-confirm").click();
    await expect(page.locator("#profile-select-label")).toContainText("LegacyCapProfile");
    // Simulate a profile saved before fittedHull summaries carried capacitor/propulsion stats.
    await page.evaluate(() => {
      const key = "gunner-profiles-v6";
      const profiles = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, { shipAFittedHull?: { capacitor?: unknown } }>;
      const legacy = profiles["LegacyCapProfile"];
      if (legacy?.shipAFittedHull) delete legacy.shipAFittedHull.capacitor;
      localStorage.setItem(key, JSON.stringify(profiles));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#ship-a-capacitor-trigger")).toBeEnabled();
    const beforeA = gjValue(await page.locator("#ship-a-capacitor-section .capacitor-bar-value").textContent());
    await page.locator("#play").click();
    await page.waitForTimeout(15000);
    const afterA = gjValue(await page.locator("#ship-a-capacitor-section .capacitor-bar-value").textContent());
    expect(beforeA).toBeGreaterThan(0);
    expect(afterA).toBeLessThan(beforeA * 0.7);
    await page.locator("#reset").click();
  });

  test("infinite capacitor keeps the runtime bar at full while the opponent drains", async ({ }) => {
    test.setTimeout(90000);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", KILLMAIL_HARBINGER);
    await importFittingViaPaste(page, "ship-b", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`).click();
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    const beforeA = gjValue(await page.locator(`${SECTION} .capacitor-bar-value`).textContent());
    const beforeB = gjValue(await page.locator("#ship-b-capacitor-section .capacitor-bar-value").textContent());
    await page.locator("#play").click();
    await page.waitForTimeout(15000);
    const afterA = gjValue(await page.locator(`${SECTION} .capacitor-bar-value`).textContent());
    const afterB = gjValue(await page.locator("#ship-b-capacitor-section .capacitor-bar-value").textContent());
    expect(afterA).toBe(beforeA);
    expect(afterB).toBeLessThan(beforeB);
    await page.locator("#reset").click();
  });
});
