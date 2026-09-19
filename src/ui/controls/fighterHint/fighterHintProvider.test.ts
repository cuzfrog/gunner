import type { FighterAttackStats, FighterStats, FittingDb } from "../../../gamedata/fittingDb";
import type { TypeId } from "../../../gamedata/ids";
import type { Language } from "../../i18n";
import type { StatHintModel, StatHintRenderer } from "../statHint";
import { FighterHintProviderImpl } from "./fighterHintProvider";

function fakeAnchor(value: string | null): HTMLElement {
  const attrs = new Map<string, string>();
  if (value !== null) attrs.set("data-value", value);
  return {
    tagName: "button",
    getAttribute: (name: string) => attrs.get(name) ?? null,
  } as unknown as HTMLElement;
}

const ATTACK: FighterAttackStats = {
  damageMultiplier: 1,
  emDamage: 97.5,
  thermalDamage: 0,
  kineticDamage: 0,
  explosiveDamage: 0,
  cycleTime: 5,
  explosionRadius: 185,
  explosionVelocity: 105,
  optimal: 10000,
  falloff: 5000,
  damageReductionFactor: 3,
  damageReductionSensitivity: 5.5,
  numShots: 12,
  rearmTime: 4,
};

function makeFighterStats(overrides: Partial<FighterStats> = {}): FighterStats {
  return {
    kind: "light",
    squadronMaxSize: 6,
    orbitRange: 6500,
    maxVelocity: 1301.5625,
    signatureRadius: 40,
    refuelingTime: 5,
    volume: 2500,
    attack: ATTACK,
    metaLevel: 6,
    metaGroupID: 2,
    requiredSkillIds: ["34359" as TypeId],
    id: "34359" as TypeId,
    name: "Templar I",
    ...overrides,
  };
}

function makeFittingDb(stats: FighterStats | undefined): FittingDb {
  return { fighters: stats === undefined ? {} : { [stats.id]: stats } } as unknown as FittingDb;
}

function makeRenderer(): { renderer: StatHintRenderer; models: StatHintModel[] } {
  const models: StatHintModel[] = [];
  const renderer: StatHintRenderer = {
    render: (model: StatHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

function makeProvider(stats: FighterStats | undefined): { provider: FighterHintProviderImpl; models: StatHintModel[] } {
  const { renderer, models } = makeRenderer();
  const i18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => key), translateDocument: vi.fn() };
  const provider = new FighterHintProviderImpl({ fittingDb: makeFittingDb(stats), i18n, statHintRenderer: renderer });
  return { provider, models };
}

describe("FighterHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { provider, models } = makeProvider(makeFighterStats());
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when id is not in the fighter catalog", () => {
    const { provider, models } = makeProvider(undefined);
    provider.render(fakeAnchor("999999"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("builds damage, navigation and fit sections for an attack fighter", () => {
    const { provider, models } = makeProvider(makeFighterStats());
    provider.render(fakeAnchor("34359"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.name).toBeUndefined();
    expect(model.sections.length).toBe(3);
    expect(model.sections[0]).toEqual({
      heading: "dpsHint.damage",
      rows: [
        { label: "ammoHint.total", value: "97.5", emphasis: true },
        { label: "dpsHint.damageType.em", iconUrl: "images/icons/damage-em.png", value: "97.5" },
        { label: "label.rateOfFire", value: "5 unit.second" },
      ],
    });
    expect(model.sections[1]).toEqual({
      heading: "shipHint.section.navigation",
      rows: [
        { label: "label.maxVelocity", value: "1,302 unit.meterPerSecond" },
        { label: "droneHint.orbitRange", value: "6,500 unit.meter" },
      ],
    });
    expect(model.sections[2]).toEqual({
      heading: "droneHint.section.fit",
      rows: [
        { label: "fighter.squadronMaxSize", value: "6" },
        { label: "droneHint.volume", value: "2,500 unit.cubicMeter" },
      ],
    });
  });

  test("omits the damage section for support fighters", () => {
    const { provider, models } = makeProvider(makeFighterStats({ attack: undefined }));
    provider.render(fakeAnchor("34359"), {} as HTMLElement);
    expect(models[0].sections.map((s) => s.heading)).toEqual(["shipHint.section.navigation", "droneHint.section.fit"]);
  });

  test("omits zero damage types", () => {
    const { provider, models } = makeProvider(makeFighterStats({ attack: { ...ATTACK, emDamage: 0, thermalDamage: 12.5 } }));
    provider.render(fakeAnchor("34359"), {} as HTMLElement);
    const rows = models[0].sections[0].rows;
    expect(rows.length).toBe(3);
    expect(rows[1]).toEqual({ label: "dpsHint.damageType.thermal", iconUrl: "images/icons/damage-thermal.png", value: "12.5" });
  });
});
