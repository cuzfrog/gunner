import { test, expect, loadFittingText, FITTING_ABADDON, FITTING_MERLIN, importFittingViaClipboard, getClipboardText } from "./fixtures";
import type { Page } from "@playwright/test";

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

const SECTION = "#ship-a-capacitor-section";

test.describe("Capacitor popup", () => {
  test("opens with runtime bar and stats block", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator("#ship-a-capacitor-popup")).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-bar-row`)).toBeVisible();
    const statRows = page.locator(`${SECTION} .capacitor-stat-row`);
    await expect(statRows).not.toHaveCount(0);
    await expect(statRows.filter({ hasText: "GJ" }).first()).toBeVisible();
    await expect(statRows.filter({ hasText: "GJ/s" }).first()).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-usage-row`).first()).toBeVisible();
  });

  test("shows no booster rows for a fit without capacitor booster", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_MERLIN));
    await page.locator("#ship-a-capacitor-trigger").click();
    await expect(page.locator(`${SECTION} .capacitor-stat-row`).first()).toBeVisible();
    await expect(page.locator(`${SECTION} .capacitor-booster-row`)).toHaveCount(0);
  });

  test("toggles infinite capacitor", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    const infiniteButton = page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`);
    const finiteButton = page.locator(`${SECTION} .segmented-control button[data-value="finite"]`);
    await expect(finiteButton).toHaveAttribute("aria-pressed", "true");
    await infiniteButton.click();
    await expect(infiniteButton).toHaveAttribute("aria-pressed", "true");
    await expect(finiteButton).toHaveAttribute("aria-pressed", "false");
  });

  test("infinite state persists via share URL", async ({ cleanPage: page }) => {
    await importFittingViaClipboard(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
    await page.locator(`${SECTION} .segmented-control button[data-value="infinite"]`).click();
    await page.locator("#share-link").click();
    await page.locator("#share-copy-url").click();
    const shareUrl = await getClipboardText(page);
    const newPage = await page.context().newPage();
    await newPage.goto(shareUrl);
    await expect(newPage.locator("#ship-a-capacitor-trigger")).toBeEnabled();
    await newPage.locator("#ship-a-capacitor-trigger").click();
    await expect(newPage.locator(`#ship-a-capacitor-section .segmented-control button[data-value="infinite"]`)).toHaveAttribute("aria-pressed", "true");
    await newPage.close();
  });

  test("manual inject enables only in manual mode and consumes a charge", async ({ cleanPage: page }) => {
    await importViaPaste(page, "ship-a", loadFittingText(FITTING_ABADDON));
    await page.locator("#ship-a-capacitor-trigger").click();
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
