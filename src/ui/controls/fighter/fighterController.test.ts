import { toTypeId, type TypeId } from "../../../gamedata/ids";
import type { StatConditions } from "../../../ships";
import type { ImportedFitting } from "../../../fitting";
import type { FighterSpec } from "../../../sim";
import { damageVectorSum } from "../../../sim";
import { NEUTRAL_CONDITIONS, buildFighter, importedFighterFixture, supportFighterFixture } from "./testSupport";
import { FakeElement, getFake } from "../testSupport";

const TEMPLAR_ID = toTypeId("34359");

function templarFitting(fighters = [importedFighterFixture()]): ImportedFitting {
  return {
    fighters,
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
    expect(fighterLoadoutResolver.resolve).toHaveBeenCalledWith([{ typeId: TEMPLAR_ID, count: 6, activeCount: 6 }], expect.anything(), NEUTRAL_CONDITIONS);
    expect(controller.fighters()).toEqual([fighter]);
    const document = globalThis.document;
    expect(getFake(document!, "ship-a-fighter-summary").textContent).toBe("Templar I");
    expect(getFake(document!, "ship-a-fighter-count").textContent).toBe("6");
    expect(getFake(document!, "ship-a-fighter-damage").textContent).toBe("97.5");
  });

  test("attack fighters map to sim FighterSpecs and support fighters are excluded", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture({ shieldHp: 3285, armorHp: 0, hullHp: 100 }), supportFighterFixture()]);
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
    expect(spec.hp).toEqual({ shield: 3285, armor: 0, hull: 100 });
  });

  test("fighters without durability stats map specs without hp", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(controller.currentFighterSpecs()[0]!.hp).toBeUndefined();
  });

  test("support-only loadout reports zero weapon specs and shows the not-simulated marker", () => {
    const { controller, fighterLoadoutResolver, i18n } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([supportFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(controller.currentFighterSpecs()).toEqual([]);
    expect(getFake(globalThis.document!, "ship-a-fighter-damage").textContent).toBe("fighter.notSimulated");
    expect(i18n.t).toHaveBeenCalledWith("fighter.notSimulated");
  });

  test("bay stepper plus adds to the hangar and auto-launches within budget", () => {
    const { controller, events, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const emitConfigInvalidated = vi.spyOn(events, "emitConfigInvalidated");
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-bay-stepper")) as unknown as FakeElement;
    const incrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-plus")) as unknown as FakeElement;
    incrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 7, activeCount: 7 }]);
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("bay stepper minus removes one from the hangar and clamps the launched count", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-bay-stepper")) as unknown as FakeElement;
    const decrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-minus")) as unknown as FakeElement;
    decrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 5, activeCount: 5 }]);
  });

  test("decrementing a fighter count to zero removes the group", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture({ count: 1 })]);
    controller.applyImported(templarFitting([importedFighterFixture({ count: 1 })]), NEUTRAL_CONDITIONS);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-bay-stepper")) as unknown as FakeElement;
    const decrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-minus")) as unknown as FakeElement;
    decrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([]);
  });

  test("bay increment stores the fighter idle when the squadron budget is exhausted", () => {
    const valid = { valid: true, totalFighters: 6, activeFighters: 6, activeSquadrons: 1, totalVolume: 15000, hangarCapacity: 150000, violations: [] as const };
    const overBudget = { valid: false, totalFighters: 7, activeFighters: 7, activeSquadrons: 2, totalVolume: 17500, hangarCapacity: 150000, violations: ["lightSquadronsExceeded"] as const };
    const { controller, fighterLoadoutResolver, fighterLoadoutValidator } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fighterLoadoutValidator.validate.mockReturnValueOnce(valid).mockReturnValueOnce(overBudget).mockReturnValue(valid);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-bay-stepper")) as unknown as FakeElement;
    const incrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-plus")) as unknown as FakeElement;
    incrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 7, activeCount: 6 }]);
    expect(fighterLoadoutValidator.validate).toHaveBeenCalledTimes(3);
  });

  test("launched stepper launches a full squadron", () => {
    const { controller, fighterCatalog, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fittingImport.importFitting.mockReturnValue(templarFitting());
    controller.restore("some eft text", NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 12, activeCount: 0 }]);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-launched-stepper")) as unknown as FakeElement;
    const incrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-plus")) as unknown as FakeElement;
    incrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 12, activeCount: 6 }]);
  });

  test("launched stepper clamps at the hangar count", () => {
    const { controller, fighterCatalog, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fittingImport.importFitting.mockReturnValue(templarFitting());
    controller.restore("some eft text", NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 8, activeCount: 6 }]);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-launched-stepper")) as unknown as FakeElement;
    const incrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-plus")) as unknown as FakeElement;
    incrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 8, activeCount: 8 }]);
  });

  test("launched stepper recalls a full squadron", () => {
    const { controller, fighterCatalog, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fittingImport.importFitting.mockReturnValue(templarFitting());
    controller.restore("some eft text", NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 12, activeCount: 12 }]);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-launched-stepper")) as unknown as FakeElement;
    const decrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-minus")) as unknown as FakeElement;
    decrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 12, activeCount: 6 }]);
  });

  test("launched stepper does not recall below zero", () => {
    const { controller, fighterCatalog, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture({ count: 3 })]);
    fittingImport.importFitting.mockReturnValue(templarFitting([importedFighterFixture({ count: 3 })]));
    controller.restore("some eft text", NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 3, activeCount: 3 }]);
    const loadoutList = getFake(globalThis.document!, "ship-a-fighter-loadout-list");
    const row = loadoutList.children[0] as unknown as FakeElement;
    const stepper = row.children.find((c) => c.className.split(" ").includes("drone-launched-stepper")) as unknown as FakeElement;
    const decrementBtn = stepper.children.find((c) => c.className.split(" ").includes("drone-stepper-minus")) as unknown as FakeElement;
    decrementBtn.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 3, activeCount: 0 }]);
  });

  test("launch all launches every stored fighter", () => {
    const cenobite = supportFighterFixture({ count: 3 });
    const { controller, fighterLoadoutResolver, fittingImport } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture(), cenobite]);
    fittingImport.importFitting.mockReturnValue(templarFitting([importedFighterFixture(), cenobite]));
    controller.restore("some eft text", NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 6, activeCount: 2 }, { typeId: cenobite.typeId, count: 3, activeCount: 0 }]);
    const launchAll = getFake(globalThis.document!, "ship-a-fighter-launch-all") as unknown as FakeElement & { disabled: boolean };
    expect(launchAll.disabled).toBe(false);
    launchAll.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 6, activeCount: 6 }, { typeId: cenobite.typeId, count: 3, activeCount: 3 }]);
  });

  test("recall all recalls every launched fighter and resolves nothing", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    vi.mocked(fighterLoadoutResolver.resolve).mockClear();
    const recallAll = getFake(globalThis.document!, "ship-a-fighter-recall-all") as unknown as FakeElement;
    recallAll.trigger("click");
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 6, activeCount: 0 }]);
    expect(vi.mocked(fighterLoadoutResolver.resolve).mock.calls.at(-1)?.[0]).toEqual([{ typeId: TEMPLAR_ID, count: 6, activeCount: 0 }]);
  });

  test("launch and recall buttons are disabled when the hangar is empty and enabled after import", () => {
    const { controller } = buildFighter();
    const launchAll = getFake(globalThis.document!, "ship-a-fighter-launch-all");
    const recallAll = getFake(globalThis.document!, "ship-a-fighter-recall-all");
    expect(launchAll.disabled).toBe(true);
    expect(recallAll.disabled).toBe(true);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    expect(launchAll.disabled).toBe(false);
    expect(recallAll.disabled).toBe(false);
  });

  test("invalid validation flags the summary bar", () => {
    const { controller, fighterLoadoutResolver, fighterLoadoutValidator } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    fighterLoadoutValidator.validate.mockReturnValue({ valid: false, totalFighters: 12, activeFighters: 12, activeSquadrons: 5, totalVolume: 30000, hangarCapacity: 150000, violations: ["tooManySquadrons"] });
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
    controller.restore(fitting, NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 6, activeCount: 6 }]);
    expect(controller.capture()).toEqual({ fighterGroups: [{ typeId: TEMPLAR_ID, count: 6, activeCount: 6 }] });
    controller.restore(fitting, NEUTRAL_CONDITIONS, [{ typeId: TEMPLAR_ID, count: 3, activeCount: 3 }]);
    expect(controller.capture()).toEqual({ fighterGroups: [{ typeId: TEMPLAR_ID, count: 3, activeCount: 3 }] });
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
    expect(controller.capture().fighterGroups).toEqual([{ typeId: TEMPLAR_ID, count: 7, activeCount: 7 }]);
    expect(emitConfigInvalidated).toHaveBeenCalled();
  });

  test("language change rerenders synchronously", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const countEl = getFake(globalThis.document!, "ship-a-fighter-count");
    expect(countEl.textContent).toBe("6");
  });

  test("updateConditions re-resolves the squadrons under the new conditions and preserves user additions", () => {
    const { controller, fighterCatalog, fighterLoadoutResolver, events } = buildFighter();
    fighterCatalog.fightersByKind.mockImplementation((kind) => kind === "light" ? [{ id: TEMPLAR_ID, name: "Templar I", kind: "light", damage: 97.5, damageByType: { em: 97.5 }, volume: 2500, squadronMaxSize: 6 }] : []);
    fighterLoadoutResolver.resolve.mockReturnValue([importedFighterFixture()]);
    controller.applyImported(templarFitting(), NEUTRAL_CONDITIONS);
    const option = getFake(globalThis.document!, "ship-a-fighter-catalog-light").children[0]?.firstElementChild as unknown as FakeElement;
    option.trigger("click");
    const resolveSpy = vi.mocked(fighterLoadoutResolver.resolve);
    resolveSpy.mockClear();
    const emitSpy = vi.spyOn(events, "emitConfigInvalidated");
    const conditions: StatConditions = { skillLevel: 4, overloaded: true, weaponOverloaded: false };
    controller.updateConditions(conditions);
    expect(resolveSpy.mock.calls[0]?.[2]).toBe(conditions);
    expect(resolveSpy.mock.calls[0]?.[0]).toEqual([{ typeId: TEMPLAR_ID, count: 7, activeCount: 7 }]);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  test("updateConditions without an imported fitting still stores the conditions and does not resolve", () => {
    const { controller, fighterLoadoutResolver } = buildFighter();
    controller.updateConditions({ skillLevel: 4, overloaded: false, weaponOverloaded: false });
    expect(fighterLoadoutResolver.resolve).not.toHaveBeenCalled();
  });
});
