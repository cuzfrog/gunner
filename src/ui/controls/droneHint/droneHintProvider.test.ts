import type { DroneStats, FittingDb } from "../../../gamedata/fittingDb";
import type { Language } from "../../i18n";
import type { StatHintModel, StatHintRenderer } from "../statHint";
import { DroneHintProviderImpl } from "./droneHintProvider";

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

function makeDroneStats(overrides: Partial<DroneStats> = {}): DroneStats {
  return {
    sizeClass: "light",
    damageMultiplier: 1.92,
    emDamage: 0,
    thermalDamage: 20,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 2.178,
    sigResolution: 25,
    optimal: 2100,
    falloff: 2000,
    maxVelocity: 3360,
    orbitSpeed: 660,
    orbitRange: 700,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    metaLevel: 5,
    metaGroupID: 2,
    id: "2456" as DroneStats["id"],
    name: "Hobgoblin II",
    ...overrides,
  };
}

function makeFittingDb(stats: DroneStats | undefined): FittingDb {
  return { combatDrones: stats === undefined ? {} : { [stats.id]: stats } } as unknown as FittingDb;
}

function makeRenderer(): { renderer: StatHintRenderer; models: StatHintModel[] } {
  const models: StatHintModel[] = [];
  const renderer: StatHintRenderer = {
    render: (model: StatHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

function makeProvider(stats: DroneStats | undefined): { provider: DroneHintProviderImpl; models: StatHintModel[] } {
  const { renderer, models } = makeRenderer();
  const i18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => key), translateDocument: vi.fn() };
  const provider = new DroneHintProviderImpl({ fittingDb: makeFittingDb(stats), i18n, statHintRenderer: renderer });
  return { provider, models };
}

describe("DroneHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { provider, models } = makeProvider(makeDroneStats());
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when id is not in the combat drone catalog", () => {
    const { provider, models } = makeProvider(undefined);
    provider.render(fakeAnchor("999999"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("builds damage section with scaled total, type rows and cycle time", () => {
    const { provider, models } = makeProvider(makeDroneStats());
    provider.render(fakeAnchor("2456"), {} as HTMLElement);
    expect(models.length).toBe(1);
    const model = models[0];
    expect(model.name).toBeUndefined();
    expect(model.sections.length).toBe(4);
    const damage = model.sections[0];
    expect(damage.heading).toBe("dpsHint.damage");
    expect(damage.rows[0]).toEqual({ label: "ammoHint.total", value: "38.4", emphasis: true });
    expect(damage.rows[1]).toEqual({ label: "dpsHint.damageType.thermal", iconUrl: "images/icons/damage-thermal.png", value: "38.4" });
    expect(damage.rows[2]).toEqual({ label: "label.cycleTime", value: "4 unit.second" });
  });

  test("omits zero damage types", () => {
    const { provider, models } = makeProvider(makeDroneStats());
    provider.render(fakeAnchor("2456"), {} as HTMLElement);
    const damage = models[0].sections[0];
    expect(damage.rows.length).toBe(3);
  });

  test("builds targeting, navigation and fit sections", () => {
    const { provider, models } = makeProvider(makeDroneStats());
    provider.render(fakeAnchor("2456"), {} as HTMLElement);
    const model = models[0];
    expect(model.sections[1]).toEqual({
      heading: "shipHint.section.targeting",
      rows: [
        { label: "label.tracking", value: "2.178 unit.radPerSecond" },
        { label: "label.optimalRange", value: "2,100 unit.meter" },
        { label: "label.falloffRange", value: "2,000 unit.meter" },
      ],
    });
    expect(model.sections[2]).toEqual({
      heading: "shipHint.section.navigation",
      rows: [
        { label: "label.maxVelocity", value: "3,360 unit.meterPerSecond" },
        { label: "label.droneOrbitSpeed", value: "660 unit.meterPerSecond" },
        { label: "droneHint.orbitRange", value: "700 unit.meter" },
      ],
    });
    expect(model.sections[3]).toEqual({
      heading: "droneHint.section.fit",
      rows: [
        { label: "shipHint.droneBandwidth", value: "5 unit.droneBandwidth" },
        { label: "droneHint.volume", value: "5 unit.cubicMeter" },
      ],
    });
  });
});
