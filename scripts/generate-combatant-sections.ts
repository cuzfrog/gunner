import { readFileSync, writeFileSync } from "node:fs";
import { COMBATANT_SIDES, DEFAULT_VALUES } from "../src/ui/controls";
import type { SideConfig } from "../src/ui/controls";

const TEMPLATE_PATH = new URL("./combatant-section.template.html", import.meta.url);
const INDEX_PATH = new URL("../public/index.html", import.meta.url);

const START_MARKER = "      <!-- combatant-sections-start -->";
const END_MARKER = "      <!-- combatant-sections-end -->";

interface PlaceholderValues {
  readonly [placeholder: string]: string;
}

function trackingHeader(side: SideConfig): string {
  if (side.key === "shipA") {
    return [
      '          <span class="tracking-label-row">',
      '            <span class="field-label" id="tracking-label-text" data-i18n="label.trackingSpeed">Tracking speed</span>',
      '            <span class="tracking-unit-toggle" role="group" aria-label="Tracking unit">',
      '              <button type="button" id="tracking-unit-rad" data-tracking-unit="rad" class="btn" aria-pressed="true">rad/s</button>',
      '              <button type="button" id="tracking-unit-score" data-tracking-unit="score" class="btn" aria-pressed="false" ' +
      'data-i18n="label.trackingScore">Score</button>',
      '            </span>',
      '          </span>',
    ].join("\n");
  }
  return '          <span class="field-label" data-i18n="label.trackingSpeed">Tracking speed</span>';
}

function modeOptions(side: SideConfig): string {
  const selected = side.key === "shipA" ? "keepAtRange" : "orbit";
  const first = selected === "keepAtRange"
    ? '              <option value="keepAtRange" selected data-i18n="mode.keepAtRange">Keep at range</option>\n' +
      '              <option value="orbit" data-i18n="mode.orbit">Orbit</option>'
    : '              <option value="orbit" selected data-i18n="mode.orbit">Orbit</option>\n' +
      '              <option value="keepAtRange" data-i18n="mode.keepAtRange">Keep at range</option>';
  return [
    '          <div class="form-field-group">',
    '            <span class="field-label truncate" data-i18n="label.mode">Mode</span>',
    `            <select id="${side.idPrefix}-mode" class="turret-mode-select input-field"`,
    '                    data-i18n-aria-label="label.mode" aria-label="Mode">',
    first,
    '              <option value="midships" data-i18n="mode.midships">Midships</option>',
    '              <option value="maneuver" data-i18n="mode.maneuver">Maneuver</option>',
    '            </select>',
    '          </div>',
  ].join("\n");
}

function effectiveTrackingId(side: SideConfig): string {
  return `${side.idPrefix}-tracking`;
}

function effectiveOptimalId(side: SideConfig): string {
  return `${side.idPrefix}-optimal`;
}

function effectiveFalloffId(side: SideConfig): string {
  return `${side.idPrefix}-falloff`;
}

function effectiveSpeedId(side: SideConfig): string {
  return `${side.idPrefix}-speed`;
}

function sideValue(side: SideConfig, baseId: string): string {
  return DEFAULT_VALUES[`${side.idPrefix}-${baseId}`] ?? "";
}

export function renderSection(template: string, side: SideConfig): string {
  const values: PlaceholderValues = {
    "{{ID_PREFIX}}": side.idPrefix,
    "{{SIDE_CLASS}}": side.idPrefix,
    "{{SIDE_LABEL}}": side.label,
    "{{SIDE_KEY}}": side.i18nKey,
    "{{TRACKING_HEADER}}": trackingHeader(side),
    "{{MODE_OPTIONS}}": modeOptions(side),
    "{{EFFECTIVE_TRACKING_ID}}": effectiveTrackingId(side),
    "{{EFFECTIVE_OPTIMAL_ID}}": effectiveOptimalId(side),
    "{{EFFECTIVE_FALLOFF_ID}}": effectiveFalloffId(side),
    "{{EFFECTIVE_SPEED_ID}}": effectiveSpeedId(side),
    "{{TRACKING_VALUE}}": sideValue(side, "tracking"),
    "{{OPTIMAL_VALUE}}": sideValue(side, "optimal"),
    "{{FALLOFF_VALUE}}": sideValue(side, "falloff"),
    "{{SPEED_VALUE}}": sideValue(side, "speed"),
    "{{MASS_VALUE}}": sideValue(side, "mass"),
    "{{INERTIA_VALUE}}": sideValue(side, "inertia"),
    "{{RANGE_VALUE}}": sideValue(side, "range"),
    "{{SIG_VALUE}}": sideValue(side, "sig"),
    "{{AGGRESSIVITY_VALUE}}": sideValue(side, "aggressivity"),
    "{{AGGRESSIVITY_SLIDER_VALUE}}": sideValue(side, "aggressivity-slider"),
    "{{ALIGN_TIME_TEXT}}": side.key === "shipA" ? "5.0s" : "6.2s",
    "{{SKILL_SUMMARY_TEXT}}": "Level 5",
    "{{OVERLOAD_CHECKED}}": "checked",
  };
  let section = template;
  for (const [placeholder, value] of Object.entries(values)) {
    section = section.split(placeholder).join(value);
  }
  return section;
}

export function generateSections(template: string): { shipA: string; shipB: string } {
  const shipA = renderSection(template, COMBATANT_SIDES[0]);
  const shipB = renderSection(template, COMBATANT_SIDES[1]);
  return { shipA, shipB };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function updateIndexHtml(options: { checkOnly?: boolean; htmlPath?: string; templatePath?: string } = {}): void {
  const htmlPath = options.htmlPath ? new URL(options.htmlPath, import.meta.url) : INDEX_PATH;
  const templatePath = options.templatePath ? new URL(options.templatePath, import.meta.url) : TEMPLATE_PATH;
  const html = readFileSync(htmlPath, "utf8");
  const template = readFileSync(templatePath, "utf8");

  const { shipA, shipB } = generateSections(template);
  const sections = [shipA, shipB];

  const markerPattern = new RegExp(
    escapeRegExp(START_MARKER) + "[\\s\\S]*?" + escapeRegExp(END_MARKER),
    "g",
  );
  const matches = Array.from(html.matchAll(markerPattern));
  if (matches.length !== 2) {
    throw new Error(`Expected 2 ${START_MARKER}...${END_MARKER} pairs in index.html, found ${matches.length}.`);
  }

  let drift = false;
  for (let i = 0; i < 2; i += 1) {
    const match = matches[i];
    const content = match[0];
    const innerStart = content.indexOf(START_MARKER) + START_MARKER.length;
    const innerEnd = content.indexOf(END_MARKER);
    const current = content.slice(innerStart, innerEnd).trim();
    const expected = sections[i]!.trim();
    if (current !== expected) {
      drift = true;
      break;
    }
  }

  if (!drift) {
    if (!options.checkOnly) console.log("public/index.html is up to date.");
    return;
  }

  if (options.checkOnly) {
    throw new Error("Combatant sections in public/index.html are out of date.");
  }

  let sectionIndex = 0;
  const updated = html.replace(markerPattern, (match: string) => {
    const section = sections[sectionIndex]!;
    sectionIndex += 1;
    return `${START_MARKER}\n${section}\n${END_MARKER}`;
  });

  writeFileSync(htmlPath, updated, "utf8");
  console.log("Updated combatant sections in public/index.html.");
}

function main(): void {
  try {
    const checkOnly = process.argv.includes("--check");
    updateIndexHtml({ checkOnly });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}

if (import.meta.main) main();
