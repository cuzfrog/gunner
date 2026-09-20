import type { ShipProfile, Ships } from "../../../ships";
import type { Language } from "../../i18n";
import { mockShips } from "../../testing";
import { ShipHintProviderImpl } from "./shipHintProvider";
import type { StatHintModel, StatHintRenderer, StatHintRow } from "../statHint";
import type { FactionId, HullTypeId, ShipId } from "../../../gamedata/ids";

const PROFILE: ShipProfile = {
  id: "587" as ShipId,
  name: "Rifter",
  factionId: "minmatar-republic" as FactionId,
  hullTypeId: "25" as HullTypeId,
  mass: 1032000,
  inertiaModifier: 3.1,
  baseSpeed: 365,
  sigRadius: 36,
  scanResolution: 650,
  maxTargetingRange: 42500,
  maxLockedTargets: 4,
  sensorStrengths: { gravimetric: 11, ladar: 0, magnetometric: 0, radar: 0 },
  highSlots: 3,
  medSlots: 4,
  lowSlots: 3,
  rigSlots: 3,
  powerGrid: 1000,
  cpuOutput: 400,
  droneBandwidth: 10,
  droneCapacity: 10,
  maxActiveDrones: 5,
  fighterCapacity: 0,
  fighterTubes: 0,
  fighterLightSlots: 0,
  fighterHeavySlots: 0,
  fighterSupportSlots: 0,
  shieldHp: 500,
  shieldRechargeTime: 625,
  armorHp: 350,
  hullHp: 350,
  capacitorCapacity: 300,
  capacitorRechargeTime: 150,
  shieldResists: { em: 0, thermal: 0.2, kinetic: 0.4, explosive: 0.875 },
  armorResists: { em: 0.5, thermal: 0.35, kinetic: 0.25, explosive: 0.1 },
  hullResists: { em: 0.33, thermal: 0.33, kinetic: 0.33, explosive: 0.33 },
  bonuses: [],
};

const BONUS_PROFILE: ShipProfile = {
  ...PROFILE,
  bonuses: [
    { header: "Minmatar Frigate bonuses (per skill level)", lines: ["5% bonus to Small Projectile Turret damage"] },
    { header: "Role Bonus", lines: ["200% bonus to Remote Assistance effect"] },
  ],
};

const NO_DRONE_PROFILE: ShipProfile = { ...PROFILE, droneBandwidth: 0, droneCapacity: 0 };

function fakeAnchor(value: string | null): HTMLElement {
  const attrs = new Map<string, string>();
  if (value !== null) attrs.set("data-value", value);
  return {
    tagName: "img",
    getAttribute: (name: string) => attrs.get(name) ?? null,
  } as unknown as HTMLElement;
}

function makeShips(profile: ShipProfile | undefined): Ships {
  return {
    ...mockShips(),
    findHullById: vi.fn((id: ShipId) => (profile !== undefined && id === profile.id ? profile : undefined)),
    hullView: vi.fn((p: ShipProfile) => ({ name: `N:${p.name}`, hullType: `T:${p.hullTypeId}`, faction: `F:${p.factionId}` })),
  };
}

function makeRenderer(): { renderer: StatHintRenderer; models: StatHintModel[] } {
  const models: StatHintModel[] = [];
  const renderer: StatHintRenderer = {
    render: (model: StatHintModel, _container: HTMLElement) => { models.push(model); },
  };
  return { renderer, models };
}

function makeProvider(ships: Ships): { provider: ShipHintProviderImpl; models: StatHintModel[] } {
  const { renderer, models } = makeRenderer();
  const i18n = { current: vi.fn((): Language => "en"), setLanguage: vi.fn(), t: vi.fn((key: string) => key), translateDocument: vi.fn() };
  const provider = new ShipHintProviderImpl({ ships, i18n, statHintRenderer: renderer });
  return { provider, models };
}

function rowsOf(model: StatHintModel, heading: string): readonly StatHintRow[] {
  const section = model.sections.find((s) => s.heading === heading);
  return section ? [...section.rows] : [];
}

describe("ShipHintProviderImpl", () => {
  test("renders nothing when anchor has no data-value", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor(null), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when ship id is malformed", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor("Rifter"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("renders nothing when ship id is unknown", () => {
    const { provider, models } = makeProvider(makeShips(undefined));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    expect(models.length).toBe(0);
  });

  test("builds header from localized hull view", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    expect(models.length).toBe(1);
    expect(models[0].name).toBe("N:Rifter");
    expect(models[0].subtitle).toBe("T:25 · F:minmatar-republic");
  });

  test("builds fitting, navigation, targeting, capacitor and defense rows", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    const model = models[0];
    expect(model.sections.map((s) => s.heading)).toEqual([
      "shipHint.section.fitting",
      "shipHint.section.navigation",
      "shipHint.section.targeting",
      "shipHint.section.drones",
      "shipHint.section.capacitor",
      "shipHint.section.defense",
    ]);
    expect(rowsOf(model, "shipHint.section.fitting")).toEqual([
      { label: "shipHint.highSlots", value: "3" },
      { label: "shipHint.medSlots", value: "4" },
      { label: "shipHint.lowSlots", value: "3" },
      { label: "shipHint.rigSlots", value: "3" },
      { label: "shipHint.powerGrid", value: "1,000 unit.megawatt" },
      { label: "shipHint.cpuOutput", value: "400 unit.teraflop" },
    ]);
    expect(rowsOf(model, "shipHint.section.navigation")).toEqual([
      { label: "label.maxVelocity", value: "365 unit.meterPerSecond" },
      { label: "shipHint.mass", value: "1,032,000 unit.kilogram" },
      { label: "shipHint.inertiaModifier", value: "3.1x" },
      { label: "shipHint.signatureRadius", value: "36 unit.meter" },
    ]);
    expect(rowsOf(model, "shipHint.section.targeting")).toEqual([
      { label: "label.scanResolution", value: "650 unit.mm" },
      { label: "label.targetingRange", value: "42.5 unit.kilometer" },
      { label: "label.maxLockedTargets", value: "4" },
    ]);
    expect(rowsOf(model, "shipHint.section.drones")).toEqual([
      { label: "shipHint.droneBandwidth", value: "10 unit.droneBandwidth" },
      { label: "shipHint.droneCapacity", value: "10 unit.cubicMeter" },
    ]);
    expect(rowsOf(model, "shipHint.section.capacitor")).toEqual([
      { label: "shipHint.capacitorCapacity", value: "300 unit.gigajoule" },
      { label: "shipHint.capacitorRecharge", value: "150 unit.second" },
    ]);
    expect(rowsOf(model, "shipHint.section.defense")).toEqual([
      { label: "defense.layer.shield", value: "500 defense.hp" },
      { label: "defense.layer.armor", value: "350 defense.hp" },
      { label: "defense.layer.hull", value: "350 defense.hp" },
    ]);
  });

  test("omits drone section when hull has no drones", () => {
    const { provider, models } = makeProvider(makeShips(NO_DRONE_PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    const model = models[0];
    expect(model.sections.map((s) => s.heading)).not.toContain("shipHint.section.drones");
  });

  test("appends bonus groups as statement sections after defense", () => {
    const { provider, models } = makeProvider(makeShips(BONUS_PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    const model = models[0];
    expect(model.sections.map((s) => s.heading)).toEqual([
      "shipHint.section.fitting",
      "shipHint.section.navigation",
      "shipHint.section.targeting",
      "shipHint.section.drones",
      "shipHint.section.capacitor",
      "shipHint.section.defense",
      "Minmatar Frigate bonuses (per skill level)",
      "Role Bonus",
    ]);
    expect(rowsOf(model, "Minmatar Frigate bonuses (per skill level)")).toEqual([
      { value: "5% bonus to Small Projectile Turret damage", statement: true },
    ]);
    expect(rowsOf(model, "Role Bonus")).toEqual([
      { value: "200% bonus to Remote Assistance effect", statement: true },
    ]);
  });

  test("adds no bonus sections when the hull has none", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    expect(models[0].sections.map((s) => s.heading)).toHaveLength(6);
  });

  test("builds resist table with damage type columns and fractional percents", () => {
    const { provider, models } = makeProvider(makeShips(PROFILE));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    const resists = models[0].resists;
    expect(resists).toEqual({
      heading: "shipHint.section.resists",
      columns: ["dpsHint.damageType.em", "dpsHint.damageType.thermal", "dpsHint.damageType.kinetic", "dpsHint.damageType.explosive"],
      rows: [
        { layer: "defense.layer.shield", values: ["0%", "20%", "40%", "87.5%"] },
        { layer: "defense.layer.armor", values: ["50%", "35%", "25%", "10%"] },
        { layer: "defense.layer.hull", values: ["33%", "33%", "33%", "33%"] },
      ],
    });
  });

  test("formats fractional recharge time and signature radius", () => {
    const { provider, models } = makeProvider(makeShips({ ...PROFILE, capacitorRechargeTime: 187.5, sigRadius: 10.5, maxTargetingRange: 35000 }));
    provider.render(fakeAnchor("587"), {} as HTMLElement);
    const model = models[0];
    expect(rowsOf(model, "shipHint.section.capacitor")[1].value).toBe("187.5 unit.second");
    expect(rowsOf(model, "shipHint.section.navigation")[3].value).toBe("10.5 unit.meter");
    expect(rowsOf(model, "shipHint.section.targeting")[1].value).toBe("35 unit.kilometer");
  });
});
