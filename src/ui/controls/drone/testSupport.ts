import type { ImageCatalog } from "../../icons";
import type { DroneCatalog, DroneGroup, DroneLoadoutContext, DroneLoadoutResolver, DroneLoadoutValidation, DroneLoadoutValidator, FittingImport, ImportedDrone } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { StatConditions } from "../../../ships";
import { UiEventsImpl } from "../../events";
import type { I18n, Language } from "../../i18n";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { fakeDocument } from "../testSupport";
import { DroneControllerImpl } from "./droneController";
import type { DroneEls } from "./droneControllerContract";

const SIDE_ID: Record<Side, "ship-a" | "ship-b"> = { shipA: "ship-a", shipB: "ship-b" };

function sideId(side: Side): "ship-a" | "ship-b" {
  return SIDE_ID[side];
}

export function collectDroneEls(document: Document, side: Side): DroneEls {
  const id = sideId(side);
  return {
    trigger: document.getElementById(`${id}-drone-trigger`)! as HTMLButtonElement,
    summary: document.getElementById(`${id}-drone-summary`)!,
    summaryIcon: document.getElementById(`${id}-drone-summary-icon`)! as HTMLImageElement,
    popup: document.getElementById(`${id}-drone-popup`)!,
    field: document.getElementById(`${id}-drone-field`)!,
    tracking: document.getElementById(`${id}-drone-tracking`)!,
    optimal: document.getElementById(`${id}-drone-optimal`)!,
    falloff: document.getElementById(`${id}-drone-falloff`)!,
    damage: document.getElementById(`${id}-drone-damage`)!,
    cycleTime: document.getElementById(`${id}-drone-cycle-time`)!,
    orbitSpeed: document.getElementById(`${id}-drone-orbit-speed`)!,
    maxVelocity: document.getElementById(`${id}-drone-max-velocity`)!,
    count: document.getElementById(`${id}-drone-count`)!,
    loadoutSection: document.getElementById(`${id}-drone-loadout-section`)!,
    loadoutList: document.getElementById(`${id}-drone-loadout-list`)!,
    summaryBar: document.getElementById(`${id}-drone-summary-bar`)!,
    summaryCount: document.getElementById(`${id}-drone-summary-count`)!,
    summaryBandwidth: document.getElementById(`${id}-drone-summary-bandwidth`)!,
    summaryBay: document.getElementById(`${id}-drone-summary-bay`)!,
    catalogSection: document.getElementById(`${id}-drone-catalog-section`)!,
    catalogLight: document.getElementById(`${id}-drone-catalog-light`)!,
    catalogMedium: document.getElementById(`${id}-drone-catalog-medium`)!,
    catalogHeavy: document.getElementById(`${id}-drone-catalog-heavy`)!,
    catalogSentry: document.getElementById(`${id}-drone-catalog-sentry`)!,
  };
}

export function importedDroneFixture(overrides: Partial<ImportedDrone> = {}): ImportedDrone {
  return {
    typeId: "80001" as TypeId,
    name: "Hobgoblin I",
    sizeClass: "light",
    count: 5,
    damageMultiplier: 1.5,
    emDamage: 0,
    thermalDamage: 20,
    kineticDamage: 0,
    explosiveDamage: 0,
    tracking: 0.4,
    sigResolution: 25,
    optimal: 1000,
    falloff: 500,
    maxVelocity: 1200,
    orbitSpeed: 600,
    cycleTime: 4,
    bandwidth: 5,
    volume: 5,
    damageBreakdown: { damageByType: { thermal: 20 }, factors: [] },
    ...overrides,
  };
}

function mockDroneCatalog(): DroneCatalog {
  return {
    dronesByClass: vi.fn(() => []),
    usualForClass: vi.fn(() => undefined),
    has: vi.fn(() => true),
    idForName: vi.fn(() => undefined),
  };
}

function mockDroneLoadoutResolver(): DroneLoadoutResolver {
  return {
    resolve: vi.fn((_groups: readonly DroneGroup[], _fitting: DroneLoadoutContext, _conditions: StatConditions): readonly ImportedDrone[] => []),
  };
}

function mockDroneLoadoutValidator(): DroneLoadoutValidator {
  return {
    validate: vi.fn((): DroneLoadoutValidation => ({ valid: true, totalCount: 0, totalBandwidth: 0, totalVolume: 0, violations: [] })),
  };
}

export function buildDrone(
  options: {
    readonly side?: Side;
    readonly imageCatalog?: Partial<ImageCatalog>;
    readonly fittingImport?: Partial<FittingImport>;
    readonly i18n?: Partial<I18n>;
    readonly droneCatalog?: Partial<DroneCatalog>;
    readonly droneLoadoutResolver?: Partial<DroneLoadoutResolver>;
    readonly droneLoadoutValidator?: Partial<DroneLoadoutValidator>;
  } = {},
) {
  const side = options.side ?? "shipA";
  const document = fakeDocument();
  globalThis.document = document;
  const els = collectDroneEls(document, side);
  els.field.appendChild(els.trigger);
  els.field.appendChild(els.popup);
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
  const droneCatalog = vi.mocked<DroneCatalog>({ ...mockDroneCatalog(), ...options.droneCatalog });
  const droneLoadoutResolver = vi.mocked<DroneLoadoutResolver>({ ...mockDroneLoadoutResolver(), ...options.droneLoadoutResolver });
  const droneLoadoutValidator = vi.mocked<DroneLoadoutValidator>({ ...mockDroneLoadoutValidator(), ...options.droneLoadoutValidator });
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
  const controller = new DroneControllerImpl({
    side,
    els,
    fittingImport,
    droneCatalog,
    droneLoadoutResolver,
    droneLoadoutValidator,
    imageCatalog,
    i18n,
    events,
    popupGroup,
  });
  return { document, controller, imageCatalog, fittingImport, i18n, events, popupGroup, droneCatalog, droneLoadoutResolver, droneLoadoutValidator };
}

export const NEUTRAL_CONDITIONS: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };
