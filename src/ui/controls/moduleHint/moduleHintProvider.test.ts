import type { FittingDb, FittingModuleStats } from "../../../gamedata/fittingDb";
import type { Language } from "../../i18n";
import type { StatHintModel, StatHintRenderer } from "../statHint";
import { ModuleHintProviderImpl } from "./moduleHintProvider";

interface FakeElement {
  readonly tagName: string;
  getAttribute(name: string): string | null;
}

function fakeAnchor(value: string | null): HTMLElement {
  const attrs = new Map<string, string>();
  if (value !== null) attrs.set("data-value", value);
  return {
    tagName: "button",
    getAttribute: (name: string) => attrs.get(name) ?? null,
  } as unknown as HTMLElement;
}

function makeModule(family: Partial<FittingModuleStats>, id = "532"): FittingModuleStats {
  return { id, name: "Module", ...family } as FittingModuleStats;
}

interface DbFixture {
  readonly modules?: Readonly<Record<string, FittingModuleStats>>;
  readonly trackingComputers?: Readonly<Record<string, object>>;
  readonly missileGuidanceComputers?: Readonly<Record<string, object>>;
  readonly missileGuidanceEnhancers?: Readonly<Record<string, object>>;
}

function makeFittingDb(fixture: DbFixture): FittingDb {
  return {
    modules: fixture.modules ?? {},
    trackingComputers: fixture.trackingComputers ?? {},
    missileGuidanceComputers: fixture.missileGuidanceComputers ?? {},
    missileGuidanceEnhancers: fixture.missileGuidanceEnhancers ?? {},
  } as unknown as FittingDb;
}

function makeRenderer(): { renderer: StatHintRenderer; models: StatHintModel[] } {
  const models: StatHintModel[] = [];
  const renderer: StatHintRenderer = {
    render: (model: StatHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

function makeProvider(fixture: DbFixture): { provider: ModuleHintProviderImpl; models: StatHintModel[] } {
  const { renderer, models } = makeRenderer();
  const i18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => key), translateDocument: vi.fn() };
  const provider = new ModuleHintProviderImpl({ fittingDb: makeFittingDb(fixture), i18n, statHintRenderer: renderer });
  return { provider, models };
}

function renderModel(fixture: DbFixture, id: string): StatHintModel | undefined {
  const { provider, models } = makeProvider(fixture);
  provider.render(fakeAnchor(id), {} as HTMLElement);
  return models[0];
}

describe("ModuleHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { provider, models } = makeProvider({ modules: { "532": makeModule({}) } });
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when the module is unknown", () => {
    const { provider, models } = makeProvider({});
    provider.render(fakeAnchor("999999"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing for modules without a supported family", () => {
    const model = renderModel({ modules: { "532": makeModule({ capacitor: { kind: "capacitorRecharger", rechargeMultiplier: 0.8 } }) } }, "532");
    expect(model).toBeUndefined();
  });

  test("builds stasis web rows with effect and activation sections", () => {
    const model = renderModel({ modules: { "532": makeModule({ stasisWeb: { maxRange: 10000, speedFactorPercent: -60, overloadRangeBonusPercent: 50, capacitorNeed: 5, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.name).toBeUndefined();
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.maxVelocity", value: "-60%" },
        { label: "label.maxRange", value: "10.0 unit.kilometer" },
      ],
    });
    expect(model?.sections[1]).toEqual({
      heading: "moduleHint.section.activation",
      rows: [
        { label: "label.cycleTime", value: "10 unit.second" },
        { label: "label.capacitorNeed", value: "5 unit.gigajoule" },
      ],
    });
  });

  test("builds stasis grappler rows with application range", () => {
    const model = renderModel({ modules: { "532": makeModule({ stasisGrappler: { optimal: 2400, falloff: 2000, speedFactorPercent: -75, overloadOptimalBonusPercent: 50, capacitorNeed: 5, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.maxVelocity", value: "-75%" },
        { label: "label.optimalRange", value: "2,400 unit.meter" },
        { label: "label.falloffRange", value: "2,000 unit.meter" },
      ],
    });
  });

  test("builds warp scrambler rows with the MWD statement", () => {
    const model = renderModel({ modules: { "532": makeModule({ warpScrambler: { maxRange: 7500, overloadRangeBonusPercent: 50, capacitorNeed: 1, cycleTime: 10, propulsionBlock: true, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { value: "ewar.hover.scrambler", emphasis: true },
        { label: "label.maxRange", value: "7,500 unit.meter" },
      ],
    });
  });

  test("shows the warp-drive statement for pure warp disruptors", () => {
    const model = renderModel({ modules: { "532": makeModule({ warpScrambler: { maxRange: 24000, overloadRangeBonusPercent: 50, capacitorNeed: 1, cycleTime: 10, propulsionBlock: false, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0].rows).toEqual([
      { value: "ewar.hover.warpDisruptor", emphasis: true },
      { label: "label.maxRange", value: "24.0 unit.kilometer" },
    ]);
  });

  test("builds target painter rows with signature bonus and range", () => {
    const model = renderModel({ modules: { "532": makeModule({ targetPainter: { maxRange: 27000, falloff: 18000, signatureRadiusBonusPercent: 37.5, overloadStrengthBonusPercent: 50, capacitorNeed: 6, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.signatureRadius", value: "+37.5%" },
        { label: "label.maxRange", value: "27.0 unit.kilometer" },
        { label: "label.falloffRange", value: "18.0 unit.kilometer" },
      ],
    });
  });

  test("builds tracking disruptor rows with disruption strength", () => {
    const model = renderModel({ modules: { "532": makeModule({ trackingDisruptor: { optimal: 24000, falloff: 20000, disruptionPercent: -15.3, overloadStrengthBonusPercent: 50, capacitorNeed: 6, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "moduleHint.disruptionStrength", value: "-15.3%" },
        { label: "label.optimalRange", value: "24.0 unit.kilometer" },
        { label: "label.falloffRange", value: "20.0 unit.kilometer" },
      ],
    });
  });

  test("builds sensor dampener rows with scan and range penalties", () => {
    const model = renderModel({ modules: { "532": makeModule({ sensorDampener: { optimal: 27000, falloff: 18000, scanResolutionBonusPercent: -13.7, maxTargetRangeBonusPercent: -14.5, overloadStrengthBonusPercent: 50, capacitorNeed: 6, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.scanResolution", value: "-13.7%" },
        { label: "label.targetingRange", value: "-14.5%" },
        { label: "label.optimalRange", value: "27.0 unit.kilometer" },
        { label: "label.falloffRange", value: "18.0 unit.kilometer" },
      ],
    });
  });

  test("builds sensor booster rows with scan and range bonuses", () => {
    const model = renderModel({ modules: { "532": makeModule({ sensorBooster: { scanResolutionBonusPercent: 15, maxTargetRangeBonusPercent: 23, overloadStrengthBonusPercent: 50, capacitorNeed: 8, cycleTime: 10, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.scanResolution", value: "+15%" },
        { label: "label.targetingRange", value: "+23%" },
      ],
    });
  });

  test("builds signal amplifier rows without an activation section", () => {
    const model = renderModel({ modules: { "532": makeModule({ signalAmplifier: { scanResolutionBonusPercent: 12, maxTargetRangeBonusPercent: 12, maxLockedTargetsBonus: 2 } }) } }, "532");
    expect(model?.sections.length).toBe(1);
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.scanResolution", value: "+12%" },
        { label: "label.targetingRange", value: "+12%" },
        { label: "label.maxLockedTargets", value: "+2" },
      ],
    });
  });

  test("builds energy neutralizer rows with drain and activation", () => {
    const model = renderModel({ modules: { "532": makeModule({ neutralizer: { amount: 120, cycleTime: 6, capacitorNeed: 30, maxRange: 9000, falloff: 6000, requiredSkillIds: [] } }) } }, "532");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "ewar.hover.neutralizer", value: "120 unit.gigajoule" },
        { label: "label.maxRange", value: "9,000 unit.meter" },
        { label: "label.falloffRange", value: "6,000 unit.meter" },
      ],
    });
    expect(model?.sections[1]).toEqual({
      heading: "moduleHint.section.activation",
      rows: [
        { label: "label.cycleTime", value: "6 unit.second" },
        { label: "label.capacitorNeed", value: "30 unit.gigajoule" },
      ],
    });
  });

  test("builds nosferatu rows without a capacitor need row", () => {
    const model = renderModel({ modules: { "532": makeModule({ nosferatu: { amount: 120, cycleTime: 6, maxRange: 6000, falloff: 4000 } }) } }, "532");
    expect(model?.sections[0].rows[0]).toEqual({ label: "ewar.hover.nosferatu", value: "120 unit.gigajoule" });
    expect(model?.sections[1]).toEqual({
      heading: "moduleHint.section.activation",
      rows: [{ label: "label.cycleTime", value: "6 unit.second" }],
    });
  });

  test("builds tracking computer rows from the family catalog", () => {
    const model = renderModel({
      trackingComputers: { "1978": { trackingBonusPercent: 15, optimalBonusPercent: 7.5, falloffBonusPercent: 15, capacitorNeed: 10, cycleTime: 10, requiredSkillIds: [], id: "1978", name: "Tracking Computer II" } },
    }, "1978");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.trackingSpeed", value: "+15%" },
        { label: "label.optimalRange", value: "+7.5%" },
        { label: "label.falloffRange", value: "+15%" },
      ],
    });
    expect(model?.sections[1]).toEqual({
      heading: "moduleHint.section.activation",
      rows: [
        { label: "label.cycleTime", value: "10 unit.second" },
        { label: "label.capacitorNeed", value: "10 unit.gigajoule" },
      ],
    });
  });

  test("builds missile guidance computer rows and skips zero bonuses", () => {
    const model = renderModel({
      missileGuidanceComputers: { "4371": { explosionRadiusBonusPercent: -5.5, explosionVelocityBonusPercent: 0, missileVelocityBonusPercent: 20, flightTimeBonusPercent: 25, overloadStrengthBonusPercent: 50, capacitorNeed: 12, cycleTime: 10, requiredSkillIds: [], id: "4371", name: "Missile Guidance Computer II" } },
    }, "4371");
    expect(model?.sections[0]).toEqual({
      heading: "moduleHint.section.effect",
      rows: [
        { label: "label.explosionRadius", value: "-5.5%" },
        { label: "label.missileVelocity", value: "+20%" },
        { label: "label.flightTime", value: "+25%" },
      ],
    });
  });

  test("builds missile guidance enhancer rows without an activation section", () => {
    const model = renderModel({
      missileGuidanceEnhancers: { "4389": { explosionRadiusBonusPercent: 10, explosionVelocityBonusPercent: 10, missileVelocityBonusPercent: 15, flightTimeBonusPercent: 20, id: "4389", name: "Missile Guidance Enhancer II" } },
    }, "4389");
    expect(model?.sections.length).toBe(1);
    expect(model?.sections[0].rows).toEqual([
      { label: "label.explosionRadius", value: "+10%" },
      { label: "label.explosionVelocity", value: "+10%" },
      { label: "label.missileVelocity", value: "+15%" },
      { label: "label.flightTime", value: "+20%" },
    ]);
  });
});
