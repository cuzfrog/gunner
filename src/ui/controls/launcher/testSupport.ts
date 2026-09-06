import type { ImageCatalog } from "../../icons";
import type { FittingCalculator, FittingImport, FittingOverridesStore, ImportedLauncher, LauncherClass, LauncherClasses, MissileCatalog, MissileOption } from "../../../fitting";
import { FittingOverridesStoreImpl, EMPTY_DAMAGE_BREAKDOWN } from "../../../fitting";
import type { FittingDb, HullBonus, LauncherStats, MissileStats } from "../../../gamedata/fittingDb";
import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { Ships, SkillLevel } from "../../../ships";
import { UiEventsImpl } from "../../events";
import type { I18n, Language } from "../../i18n";
import { createSelectionSession, createLauncherSelection } from "../../selectionSession";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { fakeDocument } from "../testSupport";
import { mockShips } from "../../testing";
import { LauncherControllerImpl } from "./launcherController";
import type { LauncherEls } from "./launcherControllerContract";

const SIDE_ID: Record<Side, "ship-a" | "ship-b"> = { shipA: "ship-a", shipB: "ship-b" };

function sideId(side: Side): "ship-a" | "ship-b" {
  return SIDE_ID[side];
}

export function collectLauncherEls(document: Document, side: Side): LauncherEls {
  const id = sideId(side);
  return {
    ammoTrigger: document.getElementById(`${id}-launcher-ammo-trigger`)! as HTMLButtonElement,
    ammoSummary: document.getElementById(`${id}-launcher-ammo-summary`)!,
    ammoSummaryIcon: document.getElementById(`${id}-launcher-ammo-summary-icon`)! as HTMLImageElement,
    ammoPopup: document.getElementById(`${id}-launcher-ammo-popup`)!,
    ammoList: document.getElementById(`${id}-launcher-ammo-list`)!,
    ammoField: document.getElementById(`${id}-launcher-ammo-field`)!,
    classOptions: document.getElementById(`${id}-launcher-class-options`)!,
    variantGear: document.getElementById(`${id}-launcher-variant-gear`)! as HTMLButtonElement,
    variants: document.getElementById(`${id}-launcher-variants`)!,
    attributesTrigger: document.getElementById(`${id}-launcher-attributes-trigger`)! as HTMLButtonElement,
    attributesPopup: document.getElementById(`${id}-launcher-attributes-popup`)!,
    attributesField: document.getElementById(`${id}-launcher-attributes-field`)!,
    volleyDamage: document.getElementById(`${id}-launcher-volley-damage`)!,
    rateOfFire: document.getElementById(`${id}-launcher-rate-of-fire`)!,
    explosionRadius: document.getElementById(`${id}-launcher-explosion-radius`)!,
    explosionVelocity: document.getElementById(`${id}-launcher-explosion-velocity`)!,
    missileVelocity: document.getElementById(`${id}-launcher-missile-velocity`)!,
    flightTime: document.getElementById(`${id}-launcher-flight-time`)!,
    flightRange: document.getElementById(`${id}-launcher-flight-range`)!,
    damageReductionFactor: document.getElementById(`${id}-launcher-damage-reduction-factor`)!,
  };
}

const SCOURGE_LIGHT: MissileStats = {
  damage: 83, damageType: "kinetic", explosionRadius: 50, explosionVelocity: 170,
  damageReductionFactor: 0.5, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, requiredSkillIds: [],
  id: "206" as TypeId, name: "Scourge Light Missile",
};

const NOVA_LIGHT: MissileStats = {
  damage: 83, damageType: "explosive", explosionRadius: 50, explosionVelocity: 170,
  damageReductionFactor: 0.5, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384, requiredSkillIds: [],
  id: "202" as TypeId, name: "Nova Light Missile",
};

const LIGHT_MISSILE_LAUNCHER: LauncherStats = {
  rateOfFire: 16, launcherGroup: 509, chargeGroups: [384, 394], requiredSkillIds: [], metaLevel: 0, metaGroupID: 1,
  id: "499" as TypeId, name: "Light Missile Launcher I",
};

const MISSILE_OPTIONS: readonly MissileOption[] = [
  { id: SCOURGE_LIGHT.id, name: SCOURGE_LIGHT.name, damage: SCOURGE_LIGHT.damage, damageType: SCOURGE_LIGHT.damageType },
  { id: NOVA_LIGHT.id, name: NOVA_LIGHT.name, damage: NOVA_LIGHT.damage, damageType: NOVA_LIGHT.damageType },
];

export function importedLauncherFixture(overrides: Partial<ImportedLauncher> = {}): ImportedLauncher {
  return {
    moduleId: "499" as TypeId,
    name: "Light Missile Launcher I",
    count: 2,
    chargeId: "206" as TypeId,
    chargeName: "Scourge Light Missile",
    damagePerMissile: { em: 0, thermal: 0, kinetic: 83, explosive: 0 },
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 3750,
    flightTime: 5,
    damageBreakdown: EMPTY_DAMAGE_BREAKDOWN,
    ...overrides,
  };
}

export function buildLauncher(
  options: {
    side?: Side;
    imageCatalog?: Partial<ImageCatalog>;
    fittingImport?: Partial<FittingImport>;
    missileCatalog?: Partial<MissileCatalog>;
    launcherClasses?: Partial<LauncherClasses>;
    ships?: Partial<Ships>;
    fittingDb?: Partial<FittingDb>;
    i18n?: Partial<I18n>;
    launchersByModuleId?: Readonly<Record<string, ImportedLauncher>>;
  } = {},
) {
  const side = options.side ?? "shipA";
  const document = fakeDocument();
  globalThis.document = document;
  const els = collectLauncherEls(document, side);
  els.ammoField.appendChild(els.ammoTrigger);
  els.ammoField.appendChild(els.ammoPopup);
  els.attributesField.appendChild(els.attributesTrigger);
  els.attributesField.appendChild(els.attributesPopup);
  const i18n = vi.mocked<I18n>({
    current: vi.fn((): Language => "en"),
    setLanguage: vi.fn(),
    t: vi.fn((key) => key),
    translateDocument: vi.fn(),
    ...options.i18n,
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn((_shipId) => ""),
    itemIconUrl: vi.fn(() => undefined),
    ...options.imageCatalog,
  });
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    propulsionStatsById: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(() => undefined),
    itemNameForId: vi.fn((id: TypeId) => String(id)),
    detectLanguageFromText: vi.fn(() => undefined),
    ...options.fittingImport,
  });
  const missileCatalog = vi.mocked<MissileCatalog>({
    missilesForLauncher: vi.fn(() => MISSILE_OPTIONS),
    usualForLauncher: vi.fn(() => SCOURGE_LIGHT.id),
    withCharge: vi.fn((_launcher, missileId) => importedLauncherFixture({ chargeId: missileId, chargeName: missileId === NOVA_LIGHT.id ? NOVA_LIGHT.name : SCOURGE_LIGHT.name })),
    has: vi.fn((id: TypeId) => id === SCOURGE_LIGHT.id || id === NOVA_LIGHT.id),
    idForName: vi.fn((name: string) => MISSILE_OPTIONS.find((m) => m.name === name)?.id),
    equivalentInGroups: vi.fn(() => undefined),
    ...options.missileCatalog,
  });
  const launcherClasses = vi.mocked<LauncherClasses>({
    classOf: vi.fn(() => "light" as LauncherClass),
    representativeOf: vi.fn(() => "499" as TypeId),
    classesForTiers: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
    allClasses: vi.fn(() => ["rocket", "light"] as readonly LauncherClass[]),
    variantsForClass: vi.fn(() => [] as readonly LauncherStats[]),
    ...options.launcherClasses,
  });
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const fittingDb = vi.mocked<FittingDb>({
    missiles: { [SCOURGE_LIGHT.id]: SCOURGE_LIGHT, [NOVA_LIGHT.id]: NOVA_LIGHT },
    launchers: { "499": LIGHT_MISSILE_LAUNCHER },
    hullBonuses: {} as Readonly<Record<ShipId, readonly HullBonus[]>>,
    ...options.fittingDb,
  } as unknown as FittingDb);
  const events = new UiEventsImpl();
  const popupGroup = vi.mocked<PopupGroup>({
    register: vi.fn(),
    open: vi.fn(),
    toggle: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    hasOpen: vi.fn(),
    onPointerDown: vi.fn(),
    onKeyDown: vi.fn(),
  });
  const launchersByModuleId: Readonly<Record<string, ImportedLauncher>> = options.launchersByModuleId ?? {};
  const fittingOverrides = new FittingOverridesStoreImpl();
  const selectionSession = createSelectionSession();
  const launcherSelection = createLauncherSelection(selectionSession, launcherClasses);
  const fittingCalculator = vi.mocked<FittingCalculator>({
    resolveTurrets: vi.fn(() => []),
    resolveLauncher: vi.fn((state) => {
      const group = state.launcherGroups[0];
      if (!group) return undefined;
      const template = launchersByModuleId[String(group.moduleId)] ?? importedLauncherFixture();
      return { ...template, moduleId: group.moduleId, chargeId: group.chargeId ?? template.chargeId, count: group.count };
    }),
    resolveHull: vi.fn(() => ({ fitted: { mass: 0, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0, mwdSigBloomMultiplier: 1 } })),
    resolvePropulsion: vi.fn(() => undefined),
    resolveEwar: vi.fn(() => ({ webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], dampeners: [], scripts: [], dampenerScripts: [], })),
    resolveBoosts: vi.fn(() => ({ computers: [], scripts: [] })),
    resolveMissileBoosts: vi.fn(() => ({ computers: [], enhancers: [], scripts: [] })), resolveSensorBoosts: vi.fn(() => ({ boosters: [], amplifiers: [], boosterScripts: [], dampenerScripts: [] })), resolveSensorSpec: vi.fn(() => ({ scanResolution: 0, maxTargetingRange: 0, maxLockedTargets: 0 })), resolveDrones: vi.fn(() => []), resolveCargoCharges: vi.fn(() => []),
  });
  const controller = new LauncherControllerImpl({
    side,
    els,
    fittingDb,
    fittingImport,
    missileCatalog,
    launcherClasses,
    ships,
    imageCatalog,
    i18n,
    events,
    popupGroup,
    fittingCalculator,
    fittingOverrides,
    launcherSelection,
  });
  return { document, controller, missileCatalog, launcherClasses, ships, imageCatalog, fittingImport, fittingDb, i18n, events, popupGroup, fittingOverrides, selectionSession, fittingCalculator };
}
