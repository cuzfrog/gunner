import { fakeDocument, getFake } from "../../testing";
import { UiEventsImpl } from "../../events";
import type { EwarProjection, EwarResolver } from "../../../sim";
import type { EwarController } from "../ewar";
import type { ImageCatalog } from "../../icons";
import type { ShipProfile } from "../../../ships";
import { PortraitsControllerImpl } from "./portraitsController";
import type { PortraitsController, PortraitsEls, CombatantProfiles } from "./portraitsControllerContract";

const ATTACKER_PROFILE: ShipProfile = {
  name: "Rifter", faction: "Minmatar", hullType: "Frigate", mass: 1_000_000, inertiaModifier: 3, baseSpeed: 300, sigRadius: 36,
};
const TARGET_PROFILE: ShipProfile = {
  name: "Merlin", faction: "Caldari", hullType: "Frigate", mass: 1_000_000, inertiaModifier: 3, baseSpeed: 300, sigRadius: 36,
};

function createFakePortraitEls(document: Document): PortraitsEls {
  const attackerRoot = getFake(document, "attacker-portrait");
  const attackerImage = document.createElement("img");
  attackerImage.className = "portrait-image";
  attackerRoot.appendChild(attackerImage);
  const attackerEffects = document.createElement("div");
  attackerEffects.className = "portrait-effects";
  attackerRoot.appendChild(attackerEffects);
  const targetRoot = getFake(document, "target-portrait");
  const targetImage = document.createElement("img");
  targetImage.className = "portrait-image";
  targetRoot.appendChild(targetImage);
  const targetEffects = document.createElement("div");
  targetEffects.className = "portrait-effects";
  targetRoot.appendChild(targetEffects);
  return {
    attacker: attackerRoot as unknown as HTMLElement,
    target: targetRoot as unknown as HTMLElement,
    attackerImage: attackerImage as unknown as HTMLImageElement,
    targetImage: targetImage as unknown as HTMLImageElement,
    attackerEffects,
    targetEffects,
  };
}

function buildController() {
  const document = fakeDocument();
  globalThis.document = document;
  const els = createFakePortraitEls(document);
  const profiles: Record<"attacker" | "target", ShipProfile | undefined> = { attacker: undefined, target: undefined };
  const combatantProfiles: CombatantProfiles = { profile: (side) => profiles[side] };
  const projections: Record<"attacker" | "target", EwarProjection | undefined> = { attacker: undefined, target: undefined };
  const ewarController = vi.mocked<EwarController>({
    setLoadout: vi.fn(),
    restore: vi.fn(),
    projection: vi.fn((side: "attacker" | "target") => projections[side]),
    capture: vi.fn(),
    render: vi.fn(),
    updateSummaries: vi.fn(),
  });
  const ewarResolver = vi.mocked<EwarResolver>({
    speedMultiplier: vi.fn(() => 1),
    speedMultiplierIgnoringRange: vi.fn(() => 1),
    disruptedTurret: vi.fn((turret) => turret),
    disruptedTurretIgnoringRange: vi.fn((turret) => turret),
    propulsionSuppressed: vi.fn(() => false),
    propulsionSuppressedIgnoringRange: vi.fn(() => false),
    appliedEffects: vi.fn(() => []),
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((name) => `images/ships/${name.replaceAll(" ", "_")}.webp`),
    itemIconUrl: vi.fn((name) => (name === "Stasis Webifier II" ? "images/icons/1234@1x.png" : undefined)),
    droneIconUrl: vi.fn(),
  });
  const events = new UiEventsImpl();
  const createElementSpy = vi.spyOn(document, "createElement");
  const controller = new PortraitsControllerImpl({
    els,
    imageCatalog,
    ewarController,
    ewarResolver,
    combatantProfiles,
    events,
  });
  return { controller, els, profiles, projections, ewarController, ewarResolver, imageCatalog, events, createElementSpy };
}

describe("PortraitsController", () => {
  test("both sides without profiles stay hidden with empty effect rows", () => {
    const { els } = buildController();
    expect(els.attacker.hidden).toBe(true);
    expect(els.target.hidden).toBe(true);
    expect(els.attackerEffects.children.length).toBe(0);
    expect(els.targetEffects.children.length).toBe(0);
  });

  test("attacker profile becomes visible and sets the ship image", () => {
    const { controller, els, profiles } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    controller.update();
    expect(els.attacker.hidden).toBe(false);
    expect(els.attackerImage.src).toBe("images/ships/Rifter.webp");
  });

  test("target projection web at current distance shows icon under attacker portrait", () => {
    const { controller, els, profiles, projections, ewarResolver } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    projections.target = {
      loadout: {
        webs: [{ moduleName: "Stasis Webifier II", maxRange: 10000, speedFactor: 0.6, overloadRangeBonusPercent: 30 }],
        grapplers: [], disruptors: [], scramblers: [], scripts: [],
      },
      activation: {
        webs: [{ active: true, overloaded: false }],
        grapplers: [], disruptors: [], scramblers: [],
      },
    };
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Stasis Webifier II" }]);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    expect(els.attackerEffects.children[0].tagName).toBe("IMG");
    expect((els.attackerEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    expect(els.targetEffects.children.length).toBe(0);
  });

  test("attacker projection scrambler at current distance shows icon under target portrait", () => {
    const { controller, els, profiles, projections, ewarResolver, imageCatalog } = buildController();
    profiles.target = TARGET_PROFILE;
    projections.attacker = {
      loadout: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ moduleName: "Warp Scrambler II", maxRange: 9000, overloadRangeBonusPercent: 20 }],
        scripts: [],
      },
      activation: {
        webs: [], grapplers: [], disruptors: [],
        scramblers: [{ active: true, overloaded: false }],
      },
    };
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === "Warp Scrambler II" ? "images/icons/5678@1x.png" : undefined));
    ewarResolver.appliedEffects.mockImplementation((projection) => {
      if (projection === projections.attacker) return [{ family: "scrambler", moduleName: "Warp Scrambler II" }];
      return [];
    });
    controller.update();
    expect(els.target.hidden).toBe(false);
    expect(els.targetEffects.children.length).toBe(1);
    expect((els.targetEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/5678@1x.png");
  });

  test("out-of-range projection leaves effect rows empty while portraits stay visible", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([]);
    controller.update();
    expect(els.attacker.hidden).toBe(false);
    expect(els.attackerEffects.children.length).toBe(0);
  });

  test("resolver returning a single web for a loadout with two webs appends one icon", () => {
    const { controller, els, profiles, ewarResolver } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Stasis Webifier II" }]);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
  });

  test("itemIconUrl returning undefined skips that icon but appends the rest", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) => (name === "Stasis Webifier II" ? undefined : "images/icons/2@1x.png"));
    ewarResolver.appliedEffects.mockReturnValue([
      { family: "web", moduleName: "Stasis Webifier II" },
      { family: "scrambler", moduleName: "Warp Scrambler II" },
    ]);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    expect((els.attackerEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/2@1x.png");
  });

  test("removing a profile hides the portrait on the next update", () => {
    const { controller, els, profiles } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    controller.update();
    expect(els.attacker.hidden).toBe(false);
    profiles.attacker = undefined;
    controller.update();
    expect(els.attacker.hidden).toBe(true);
  });

  test("distance changes that do not change the applied set do not create new img elements", () => {
    const { controller, els, profiles, ewarResolver, events, createElementSpy } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Stasis Webifier II" }]);
    events.emitDistanceChanged(5000);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    const imageCount = createElementSpy.mock.calls.filter(([tag]) => tag === "img").length;
    events.emitDistanceChanged(6000);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    expect(createElementSpy.mock.calls.filter(([tag]) => tag === "img").length).toBe(imageCount);
  });

  test("same family with a different representative module rewrites the icon", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    imageCatalog.itemIconUrl.mockImplementation((name) =>
      name === "Stasis Webifier II" ? "images/icons/1234@1x.png" : "images/icons/fallback@1x.png"
    );
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Stasis Webifier II" }]);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    expect((els.attackerEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/1234@1x.png");
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Shadow Serpentis Stasis Webifier" }]);
    controller.update();
    expect(els.attackerEffects.children.length).toBe(1);
    expect((els.attackerEffects.children[0] as unknown as HTMLImageElement).src).toBe("images/icons/fallback@1x.png");
  });

  test("name unchanged but families changed rebuilds effects without rewriting image src", () => {
    const { controller, els, profiles, ewarResolver, imageCatalog } = buildController();
    profiles.attacker = ATTACKER_PROFILE;
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.appliedEffects.mockReturnValue([{ family: "web", moduleName: "Stasis Webifier II" }]);
    controller.update();
    expect(els.attackerImage.src).toBe("images/ships/Rifter.webp");
    expect(els.attackerEffects.children.length).toBe(1);
    imageCatalog.shipImageUrl.mockClear();
    ewarResolver.appliedEffects.mockReturnValue([
      { family: "web", moduleName: "Stasis Webifier II" },
      { family: "scrambler", moduleName: "Warp Scrambler II" },
    ]);
    controller.update();
    expect(imageCatalog.shipImageUrl).not.toHaveBeenCalled();
    expect(els.attackerImage.src).toBe("images/ships/Rifter.webp");
    expect(els.attackerEffects.children.length).toBe(1);
  });
});
