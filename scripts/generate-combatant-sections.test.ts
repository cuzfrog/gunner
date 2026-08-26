import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateSections, renderSection, updateIndexHtml } from "./generate-combatant-sections";
import { COMBATANT_SIDES } from "../src/ui/controls";

describe("generate-combatant-sections", () => {
  const template = readFileSync(
    new URL("./combatant-section.template.html", import.meta.url),
    "utf8",
  );

  test("renderSection fills all placeholders", () => {
    for (const side of COMBATANT_SIDES) {
      const section = renderSection(template, side);
      expect(section).not.toMatch(/\{\{/);
      expect(section).toContain(`class="side-panel side-panel-${side.idPrefix} surface-panel"`);
      expect(section).toContain(`>${side.label}<`);
      expect(section).toContain(`data-i18n="label.${side.i18nKey}"`);
    }
  });

  test("shipA section contains the global tracking-unit toggle", () => {
    const { shipA } = generateSections(template);
    expect(shipA).toContain('id="tracking-unit-rad"');
    expect(shipA).toContain('id="tracking-unit-score"');
  });

  test("neither side panel contains the initial-distance input and shipB orbit mode is selected", () => {
    const { shipA, shipB } = generateSections(template);
    expect(shipA).not.toContain('id="initial-distance"');
    expect(shipB).not.toContain('id="initial-distance"');
    expect(shipB).toContain('value="5000"');
    expect(shipB).toContain('<option value="orbit" selected');
    expect(shipB).not.toContain('<option value="keepAtRange" selected');
  });

  test("shipA mode keeps keepAtRange selected", () => {
    const { shipA } = generateSections(template);
    expect(shipA).toContain('<option value="keepAtRange" selected');
    expect(shipA).not.toContain('<option value="orbit" selected');
  });

  test("shipA section has heading row with actions and anchored paste popup", () => {
    const { shipA } = generateSections(template);
    expect(shipA).toContain('class="side-panel-heading-row"');
    expect(shipA).toContain('class="side-panel-heading-actions"');
    expect(shipA).toContain('id="ship-a-import-fitting"');
    expect(shipA).toMatch(/class="side-panel-heading-actions"[\s\S]*?id="ship-a-paste-popup"/);
  });

  test("shipA and shipB have side-specific default values", () => {
    const { shipA, shipB } = generateSections(template);
    expect(shipA).toContain('id="ship-a-speed" value="0"');
    expect(shipB).toContain('id="ship-b-speed" value="1000"');
    expect(shipA).toContain('id="ship-a-mass" value="1200000"');
    expect(shipB).toContain('id="ship-b-mass" value="10000000"');
    expect(shipA).toContain('id="ship-a-inertia" value="3"');
    expect(shipB).toContain('id="ship-b-inertia" value="0.45"');
    expect(shipA).toContain('id="ship-a-align-time" aria-hidden="true">5.0s</span>');
    expect(shipB).toContain('id="ship-b-align-time" aria-hidden="true">6.2s</span>');
  });

  test("updateIndexHtml check passes for the committed index.html", () => {
    expect(() => updateIndexHtml({ checkOnly: true })).not.toThrow();
  });

  test("updateIndexHtml check fails when a side section drifts", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "gunner-combatant-sections-"));
    const driftedPath = join(tempDir, "index.html");
    const original = readFileSync(
      new URL("../public/index.html", import.meta.url),
      "utf8",
    );
    writeFileSync(driftedPath, original.replace('value="0.32"', 'value="9.99"'));

    expect(() => updateIndexHtml({ checkOnly: true, htmlPath: driftedPath })).toThrow(
      "out of date",
    );
  });
});
