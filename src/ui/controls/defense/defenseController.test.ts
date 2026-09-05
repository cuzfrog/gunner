import { type DefenseAssessment, type DefenseAssessor, type DefenseSpec, type DefenseView, type EngagementView, ZERO_DAMAGE } from "../../../sim";
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

function defaultAssessor(): DefenseAssessor {
  return { assess: vi.fn(() => ({ layers: { shield: { layer: "shield", hp: 0, ehp: 0 }, armor: { layer: "armor", hp: 0, ehp: 0 }, hull: { layer: "hull", hp: 0, ehp: 0 } }, totalEhp: 0, repairPerSecond: { shield: 0, armor: 0, hull: 0 }, shieldRegenPerSecond: 0 })) } as unknown as DefenseAssessor;
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
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: defaultAssessor() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(7));
    controller.updateEffectiveSig("shipA", 42);
    expect(els.shipA.effectiveSig.textContent).toBe("42m");
    expect(els.shipA.effectiveSig.classList.add).toHaveBeenCalledWith("is-negative");
  });

  test("sets attribution hint with penalty value, not a second radius", () => {
    const els = buildEls();
    const i18n = buildI18n();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n, events: buildUiEvents(), defenseAssessor: defaultAssessor() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(7));
    controller.updateEffectiveSig("shipA", 42);
    expect(els.shipA.effectiveSig.getAttribute("data-hint")).toContain("7");
    expect(els.shipA.effectiveSig.textContent).not.toContain("49");
  });

  test("clears the suffix when no shield extender penalty is present", () => {
    const els = buildEls();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: defaultAssessor() });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(0));
    controller.updateEffectiveSig("shipA", 35);
    expect(els.shipA.effectiveSig.textContent).toBe("");
    expect(els.shipA.effectiveSig.classList.remove).toHaveBeenCalledWith("is-negative");
  });

  test("applies to shipB side independently", () => {
    const els = buildEls();
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: defaultAssessor() });
    controller.setDefenseSpec("shipB", defenseSpecWithPenalty(25));
    controller.updateEffectiveSig("shipB", 300);
    expect(els.shipB.effectiveSig.textContent).toBe("300m");
    expect(els.shipB.effectiveSig.classList.add).toHaveBeenCalledWith("is-negative");
  });
});

describe("DefenseControllerImpl EHP and repairer HP/s", () => {
  beforeEach(() => {
    globalThis.document = fakeDocument();
    globalThis.Element = FakeElement as unknown as typeof Element;
    globalThis.HTMLButtonElement = FakeElement as unknown as typeof HTMLButtonElement;
  });

  function defenseSpecWithRepairer(overloadAmountMultiplier = 1.5, overloadCycleMultiplier = 0.75): DefenseSpec {
    return {
      layers: {
        shield: { hp: 1000, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
        armor: { hp: 800, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
        hull: { hp: 600, resists: { em: 0, thermal: 0, kinetic: 0, explosive: 0 } },
      },
      shieldRechargeTime: 100,
      repairers: [{
        layer: "armor",
        amount: 100,
        cycleTime: 4,
        overload: { amountMultiplier: overloadAmountMultiplier, cycleTimeMultiplier: overloadCycleMultiplier },
      }],
      signaturePenalty: 0,
      shieldUniformity: 0.25,
    };
  }

  function fakeAssessor(assessment: DefenseAssessment): DefenseAssessor {
    return { assess: vi.fn(() => assessment) } as unknown as DefenseAssessor;
  }

  function fakeEngagementView(totalEhp: number, incomingEm = 0, incomingThermal = 0, incomingKinetic = 0, incomingExplosive = 0): EngagementView {
    const assessment: DefenseAssessment = {
      layers: {
        shield: { layer: "shield", hp: 1000, ehp: Math.round(1000 / 0.25) },
        armor: { layer: "armor", hp: 800, ehp: Math.round(800 / 0.25) },
        hull: { layer: "hull", hp: 600, ehp: Math.round(600 / 0.25) },
      },
      totalEhp,
      repairPerSecond: { shield: 0, armor: 0, hull: 0 },
      shieldRegenPerSecond: 0,
    };
    return { defenses: { shipA: assessment, shipB: assessment } } as unknown as EngagementView;
  }

  test("summary EHP uses the assessment totalEhp when a view is available", () => {
    const els = buildEls();
    const assessor = fakeAssessor({
      layers: { shield: { layer: "shield", hp: 0, ehp: 0 }, armor: { layer: "armor", hp: 0, ehp: 0 }, hull: { layer: "hull", hp: 0, ehp: 0 } },
      totalEhp: 9999, repairPerSecond: { shield: 0, armor: 0, hull: 0 }, shieldRegenPerSecond: 0,
    });
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: assessor });
    controller.setDefenseSpec("shipA", defenseSpecWithPenalty(0));
    controller.updateAssessments(fakeEngagementView(9999));
    controller.updateSummaries();
    expect(findSummaryText(els.shipA.summary)).toContain("9,999");
  });

  test("summary EHP falls back to assessor with uniform shares when no view exists", () => {
    const els = buildEls();
    const spec = defenseSpecWithPenalty(0);
    const expectedEhp = 1000 + 800 + 600;
    const assessor = fakeAssessor({
      layers: { shield: { layer: "shield", hp: 1000, ehp: 1000 }, armor: { layer: "armor", hp: 800, ehp: 800 }, hull: { layer: "hull", hp: 600, ehp: 600 } },
      totalEhp: expectedEhp, repairPerSecond: { shield: 0, armor: 0, hull: 0 }, shieldRegenPerSecond: 0,
    });
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: assessor });
    controller.setDefenseSpec("shipA", spec);
    controller.updateSummaries();
    expect(findSummaryText(els.shipA.summary)).toContain("2,400");
    expect(assessor.assess).toHaveBeenCalledWith(spec, ZERO_DAMAGE, true);
  });

  test("repairer HP/s uses defenseView hpPerSecond which includes overload multiplier", () => {
    const els = buildEls();
    const spec = defenseSpecWithRepairer();
    const assessor = fakeAssessor({
      layers: { shield: { layer: "shield", hp: 0, ehp: 0 }, armor: { layer: "armor", hp: 0, ehp: 0 }, hull: { layer: "hull", hp: 0, ehp: 0 } },
      totalEhp: 0, repairPerSecond: { shield: 0, armor: 0, hull: 0 }, shieldRegenPerSecond: 0,
    });
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: assessor });
    controller.setDefenseSpec("shipA", spec);
    const expectedHpPerSecond = (100 * 1.5) / (4 * 0.75);
    const defenseView: DefenseView = {
      pools: {} as never, poolPercentages: {} as never, dead: { shipA: false, shipB: false }, deadAt: { shipA: undefined, shipB: undefined },
      damageEnabled: { shipA: true, shipB: true }, shieldRegenPerSecond: { shipA: 0, shipB: 0 },
      repairers: { shipA: [{ layer: "armor", cycling: false, cycleProgress: 0, ancillaryCharges: undefined, reloading: false, active: true, overloaded: true, hpPerSecond: expectedHpPerSecond }], shipB: [] },
      repairMode: { shipA: "auto", shipB: "auto" }, rah: { shipA: undefined, shipB: undefined },
    } as unknown as DefenseView;
    controller.updateDefenseView(defenseView);
    controller.render();
    const statsText = findRepairerStatsText(els.shipA.section);
    expect(statsText).toContain(expectedHpPerSecond.toFixed(1));
    expect(statsText).not.toContain((100 / 4).toFixed(1));
  });

  test("repairer HP/s falls back to spec amount/cycleTime when no defenseView exists", () => {
    const els = buildEls();
    const spec = defenseSpecWithRepairer();
    const assessor = fakeAssessor({
      layers: { shield: { layer: "shield", hp: 0, ehp: 0 }, armor: { layer: "armor", hp: 0, ehp: 0 }, hull: { layer: "hull", hp: 0, ehp: 0 } },
      totalEhp: 0, repairPerSecond: { shield: 0, armor: 0, hull: 0 }, shieldRegenPerSecond: 0,
    });
    const controller = new DefenseControllerImpl({ els, popupGroup: new FakePopupGroup(), i18n: buildI18n(), events: buildUiEvents(), defenseAssessor: assessor });
    controller.setDefenseSpec("shipA", spec);
    controller.render();
    const statsText = findRepairerStatsText(els.shipA.section);
    expect(statsText).toContain((100 / 4).toFixed(1));
  });
});

function findRepairerStatsText(root: FakeElement): string {
  for (const child of root.children) {
    if (child.className.includes("defense-repairer-stats")) return child.textContent;
    const found = findRepairerStatsText(child);
    if (found) return found;
  }
  return "";
}

function findSummaryText(root: FakeElement): string {
  for (const child of root.children) {
    if (child.textContent) return child.textContent;
    const found = findSummaryText(child);
    if (found) return found;
  }
  return "";
}
