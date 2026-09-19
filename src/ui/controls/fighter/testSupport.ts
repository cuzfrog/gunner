import type { FighterCatalog, FighterGroup, FighterLoadoutContext, FighterLoadoutResolver, FighterLoadoutValidation, FighterLoadoutValidator, FittingImport, ImportedFighter } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { StatConditions } from "../../../ships";
import { UiEventsImpl } from "../../events";
import type { I18n, Language } from "../../i18n";
import type { ImageCatalog } from "../../icons";
import type { PopupGroup } from "../popup";
import type { Side } from "../side";
import { fakeDocument } from "../testSupport";
import { FighterControllerImpl } from "./fighterController";
import type { FighterEls } from "./fighterControllerContract";

const SIDE_ID: Record<Side, "ship-a" | "ship-b"> = { shipA: "ship-a", shipB: "ship-b" };

export function collectFighterEls(document: Document, side: Side): FighterEls {
  const id = SIDE_ID[side];
  return {
    trigger: document.getElementById(`${id}-fighter-trigger`)! as HTMLButtonElement,
    summary: document.getElementById(`${id}-fighter-summary`)!,
    summaryIcon: document.getElementById(`${id}-fighter-summary-icon`)! as HTMLImageElement,
    popup: document.getElementById(`${id}-fighter-popup`)!,
    field: document.getElementById(`${id}-fighter-field`)!,
    optimal: document.getElementById(`${id}-fighter-optimal`)!,
    falloff: document.getElementById(`${id}-fighter-falloff`)!,
    damage: document.getElementById(`${id}-fighter-damage`)!,
    cycleTime: document.getElementById(`${id}-fighter-cycle-time`)!,
    maxVelocity: document.getElementById(`${id}-fighter-max-velocity`)!,
    count: document.getElementById(`${id}-fighter-count`)!,
    loadoutSection: document.getElementById(`${id}-fighter-loadout-section`)!,
    loadoutList: document.getElementById(`${id}-fighter-loadout-list`)!,
    summaryBar: document.getElementById(`${id}-fighter-summary-bar`)!,
    summarySquadrons: document.getElementById(`${id}-fighter-summary-squadrons`)!,
    summaryCount: document.getElementById(`${id}-fighter-summary-count`)!,
    summaryHangar: document.getElementById(`${id}-fighter-summary-hangar`)!,
    catalogSection: document.getElementById(`${id}-fighter-catalog-section`)!,
    catalogLight: document.getElementById(`${id}-fighter-catalog-light`)!,
    catalogHeavy: document.getElementById(`${id}-fighter-catalog-heavy`)!,
    catalogSupport: document.getElementById(`${id}-fighter-catalog-support`)!,
  };
}

export function importedFighterFixture(overrides: Partial<ImportedFighter> = {}): ImportedFighter {
  return {
    typeId: "34359" as TypeId,
    name: "Templar I",
    kind: "light",
    count: 6,
    squadronMaxSize: 6,
    maxVelocity: 1301.5625,
    orbitRange: 6500,
    signatureRadius: 40,
    refuelingTime: 5,
    volume: 2500,
    attack: { damageMultiplier: 1, emDamage: 97.5, thermalDamage: 0, kineticDamage: 0, explosiveDamage: 0, cycleTime: 5, explosionRadius: 185, explosionVelocity: 105, optimal: 10000, falloff: 5000, damageReductionFactor: 3, damageReductionSensitivity: 5.5, numShots: 12, rearmTime: 4 },
    damageBreakdown: { damageByType: { em: 97.5 }, factors: [] },
    ...overrides,
  };
}

export function supportFighterFixture(overrides: Partial<ImportedFighter> = {}): ImportedFighter {
  return importedFighterFixture({ typeId: "34375" as TypeId, name: "Cenobite I", kind: "support", attack: undefined, damageBreakdown: { damageByType: {}, factors: [] }, ...overrides });
}

export function buildFighter(
  options: {
    readonly side?: Side;
    readonly imageCatalog?: Partial<ImageCatalog>;
    readonly fittingImport?: Partial<FittingImport>;
    readonly i18n?: Partial<I18n>;
    readonly fighterCatalog?: Partial<FighterCatalog>;
    readonly fighterLoadoutResolver?: Partial<FighterLoadoutResolver>;
    readonly fighterLoadoutValidator?: Partial<FighterLoadoutValidator>;
  } = {},
) {
  const side = options.side ?? "shipA";
  const document = fakeDocument();
  globalThis.document = document;
  const els = collectFighterEls(document, side);
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
    resolveCapacitorStats: vi.fn(),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    propulsionStatsById: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(() => undefined),
    itemNameForId: vi.fn((id: TypeId) => String(id)),
    detectLanguageFromText: vi.fn(() => undefined),
    ...options.fittingImport,
  });
  const fighterCatalog = vi.mocked<FighterCatalog>({ ...mockFighterCatalog(), ...options.fighterCatalog });
  const fighterLoadoutResolver = vi.mocked<FighterLoadoutResolver>({ ...mockFighterLoadoutResolver(), ...options.fighterLoadoutResolver });
  const fighterLoadoutValidator = vi.mocked<FighterLoadoutValidator>({ ...mockFighterLoadoutValidator(), ...options.fighterLoadoutValidator });
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
  const controller = new FighterControllerImpl({
    side,
    els,
    fittingImport,
    fighterCatalog,
    fighterLoadoutResolver,
    fighterLoadoutValidator,
    imageCatalog,
    i18n,
    events,
    popupGroup,
  });
  return { document, controller, imageCatalog, fittingImport, i18n, events, popupGroup, fighterCatalog, fighterLoadoutResolver, fighterLoadoutValidator };
}

export const NEUTRAL_CONDITIONS: StatConditions = { skillLevel: 5, overloaded: false, weaponOverloaded: false };

function mockFighterCatalog(): FighterCatalog {
  return {
    fightersByKind: vi.fn(() => []),
    has: vi.fn(() => true),
    idForName: vi.fn(() => undefined),
  };
}

function mockFighterLoadoutResolver(): FighterLoadoutResolver {
  return {
    resolve: vi.fn((_groups: readonly FighterGroup[], _fitting: FighterLoadoutContext, _conditions: StatConditions): readonly ImportedFighter[] => []),
  };
}

function mockFighterLoadoutValidator(): FighterLoadoutValidator {
  return {
    validate: vi.fn((): FighterLoadoutValidation => ({ valid: true, totalFighters: 0, totalSquadrons: 0, totalVolume: 0, hangarCapacity: 0, violations: [] })),
  };
}
