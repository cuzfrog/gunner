import { type FakeElement, fakeDocument } from "../../testing";
import type { DamageBreakdown, ImportedLauncher, ImportedTurret } from "../../../fitting";
import type { ItemNameCatalog } from "../../../gamedata";
import type { I18n } from "../../i18n";
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
    { kind: "skill", multiplier: 1.1, skillName: "Surgical Strike" },
  ],
};

const LAUNCHER_BREAKDOWN: DamageBreakdown = {
  damageByType: { kinetic: 100 },
  factors: [
    { kind: "base", multiplier: 1 },
    { kind: "skill", multiplier: 1.1, skillName: "Warhead Upgrades" },
  ],
};

function makeTurret(breakdown: DamageBreakdown = TURRET_BREAKDOWN): ImportedTurret {
  return {
    chargeSize: "Medium",
    chargeId: "1" as never,
    base: { tracking: 0.1, optimal: 10000, falloff: 5000, sigResolution: 40 },
    moduleId: "200" as never,
    damageMultiplier: 3,
    damagePerShot: 50,
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
    damagePerMissile: 100,
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

function makeTurretController(turret?: ImportedTurret): TurretController {
  return { turret: vi.fn(() => turret) } as unknown as TurretController;
}

function makeLauncherController(launcher?: ImportedLauncher): LauncherController {
  return { launcher: vi.fn(() => launcher) } as unknown as LauncherController;
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
    itemNameCatalog: makeItemNameCatalog(),
    dpsHintRenderer: makeRenderer(),
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
});
