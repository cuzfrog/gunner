import { FakeElement } from "./fakeElement";

const SELECT_IDS = new Set(["sigRes", "attacker-mode", "target-mode", "attacker-skills", "target-skills", "attacker-propulsion", "target-propulsion", "sim-speed", "profile-select"]);
const TEXTAREA_IDS = new Set(["attacker-paste-input", "target-paste-input"]);
const IMAGE_IDS = new Set(["attacker-ship-image", "target-ship-image", "attacker-ammo-summary-icon"]);
const BUTTON_IDS = new Set(["play", "reset", "profile-save", "profile-delete", "profile-new", "new-profile-confirm", "new-profile-cancel", "share-link", "share-copy-url", "share-copy-text", "import-profile", "import-side-attacker", "import-side-target", "attacker-import-fitting", "target-import-fitting", "attacker-fitting-trigger", "attacker-fitting-eye", "target-fitting-trigger", "target-fitting-eye", "attacker-ammo-trigger", "attacker-ammo-expand", "attacker-propulsion-gear", "target-propulsion-gear", "attacker-skill-trigger", "target-skill-trigger", "attacker-overload-button", "target-overload-button", "attacker-ewar-trigger", "target-ewar-trigger", "tracking-unit-rad", "tracking-unit-score", "lang-en", "lang-zh", "lang-ja", "confirm-ok", "confirm-cancel"]);

function tagForId(id: string): string {
  if (SELECT_IDS.has(id)) return "SELECT";
  if (TEXTAREA_IDS.has(id)) return "TEXTAREA";
  if (IMAGE_IDS.has(id)) return "IMG";
  if (BUTTON_IDS.has(id)) return "BUTTON";
  if (id.endsWith("-input") || id === "tracking" || id === "optimal" || id === "falloff" || id === "attacker-hull" || id === "target-hull" || id === "attacker-speed" || id === "attacker-mass" || id === "attacker-inertia" || id === "attacker-range" || id === "target-speed" || id === "target-mass" || id === "target-inertia" || id === "target-range" || id === "target-sig" || id === "initial-distance" || id === "maneuver-aggressivity" || id === "maneuver-aggressivity-slider" || id === "grid-brightness-slider" || id === "new-profile-name" || id === "attacker-overload" || id === "target-overload") return "INPUT";
  return "DIV";
}

export function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  const docHandlers: Record<string, Array<(event?: unknown) => void>> = {};
  return {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    getElementById: (id: string) => {
      if (!elements.has(id)) {
        const el = new FakeElement();
        el.tagName = tagForId(id);
        el.id = id;
        elements.set(id, el);
      }
      return elements.get(id) as unknown as HTMLElement;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: (tag: string) => {
      const el = new FakeElement();
      el.tagName = tag.toUpperCase();
      return el as unknown as HTMLElement;
    },
    addEventListener: (event: string, handler: (event?: unknown) => void) => { (docHandlers[event] ??= []).push(handler); },
    removeEventListener: (event: string, handler: (event?: unknown) => void) => { const hs = docHandlers[event]; if (hs) docHandlers[event] = hs.filter((h) => h !== handler); },
    dispatchEvent: (event: Event) => { docHandlers[event.type]?.forEach((h) => h(event)); },
  } as unknown as Document;
}

export function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}
