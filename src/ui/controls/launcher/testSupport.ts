import type { ImageCatalog } from "../../icons";
import type { FittingImport, ImportedLauncher, MissileCatalog, MissileOption } from "../../../fitting";
import type { FittingDb, HullBonus, LauncherStats, MissileStats } from "../../../gamedata/fittingDb";
import type { ShipId, TypeId } from "../../../gamedata/ids";
import type { SkillLevel } from "../../../ships";
import { UiEventsImpl } from "../../events";
import type { I18n, Language } from "../../i18n";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { fakeDocument, getFake } from "../testSupport";
import { LauncherControllerImpl } from "./launcherController";
import type { LauncherEls } from "./launcherControllerContract";

const SIDE_ID: Record<Side, "ship-a" | "ship-b"> = { shipA: "ship-a", shipB: "ship-b" };

function sideId(side: Side): "ship-a" | "ship-b" {
  return SIDE_ID[side];
}

export function collectLauncherEls(document: Document, side: Side): LauncherEls {
  const id = sideId(side);
  return {
    panel: document.getElementById(`${id}-launcher-panel`)!,
    ammoTrigger: document.getElementById(`${id}-launcher-ammo-trigger`)! as HTMLButtonElement,
    ammoSummary: document.getElementById(`${id}-launcher-ammo-summary`)!,
    ammoPopup: document.getElementById(`${id}-launcher-ammo-popup`)!,
    ammoList: document.getElementById(`${id}-launcher-ammo-list`)!,
    volleyDamage: document.getElementById(`${id}-launcher-volley-damage`)!,
    rateOfFire: document.getElementById(`${id}-launcher-rate-of-fire`)!,
    explosionRadius: document.getElementById(`${id}-launcher-explosion-radius`)!,
    explosionVelocity: document.getElementById(`${id}-launcher-explosion-velocity`)!,
    missileVelocity: document.getElementById(`${id}-launcher-missile-velocity`)!,
    flightTime: document.getElementById(`${id}-launcher-flight-time`)!,
    flightRange: document.getElementById(`${id}-launcher-flight-range`)!,
  };
}

const SCOURGE_LIGHT: MissileStats = {
  damage: 83, damageType: "kinetic", explosionRadius: 50, explosionVelocity: 170,
  damageReductionFactor: 0.5, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384,
  id: "206" as TypeId, name: "Scourge Light Missile",
};

const NOVA_LIGHT: MissileStats = {
  damage: 83, damageType: "explosive", explosionRadius: 50, explosionVelocity: 170,
  damageReductionFactor: 0.5, maxVelocity: 3750, flightTime: 5, launcherGroup: 509, chargeGroup: 384,
  id: "202" as TypeId, name: "Nova Light Missile",
};

const LIGHT_MISSILE_LAUNCHER: LauncherStats = {
  rateOfFire: 16, launcherGroup: 509, chargeGroups: [384, 394],
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
    damagePerMissile: 83,
    cycleTime: 16,
    explosionRadius: 50,
    explosionVelocity: 170,
    damageReductionFactor: 0.5,
    maxVelocity: 3750,
    flightTime: 5,
    ...overrides,
  };
}

export function buildLauncher(
  options: {
    side?: Side;
    imageCatalog?: Partial<ImageCatalog>;
    fittingImport?: Partial<FittingImport>;
    missileCatalog?: Partial<MissileCatalog>;
    fittingDb?: Partial<FittingDb>;
    i18n?: Partial<I18n>;
  } = {},
) {
  const side = options.side ?? "shipA";
  const document = fakeDocument();
  globalThis.document = document;
  const els = collectLauncherEls(document, side);
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
    ...options.fittingImport,
  });
  const missileCatalog = vi.mocked<MissileCatalog>({
    missilesForLauncher: vi.fn(() => MISSILE_OPTIONS),
    usualForLauncher: vi.fn(() => SCOURGE_LIGHT.id),
    withCharge: vi.fn((_launcher, missileId) => importedLauncherFixture({ chargeId: missileId, chargeName: missileId === NOVA_LIGHT.id ? NOVA_LIGHT.name : SCOURGE_LIGHT.name })),
    has: vi.fn((id: TypeId) => id === SCOURGE_LIGHT.id || id === NOVA_LIGHT.id),
    idForName: vi.fn((name: string) => MISSILE_OPTIONS.find((m) => m.name === name)?.id),
    ...options.missileCatalog,
  });
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
  const controller = new LauncherControllerImpl({
    side,
    els,
    fittingDb,
    fittingImport,
    missileCatalog,
    imageCatalog,
    i18n,
    events,
    popupGroup,
  });
  return { document, controller, missileCatalog, imageCatalog, fittingImport, fittingDb, i18n, events, popupGroup };
}
