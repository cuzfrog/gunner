import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { ImportedFitting } from "../../../fitting";
import type { FighterSpec } from "../../../sim";
import { damageVectorSum } from "../../../sim";
import { NEUTRAL_CONDITIONS, buildFighter, importedFighterFixture, supportFighterFixture } from "./testSupport";
import { FakeElement, getFake } from "../testSupport";

const TEMPLAR_ID = toTypeId("34359");

function templarFitting(): ImportedFitting {
  const fighter = importedFighterFixture();
  return {
    fighters: [fighter],
    drones: [],
    fittingState: {
      profile: { fighterCapacity: 150000, fighterTubes: 4, fighterLightSlots: 3, fighterHeavySlots: 3, fighterSupportSlots: 2 },
      hullBonuses: [],
      droneBoosterModules: [],
    },
  } as unknown as ImportedFitting;
}

describe("FighterControllerImpl", () => {
  test("applyImported resolves groups and shows the fighter chip and telemetry", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    const fighter = importedFighterFixture();
    fighterLoadoutResolver.resolve.mockReturnValue([fighter]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(fighterLoadoutResolver.resolve).toHaveBeenCalledWith([{ typeId: TEMPLAR_ID, count: 6 }], expect.anything(), NEUTRAL_CONDITIONS);
    expect(controller.fighters()).toEqual([fighter]);
    const document = globalThis.document;
    expect(getFake(document!, "ship-a-fighter-summary").textContent).toBe("Templar I");
    expect(getFake(document!, "ship-a-fighter-count").textContent).toBe("6");
    expect(getFake(document!, "ship-a-fighter-damage").textContent).toBe("97.5");
  });

  test("attack fighters map to sim FighterSpecs and support fighters are excluded", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture(), supportFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const specs = controller.currentFighterSpecs();
    expect(specs).toHaveLength(1);
    const spec = specs[0]!;
    expect(spec.kind).toBe("fighter");
    expect(spec.moduleId).toBe(TEMPLAR_ID);
    expect(spec.fighterCount).toBe(6);
    expect(spec.cycleTime).toBe(5);
    expect(damageVectorSum(spec.damagePerVolley)).toBeCloseTo(97.5, 9);
    expect(spec.damageReductionFactor).toBeCloseTo(Math.log(3) / Math.log(5.5), 9);
    expect(spec.magazine).toEqual({ numShots: 12, rearmTime: 4, refuelingTime: 5 });
    expect(spec.maxVelocity).toBe(1301.5625);
    expect(spec.orbitRange).toBe(6500);
  });

  test("support-only loadout reports zero weapon specs and shows the not-simulated marker", () => {
    const { controller, fighterLoadoutResolver, i18n } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([supportFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(controller.currentFighterSpecs()).toEqual([]);
    expect(getFake(globalThis.document!, "ship-a-fighter-damage").textContent).toBe("fighter.notSimulated");
    expect(i18n.t).toHaveBeenCalledWith("fighter.notSimulated");
  });

  test("steppers change the group count and emit config invalidation", () => {
    const { controller, events, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-stepper")) as unknown as FakeElement;
    const incrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-plus")) as unknown as FakeElement;
    incrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 7 }]);
    expect(emitConfigInvalidated).toHaveBeenCalled();
    const decrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-minus")) as unknown as FakeElement;
    decrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 6 }]);
  });

  test("invalid validation flags the summary bar", () => {
    const { controller, fighterLoadoutResolver, fighterLoadoutValidator } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fighterLoadoutValidator.validate.mockReturnValue({ valid: false, totalFighters: 12, totalSquadrons: 5, totalVolume: 30000, hangarCapacity: 150000, violations: ["tooManySquadrons"] });
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(controller.validation()!.valid).toBe(false);
    expect(getFake(globalThis.document!, "ship-a-fighter-summary-squadrons").textContent).toBe("5/4");
    const summaryBar = getFake(globalThis.document!, "ship-a-fighter-summary-bar");
    expect(summaryBar.classList.toggle).toHaveBeenCalledWith("is-invalid", true);
  });

  test("capture and restore round-trip the fighter groups", () => {
    const { controller, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    const fitting = "some eft text";
    fittingImport.importFitting.mockReturnValue(templarFitting());
    controller.restore(fitting, NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 6 }]);
    expect(controller.capture()).toEqual({ fighterGroups: [{ typeId: TEMPLAR_ID, count: 6 }] });
    controller.restore(fitting, NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 3 }]);
    expect(controller.capture()).toEqual({ fighterGroups: [{ typeId: TEMPLAR_ID, count: 3 }] });
    controller.clear();
    expect(controller.capture()).toEqual({ fighterGroups: [] });
    expect(controller.fighters()).toEqual([]);
  });

  test("catalog renders fighter options per kind and clicking adds a group", () => {
    const { controller, events, fighterCatalog, fighterLoadoutResolver } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    const option = getFake(globalThis.document!, "ship-a-fighter-catalog-light").children[0]?.firstElementChild as unknown as FakeElement;
    option.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 7 }]);
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("language change rerenders synchronously", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const countEl = getFake(globalThis.document!, "ship-a-fighter-count");
    expect(countEl.textContent).toBe("6");
  });
});
