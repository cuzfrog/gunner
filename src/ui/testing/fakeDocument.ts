import { FakeElement } from "./fakeElement";

const SELECT_IDS = new Set(["ship-a-sigRes", "ship-b-sigRes", "ship-a-mode", "ship-b-mode", "ship-a-skills", "ship-b-skills", "ship-a-propulsion", "ship-b-propulsion", "sim-speed"]);
const TEXTAREA_IDS = new Set(["ship-a-paste-input", "ship-b-paste-input"]);
const IMAGE_IDS = new Set(["ship-a-ammo-summary-icon", "ship-b-ammo-summary-icon", "ship-a-launcher-ammo-summary-icon", "ship-b-launcher-ammo-summary-icon", "ship-a-drone-summary-icon", "ship-b-drone-summary-icon"]);
const BUTTON_IDS = new Set(["play", "reset", "canvas-settings-trigger", "profile-save", "profile-select-trigger", "profile-delete", "profile-new", "new-profile-confirm", "new-profile-save-current", "new-profile-clear-session", "share-link", "share-copy-url", "share-copy-text", "import-profile", "import-side-ship-a", "import-side-ship-b", "ship-a-import-fitting", "ship-b-import-fitting", "ship-a-ship-select-trigger", "ship-a-fitting-eye", "ship-b-ship-select-trigger", "ship-b-fitting-eye", "ship-a-ammo-trigger", "ship-a-ammo-expand", "ship-b-ammo-trigger", "ship-b-ammo-expand", "ship-a-propulsion-gear", "ship-b-propulsion-gear", "ship-a-skill-trigger", "ship-b-skill-trigger", "ship-a-overload-button", "ship-b-overload-button", "ship-a-ewar-trigger", "ship-b-ewar-trigger", "ship-a-defense-trigger", "ship-b-defense-trigger", "ship-a-tracking-unit-rad", "ship-a-tracking-unit-score", "ship-b-tracking-unit-rad", "ship-b-tracking-unit-score", "lang-en", "lang-zh", "lang-ja", "confirm-ok", "confirm-cancel", "weapon-range-button", "drone-range-button", "drone-control-range-button", "ship-a-launcher-ammo-trigger", "ship-b-launcher-ammo-trigger", "ship-a-weapon-system-turret", "ship-a-weapon-system-missile", "ship-a-weapon-system-drone", "ship-b-weapon-system-turret", "ship-b-weapon-system-missile", "ship-b-weapon-system-drone", "ship-a-launcher-attributes-trigger", "ship-b-launcher-attributes-trigger", "ship-a-launcher-variant-gear", "ship-b-launcher-variant-gear", "ship-a-turret-variant-gear", "ship-b-turret-variant-gear", "ship-a-turret-weapon-overload-button", "ship-b-turret-weapon-overload-button", "ship-a-launcher-weapon-overload-button", "ship-b-launcher-weapon-overload-button", "ship-a-drone-trigger", "ship-b-drone-trigger"]);

function tagForId(id: string): string {
  if (SELECT_IDS.has(id)) return "SELECT";
  if (TEXTAREA_IDS.has(id)) return "TEXTAREA";
  if (IMAGE_IDS.has(id)) return "IMG";
  if (BUTTON_IDS.has(id)) return "BUTTON";
  if (id.endsWith("-input") || id === "ship-a-tracking" || id === "ship-b-tracking" || id === "ship-a-optimal" || id === "ship-b-optimal" || id === "ship-a-falloff" || id === "ship-b-falloff" || id === "ship-a-hull" || id === "ship-b-hull" || id === "ship-a-speed" || id === "ship-a-mass" || id === "ship-a-inertia" || id === "ship-a-range" || id === "ship-a-aggressivity" || id === "ship-a-aggressivity-slider" || id === "ship-a-sig" || id === "ship-b-speed" || id === "ship-b-mass" || id === "ship-b-inertia" || id === "ship-b-range" || id === "ship-b-aggressivity" || id === "ship-b-aggressivity-slider" || id === "ship-b-sig" || id === "initial-distance" || id === "grid-brightness-slider" || id === "zoom-slider" || id === "auto-zoom" || id === "new-profile-name" || id === "ship-a-overload" || id === "ship-b-overload") return "INPUT";
  return "DIV";
}

export function fakeDocument(): Document {
  const elements = new Map<string, FakeElement>();
  const docHandlers: Record<string, Array<(event?: unknown) => void>> = {};
  globalThis.Element = FakeElement as unknown as typeof Element;
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement;
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
    createDocumentFragment: () => {
      const fragment = new FakeElement();
      fragment.tagName = "DOCUMENT_FRAGMENT";
      fragment.nodeType = 11;
      return fragment as unknown as DocumentFragment;
    },
    createTextNode: (data: string) => {
      const node = new FakeElement();
      node.tagName = "#text";
      node.textContent = data;
      node.nodeType = 3;
      return node as unknown as Text;
    },
    addEventListener: (event: string, handler: (event?: unknown) => void, options?: { readonly signal?: AbortSignal }) => {
      if (options?.signal?.aborted) return;
      (docHandlers[event] ??= []).push(handler);
      if (options?.signal) {
        options.signal.addEventListener("abort", () => {
          const hs = docHandlers[event];
          if (hs) docHandlers[event] = hs.filter((h) => h !== handler);
        });
      }
    },
    removeEventListener: (event: string, handler: (event?: unknown) => void) => { const hs = docHandlers[event]; if (hs) docHandlers[event] = hs.filter((h) => h !== handler); },
    dispatchEvent: (event: Event) => { docHandlers[event.type]?.forEach((h) => h(event)); },
  } as unknown as Document;
}

export function getFake(document: Document, id: string): FakeElement {
  return document.getElementById(id) as unknown as FakeElement;
}
