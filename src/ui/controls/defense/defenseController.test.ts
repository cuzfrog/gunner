import type { DefenseSpec } from "../../../sim";
import type { I18n } from "../../i18n";
import type { UiEvents } from "../../events";
import { FakeElement, fakeDocument } from "../../testing";
import type { Popup, PopupGroup } from "../popup";
import { DefenseControllerImpl } from "./defenseController";
import type { DefenseEls } from "./defenseControllerContract";

class FakePopupGroup implements PopupGroup {
  private readonly popups: Popup[] = [];
  register(popup: Popup): void { this.popups.push(popup); }
  open(popup: Popup): void { for (const p of this.popups) if (p !== popup && p.isOpen()) p.close(); if (!popup.isOpen()) popup.open(); }
  toggle(popup: Popup): void { if (popup.isOpen()) this.close(popup); else this.open(popup); }
  close(popup: Popup): void { if (popup.isOpen()) popup.close(); }
  closeAll(): void { for (const p of this.popups) if (p.isOpen()) p.close(); }
  hasOpen(): boolean { return this.popups.some((p) => p.isOpen()); }
  onPointerDown(): void {}
  onKeyDown(): void {}
}

function buildEls(): DefenseEls {
  return {
    shipA: { field: new FakeElement(), trigger: new FakeElement() as unknown as HTMLButtonElement, popup: new FakeElement(), section: new FakeElement(), summary: new FakeElement(), effectiveSig: new FakeElement() },
    shipB: { field: new FakeElement(), trigger: new FakeElement() as unknown as HTMLButtonElement, popup: new FakeElement(), section: new FakeElement(), summary: new FakeElement(), effectiveSig: new FakeElement() },
  };
}

function buildI18n(): I18n {
  return {
    current: vi.fn(() => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => (key === "hint.effectiveSigPenalty" ? "+{penalty}m from shield extenders" : key)),
    translateDocument: vi.fn(),
  } as unknown as I18n;
}

function buildUiEvents(): UiEvents {
  return {
    onFittingImported: vi.fn(),
    onLanguageChanged: vi.fn(),
    onProfileLoaded: vi.fn(),
    onNewProfile: vi.fn(),
    onProfileDeleted: vi.fn(),
    onProfileTextLoaded: vi.fn(),
    emitConfigInvalidated: vi.fn(),
  } as unknown as UiEvents;
}

function defenseSpecWithPenalty(penalty: number): DefenseSpec {
  return {
    layers: {
      shield: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      armor: { hp: 800, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      hull: { hp: 600, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
    },
    shieldRechargeTime: 100,
    repairers: [],
    signaturePenalty: penalty,
    shieldUniformity: 0.25,
  };
}

describe("DefenseControllerImpl.updateEffectiveSig", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  test("displays fitted sig as-is when shield extender penalty is present, without adding penalty", () => {
    const els = buildEls();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(7));
    controller.updateEffectiveSig("shipA", 42);
    expect(els.shipA.effectiveSig.textContent).toBe("42m");
    expect(els.shipA.effectiveSig.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("sets attribution hint with penalty value, not a second radius", () => {
    const els = buildEls();
    const i18n = buildI18n();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n, events: buildUiEvents() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(7));
    controller.updateEffectiveSig("shipA", 42);
    expect(els.shipA.effectiveSig.getAttribute("data-hint")).toContain("7");
    expect(els.shipA.effectiveSig.textContent).not.toContain("49");
  });

  test("clears the suffix when no shield extender penalty is present", () => {
    const els = buildEls();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(0));
    controller.updateEffectiveSig("shipA", 35);
    expect(els.shipA.effectiveSig.textContent).toBe("");
    expect(els.shipA.effectiveSig.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("applies to shipB side independently", () => {
    const els = buildEls();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents() });
    controller.setDefenseSpec("shipB", defenseSpecWithPenalty(25));
    controller.updateEffectiveSig("shipB", 300);
    expect(els.shipB.effectiveSig.textContent).toBe("300m");
    expect(els.shipB.effectiveSig.classList.add).toHaveBeenCalledWith("is-negative");
  });
});
