import { test, expect, loadFittingText, importFittingViaPaste, FITTING_THRASHER } from "./fixtures";

test.describe("propulsion selection memory", () => {
  test("switching AB -> MWD -> AB restores the previously selected AB variant", async ({ cleanPage: page }) => {
    const eftText = loadFittingText(FITTING_THRASHER);
    await importFittingViaPaste(page, "ship-a", eftText);

    // The Thrasher fitting has a 5MN Microwarpdrive — verify MWD is active
    await expect(page.locator("#ship-a-propulsion-options [data-value='mwd-5mn']")).toHaveAttribute("aria-pressed", "true");

    // Switch to Afterburner
    await page.locator("#ship-a-propulsion-options [data-value='ab-1mn']").click();
    await expect(page.locator("#ship-a-propulsion-options [data-value='ab-1mn']")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#ship-a-propulsion-options [data-value='mwd-5mn']")).toHaveAttribute("aria-pressed", "false");

    // Open the variant popup and select a non-default variant
    await page.locator("#ship-a-propulsion-gear").click();
    await expect(page.locator("#ship-a-propulsion-variants")).toBeVisible();
    const variants = page.locator("#ship-a-propulsion-variants [data-value]");
    const variantCount = await variants.count();
    expect(variantCount).toBeGreaterThan(1);

    // Select the second variant (non-default)
    const secondVariantId = await variants.nth(1).getAttribute("data-value");
    expect(secondVariantId).toBeTruthy();
    await variants.nth(1).click();

    // Close the popup by clicking the gear again
    await page.locator("#ship-a-propulsion-gear").click();
    await expect(page.locator("#ship-a-propulsion-variants")).toBeHidden();

    // Switch to MWD
    await page.locator("#ship-a-propulsion-options [data-value='mwd-5mn']").click();
    await expect(page.locator("#ship-a-propulsion-options [data-value='mwd-5mn']")).toHaveAttribute("aria-pressed", "true");

    // Switch back to AB — should restore the previously selected variant, not the default
    await page.locator("#ship-a-propulsion-options [data-value='ab-1mn']").click();
    await expect(page.locator("#ship-a-propulsion-options [data-value='ab-1mn']")).toHaveAttribute("aria-pressed", "true");

    // Open the variant popup and verify the previously selected variant is still active
    await page.locator("#ship-a-propulsion-gear").click();
    await expect(page.locator("#ship-a-propulsion-variants")).toBeVisible();
    const activeVariant = page.locator("#ship-a-propulsion-variants [data-value][aria-current='true']");
    await expect(activeVariant).toHaveAttribute("data-value", secondVariantId!);
  });
});
