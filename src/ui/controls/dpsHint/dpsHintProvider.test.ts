import { type FakeElement, fakeDocument } from "../../testing";
import type { DamageBreakdown, ImportedDrone, ImportedLauncher, ImportedTurret } from "../../../fitting";
import { toTypeId } from "../../../gamedata/ids";
import type { ItemNameCatalog } from "../../../gamedata";
import type { DamageAssessment, DroneSpec, MissileSpec, TurretSpec, WeaponDamageAssessor, WeaponSpec } from "../../../sim";
import { SIG_RESOLUTIONS, ZERO_DAMAGE } from "../../../sim";
import type { I18n } from "../../i18n";
import type { DroneController } from "../drone";
import type { LauncherController } from "../launcher";
import type { TurretController } from "../turret";
import type { DpsHintRenderer } from "./dpsHintRenderer";
import { DpsHintRendererImpl } from "./dpsHintRenderer";
import { type DpsHintProviderDeps, DpsHintProviderImpl } from "./dpsHintProvider";

function elementChildren(el: FakeElement): FakeElement[] {
  return el.children.filter((c) => c.tagName !== "#text");
}

const TURRET_BREAKDOWN: DamageBreakdown = {
  damageByType: { em: 30, thermal: 20 },
  factors: [
    { kind: "base", multiplier: 3 },
    { kind: "module", multiplier: 1.3, moduleIds: ["123" as never] },
    { kind: "skill", multiplier: 1.1, skillIds: ["3315" as never, "3306" as never] },
  ],
};

const LAUNCHER_BREAKDOWN: DamageBreakdown = {
  damageByType: { kinetic: 100 },
  factors: [
    { kind: "base", multiplier: 1 },
    { kind: "skill", multiplier: 1.1, skillIds: ["20315" as never] },
  ],
};

const DRONE_BREAKDOWN: DamageBreakdown = {
  damageByType: { thermal: 20 },
  factors: [
    { kind: "base", multiplier: 1 },
    { kind: "skill", multiplier: 1.1, skillIds: ["3436" as never] },
    { kind: "module", multiplier: 1.3, moduleIds: ["438" as never] },
  ],
};

function makeTurret(breakdown: DamageBreakdown = TURRET_BREAKDOWN): ImportedTurret {
  return {
    chargeSize: "Medium",
    chargeId: "1" as never,
    sigResolutionClass: "M",
    base: { tracking: 0.1, optimal: 10000, falloff: 5000 },
    moduleId: "200" as never,
    damageMultiplier: 3,
    damagePerShot: { em: 0, thermal: 0, kinetic: 50, explosive: 0 },
    cycleTime: 5,
    turretCount: 4,
    damageBreakdown: breakdown,
  } as unknown as ImportedTurret;
}

function makeLauncher(breakdown: DamageBreakdown = LAUNCHER_BREAKDOWN): ImportedLauncher {
  return {
    moduleId: "300" as never,
    name: "Rocket Launcher",
    count: 2,
    chargeId: "2" as never,
    chargeName: "Mjolnir",
    damagePerMissile: { em: 0, thermal: 0, kinetic: 100, explosive: 0 },
    cycleTime: 10,
    explosionRadius: 50,
    explosionVelocity: 200,
    damageReductionFactor: 0.5,
    maxVelocity: 5000,
    flightTime: 10,
    damageBreakdown: breakdown,
  } as unknown as ImportedLauncher;
}

function makeI18n(): I18n {
  return {
    current: vi.fn(() => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
    translateDocument: vi.fn(),
  } as unknown as I18n;
}

function makeItemNameCatalog(): ItemNameCatalog {
  return {
    nameForId: vi.fn((id: string) => `Item-${id}`),
  } as unknown as ItemNameCatalog;
}

function makeTurretSpec(turret: ImportedTurret): TurretSpec {
  return {
    kind: "turret",
    moduleId: toTypeId("1"),
    tracking: turret.base.tracking,
    sigResolution: SIG_RESOLUTIONS[turret.sigResolutionClass],
    optimal: turret.base.optimal,
    falloff: turret.base.falloff,
    damagePerShot: turret.damagePerShot,
    cycleTime: turret.cycleTime,
    turretCount: turret.turretCount,
  };
}

function makeMissileSpec(launcher: ImportedLauncher): MissileSpec {
  return {
    kind: "missile",
    moduleId: toTypeId("2"),
    damagePerMissile: launcher.damagePerMissile,
    cycleTime: launcher.cycleTime,
    launcherCount: launcher.count,
    explosionRadius: launcher.explosionRadius,
    explosionVelocity: launcher.explosionVelocity,
    damageReductionFactor: launcher.damageReductionFactor,
    maxVelocity: launcher.maxVelocity,
    flightTime: launcher.flightTime,
    flightRange: launcher.maxVelocity * launcher.flightTime,
  };
}

function makeDroneSpec(drone: ImportedDrone): DroneSpec {
  return {
    kind: "drone",
    moduleId: toTypeId("3"),
    tracking: drone.tracking,
    sigResolution: drone.sigResolution,
    optimal: drone.optimal,
    falloff: drone.falloff,
    damagePerShot: { em: drone.emDamage * drone.damageMultiplier, thermal: drone.thermalDamage * drone.damageMultiplier, kinetic: drone.kineticDamage * drone.damageMultiplier, explosive: drone.explosiveDamage * drone.damageMultiplier },
    cycleTime: drone.cycleTime,
    droneCount: drone.count,
    maxVelocity: drone.maxVelocity,
    orbitSpeed: drone.orbitSpeed,
    orbitRange: drone.orbitRange,
    isSentry: drone.sizeClass === "sentry",
    controlRange: drone.controlRange,
  };
}

function makeWeaponDamageAssessor(assessment: DamageAssessment): WeaponDamageAssessor {
  return { assess: vi.fn((_spec: WeaponSpec, _factor: number, _inRange: boolean) => assessment) } as unknown as WeaponDamageAssessor;
}

function makeTurretController(turret?: ImportedTurret): TurretController {
  return { turret: vi.fn(() => turret), currentTurretSpec: vi.fn(() => turret ? makeTurretSpec(turret) : undefined) } as unknown as TurretController;
}

function makeLauncherController(launcher?: ImportedLauncher): LauncherController {
  return { launcher: vi.fn(() => launcher), currentMissileSpec: vi.fn(() => launcher ? makeMissileSpec(launcher) : undefined) } as unknown as LauncherController;
}

function makeDrone(droneBreakdown: DamageBreakdown = DRONE_BREAKDOWN): ImportedDrone {
  return {
    typeId: "400" as never,
    name: "Hobgoblin II",
    sizeClass: "light",
    count: 5,
    damageMultiplier: 2,
    emDamage: 0,
    thermalDamage: 20,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 0.1,
    sigResolution: 40,
    optimal: 1000,
    falloff: 500,
    maxVelocity: 6000,
    orbitSpeed: 1800,
    orbitRange: 1000,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    controlRange: 60000,
    damageBreakdown: droneBreakdown,
  } as unknown as ImportedDrone;
}

function makeDroneController(drone?: ImportedDrone): DroneController {
  return { drone: vi.fn(() => drone), currentDroneSpecs: vi.fn(() => drone ? [makeDroneSpec(drone)] : []) } as unknown as DroneController;
}

function makeRenderer(): DpsHintRenderer {
  const renderer = new DpsHintRendererImpl({ t: (key) => key });
  return renderer as unknown as DpsHintRenderer;
}

function makeDeps(overrides: Partial<DpsHintProviderDeps> = {}): DpsHintProviderDeps {
  return {
    i18n: makeI18n(),
    turretControllers: { shipA: makeTurretController(), shipB: makeTurretController() },
    launcherControllers: { shipA: makeLauncherController(), shipB: makeLauncherController() },
    droneControllers: { shipA: makeDroneController(), shipB: makeDroneController() },
    itemNameCatalog: makeItemNameCatalog(),
    dpsHintRenderer: makeRenderer(),
    weaponDamageAssessor: makeWeaponDamageAssessor({ nominalDps: 0, appliedDps: 0, application: 1, volley: 0, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE }),
    ...overrides,
  };
}

function makeAnchor(side?: string): HTMLElement {
  const anchor = globalThis.document.createElement("span");
  if (side !== undefined) anchor.setAttribute("data-side", side);
  return anchor;
}

describe("DpsHintProviderImpl", () => {
  let originalDocument: Document | undefined;
  let originalElement: typeof Element | undefined;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalElement = globalThis.Element;
    globalThis.document = fakeDocument();
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      globalThis.document = originalDocument;
    }
    if (originalElement === undefined) {
      delete (globalThis as Record<string, unknown>).Element;
    } else {
      globalThis.Element = originalElement;
    }
  });

  test("renders nothing when anchor has no data-side", () => {
    const provider = new DpsHintProviderImpl(makeDeps());
    const anchor = makeAnchor();
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });

  test("accepts short side names (a/b) from the Astro component", () => {
    const turret = makeTurret();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
    }));
    const anchor = makeAnchor("a");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(1);
  });

  test("renders turret group for ship A", () => {
    const turret = makeTurret();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(1);
    const root = container.children[0] as unknown as FakeElement;
    expect(root.className).toBe("dps-hint");
    const group = elementChildren(root)[0];
    const nameEl = elementChildren(group)[0];
    expect(nameEl.textContent).toBe("Item-200 x4");
  });

  test("renders launcher group for ship B", () => {
    const launcher = makeLauncher();
    const provider = new DpsHintProviderImpl(makeDeps({
      launcherControllers: { shipA: makeLauncherController(), shipB: makeLauncherController(launcher) },
    }));
    const anchor = makeAnchor("shipB");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(1);
    const root = container.children[0] as unknown as FakeElement;
    const group = elementChildren(root)[0];
    const nameEl = elementChildren(group)[0];
    expect(nameEl.textContent).toBe("Item-300 x2");
  });

  test("renders both turret and launcher groups when both are present", () => {
    const turret = makeTurret();
    const launcher = makeLauncher();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      launcherControllers: { shipA: makeLauncherController(launcher), shipB: makeLauncherController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    const root = container.children[0] as unknown as FakeElement;
    expect(elementChildren(root).length).toBe(2);
  });

  test("renders nothing when no weapons are equipped", () => {
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(undefined), shipB: makeTurretController() },
      launcherControllers: { shipA: makeLauncherController(undefined), shipB: makeLauncherController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(0);
  });

  test("omits zero-damage types from type rows", () => {
    const breakdown: DamageBreakdown = {
      damageByType: { em: 50, thermal: 0, kinetic: 50, explosive: 0 },
      factors: [{ kind: "base", multiplier: 1 }],
    };
    const turret = makeTurret(breakdown);
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    provider.render(anchor, container as unknown as HTMLElement);
    const root = container.children[0] as unknown as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const typeRows = [groupChildren[1], groupChildren[2]];
    expect(typeRows.length).toBe(2);
    expect(elementChildren(typeRows[0])[1].textContent).toBe("dpsHint.damageType.em");
    expect(elementChildren(typeRows[1])[1].textContent).toBe("dpsHint.damageType.kinetic");
  });

  test("resolves module factor source via itemNameCatalog", () => {
    const turret = makeTurret();
    const catalog = makeItemNameCatalog();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      itemNameCatalog: catalog,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(catalog.nameForId).toHaveBeenCalledWith("123", "en");
  });

  test("deduplicates duplicate modules with xN suffix", () => {
    const breakdown: DamageBreakdown = {
      damageByType: { em: 30 },
      factors: [
        { kind: "base", multiplier: 1 },
        { kind: "module", multiplier: 1.3, moduleIds: ["123" as never, "123" as never] },
      ],
    };
    const turret = makeTurret(breakdown);
    const catalog = makeItemNameCatalog();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      itemNameCatalog: catalog,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div") as unknown as FakeElement;
    provider.render(anchor, container as unknown as HTMLElement);
    const root = container.children[0] as unknown as FakeElement;
    const group = elementChildren(root)[0];
    const groupChildren = elementChildren(group);
    const moduleFactor = groupChildren[4];
    const factorChildren = elementChildren(moduleFactor);
    const source = factorChildren[1];
    expect(source.textContent).toBe("Item-123 x2");
  });

  test("resolves skill factor sources via itemNameCatalog", () => {
    const turret = makeTurret();
    const catalog = makeItemNameCatalog();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      itemNameCatalog: catalog,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(catalog.nameForId).toHaveBeenCalledWith("3315", "en");
    expect(catalog.nameForId).toHaveBeenCalledWith("3306", "en");
  });

  test("resolves launcher skill factor source via itemNameCatalog", () => {
    const launcher = makeLauncher();
    const catalog = makeItemNameCatalog();
    const provider = new DpsHintProviderImpl(makeDeps({
      launcherControllers: { shipA: makeLauncherController(launcher), shipB: makeLauncherController() },
      itemNameCatalog: catalog,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(catalog.nameForId).toHaveBeenCalledWith("20315", "en");
  });

  test("renders drone group for ship A", () => {
    const drone = makeDrone();
    const provider = new DpsHintProviderImpl(makeDeps({
      droneControllers: { shipA: makeDroneController(drone), shipB: makeDroneController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(container.children.length).toBe(1);
    const root = container.children[0] as unknown as FakeElement;
    const group = elementChildren(root)[0];
    const nameEl = elementChildren(group)[0];
    expect(nameEl.textContent).toBe("Item-400 x5");
  });

  test("renders drone group alongside turret and launcher groups", () => {
    const turret = makeTurret();
    const launcher = makeLauncher();
    const drone = makeDrone();
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      launcherControllers: { shipA: makeLauncherController(launcher), shipB: makeLauncherController() },
      droneControllers: { shipA: makeDroneController(drone), shipB: makeDroneController() },
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    const root = container.children[0] as unknown as FakeElement;
    expect(elementChildren(root).length).toBe(3);
  });

  test("resolves drone skill and module factor sources via itemNameCatalog", () => {
    const drone = makeDrone();
    const catalog = makeItemNameCatalog();
    const provider = new DpsHintProviderImpl(makeDeps({
      droneControllers: { shipA: makeDroneController(drone), shipB: makeDroneController() },
      itemNameCatalog: catalog,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(catalog.nameForId).toHaveBeenCalledWith("3436", "en");
    expect(catalog.nameForId).toHaveBeenCalledWith("438", "en");
  });

  test("DPS and volley come from WeaponDamageAssessor, not a parallel formula", () => {
    const turret = makeTurret();
    const spec = makeTurretSpec(turret);
    const assessment: DamageAssessment = { nominalDps: 171.6, appliedDps: 171.6, application: 1, volley: 858, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
    const assessor = makeWeaponDamageAssessor(assessment);
    const provider = new DpsHintProviderImpl(makeDeps({
      turretControllers: { shipA: makeTurretController(turret), shipB: makeTurretController() },
      weaponDamageAssessor: assessor,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(assessor.assess).toHaveBeenCalledWith(spec, 1, true);
    const dpsRows = (container as unknown as FakeElement).querySelectorAll(".dps-hint-dps-row");
    expect(dpsRows.length).toBe(1);
    const dpsValue = elementChildren(dpsRows[0])[1];
    expect(dpsValue.textContent).toBe(assessment.nominalDps.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    const volleyRows = (container as unknown as FakeElement).querySelectorAll(".dps-hint-summary-row");
    expect(volleyRows.length).toBe(2);
    const volleyValue = elementChildren(volleyRows[0])[1];
    expect(volleyValue.textContent).toContain(assessment.volley.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  });

  test("launcher DPS comes from WeaponDamageAssessor with the missile spec", () => {
    const launcher = makeLauncher();
    const spec = makeMissileSpec(launcher);
    const assessment: DamageAssessment = { nominalDps: 22, appliedDps: 22, application: 1, volley: 220, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
    const assessor = makeWeaponDamageAssessor(assessment);
    const provider = new DpsHintProviderImpl(makeDeps({
      launcherControllers: { shipA: makeLauncherController(launcher), shipB: makeLauncherController() },
      weaponDamageAssessor: assessor,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(assessor.assess).toHaveBeenCalledWith(spec, 1, true);
    const dpsRows = (container as unknown as FakeElement).querySelectorAll(".dps-hint-dps-row");
    expect(dpsRows.length).toBe(1);
    const dpsValue = elementChildren(dpsRows[0])[1];
    expect(dpsValue.textContent).toBe(assessment.nominalDps.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  });

  test("drone DPS comes from WeaponDamageAssessor with the drone spec", () => {
    const drone = makeDrone();
    const spec = makeDroneSpec(drone);
    const assessment: DamageAssessment = { nominalDps: 50, appliedDps: 50, application: 1, volley: 200, baseVolleyByType: ZERO_DAMAGE, appliedByType: ZERO_DAMAGE, appliedVolleyByType: ZERO_DAMAGE };
    const assessor = makeWeaponDamageAssessor(assessment);
    const provider = new DpsHintProviderImpl(makeDeps({
      droneControllers: { shipA: makeDroneController(drone), shipB: makeDroneController() },
      weaponDamageAssessor: assessor,
    }));
    const anchor = makeAnchor("shipA");
    const container = globalThis.document.createElement("div");
    provider.render(anchor, container);
    expect(assessor.assess).toHaveBeenCalledWith(spec, 1, true);
    const dpsRows = (container as unknown as FakeElement).querySelectorAll(".dps-hint-dps-row");
    expect(dpsRows.length).toBe(1);
    const dpsValue = elementChildren(dpsRows[0])[1];
    expect(dpsValue.textContent).toBe(assessment.nominalDps.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
  });
});
