import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER, BASE_URL } from "./fixtures";
import type { Page } from "@playwright/test";

let page: Page;

test.describe.serial("ship stats, propulsion and skills", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#scene")).toBeVisible();
    await importFittingViaPaste(page, "ship-a", loadFittingText(FITTING_THRASHER));
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test("mass input updates align time", async () => {
    const alignTime = page.locator("#ship-a-align-time");
    const initialAlign = await alignTime.textContent();
    await page.locator("#ship-a-mass").fill("2000000");
    await page.locator("#ship-a-mass").dispatchEvent("input");
    const newAlign = await alignTime.textContent();
    expect(newAlign).toBeTruthy();
    expect(newAlign).not.toBe(initialAlign);
  });

  test("inertia input updates align time", async () => {
    const alignTime = page.locator("#ship-a-align-time");
    const initialAlign = await alignTime.textContent();
    await page.locator("#ship-a-inertia").fill("5");
    await page.locator("#ship-a-inertia").dispatchEvent("input");
    const newAlign = await alignTime.textContent();
    expect(newAlign).not.toBe(initialAlign);
  });

  test("signature radius input updates", async () => {
    await page.locator("#ship-a-sig").fill("100");
    await page.locator("#ship-a-sig").dispatchEvent("input");
    await expect(page.locator("#ship-a-sig")).toHaveValue("100");
  });

  test("mode select changes autopilot behavior", async () => {
    await expect(page.locator("#ship-a-mode")).toHaveValue("keepAtRange");
    await page.locator("#ship-a-mode").selectOption("orbit");
    await expect(page.locator("#ship-a-mode")).toHaveValue("orbit");
    await page.locator("#ship-a-mode").selectOption("midships");
    await expect(page.locator("#ship-a-mode")).toHaveValue("midships");
  });

  test("desired range input updates", async () => {
    await page.locator("#ship-a-range").fill("15000");
    await page.locator("#ship-a-range").dispatchEvent("input");
    await expect(page.locator("#ship-a-range")).toHaveValue("15000");
  });

  test("aggressivity slider updates hidden input and output", async () => {
    await page.locator("#ship-a-mode").selectOption("maneuver");
    const slider = page.locator("#ship-a-aggressivity-slider");
    const output = page.locator("#ship-a-aggressivity-value");
    const initialOutput = await output.textContent();
    await slider.evaluate((el) => {
      el.value = "0.75";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const newOutput = await output.textContent();
    expect(newOutput).not.toBe(initialOutput);
    expect(newOutput).toContain("10.00");
  });

  test("propulsion select populates from hull fitting", async () => {
    const propulsion = page.locator("#ship-a-propulsion");
    const optionCount = await propulsion.locator("option").count();
    expect(optionCount).toBeGreaterThan(0);
    const selectedValue = await propulsion.inputValue();
    expect(selectedValue).not.toBe("");
  });

  test("change propulsion updates speed and stats", async () => {
    const speed = page.locator("#ship-a-speed");
    const otherOption = page.locator("#ship-a-propulsion-options button[aria-pressed='false']").first();
    if (await otherOption.count() > 0) {
      const initialSpeed = await speed.inputValue();
      await otherOption.click();
      const newSpeed = await speed.inputValue();
      expect(newSpeed).not.toBe(initialSpeed);
    }
    await page.locator("body").click({ position: { x: 0, y: 0 } });
    await expect(page.locator("#ship-a-propulsion-variants")).toBeHidden();
  });

  test("propulsion gear opens variant popup", async () => {
    await page.locator("#ship-a-propulsion-gear").click();
    await expect(page.locator("#ship-a-propulsion-variants")).toBeVisible();
    const variants = page.locator("#ship-a-propulsion-variants");
    await expect(variants.locator("button")).not.toHaveCount(0);
    await page.locator("#ship-a-propulsion-gear").click();
    await expect(page.locator("#ship-a-propulsion-variants")).toBeHidden();
  });

  test("skill level select updates stats", async () => {
    await expect(page.locator("#ship-a-skills")).toHaveValue("5");
    await page.locator("#ship-a-skills").selectOption("3", { force: true });
    await expect(page.locator("#ship-a-skills")).toHaveValue("3");
    const effectiveTracking = await page.locator("#effective-ship-a-tracking").textContent();
    expect(effectiveTracking).toBeTruthy();
  });

  test("skill popup opens and skill option selection works", async () => {
    await page.locator("#ship-a-skill-trigger").click();
    await expect(page.locator("#ship-a-skill-popup")).toBeVisible();
    const skillOptions = page.locator("#ship-a-skill-options button");
    await expect(skillOptions).toHaveCount(6);
    await skillOptions.nth(4).click();
    await expect(page.locator("#ship-a-skill-popup")).toBeHidden();
    const summary = await page.locator("#ship-a-skill-summary").textContent();
    expect(summary).toBeTruthy();
  });

  test("speed input updates effective speed", async () => {
    await page.locator("#ship-a-speed").fill("2000");
    await page.locator("#ship-a-speed").dispatchEvent("input");
    const effectiveSpeed = await page.locator("#effective-ship-a-speed").textContent();
    expect(effectiveSpeed).toBeTruthy();
    expect(effectiveSpeed).not.toBe("");
  });

  test("overload toggle works", async () => {
    await expect(page.locator("#ship-a-overload-button")).toBeEnabled();
    const checkbox = page.locator("#ship-a-overload");
    const initialState = await checkbox.isChecked();
    await page.locator("#ship-a-overload-button").click();
    const newState = await checkbox.isChecked();
    expect(newState).not.toBe(initialState);
  });
});
