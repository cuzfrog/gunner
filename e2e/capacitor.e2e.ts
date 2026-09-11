import { test, expect, loadFittingText, importFittingViaPaste, FITTING_ABADDON, FITTING_MERLIN, importFittingViaClipboard, getClipboardText, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

const SECTION = "#ship-a-capacitor-section";

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
