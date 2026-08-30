import type { ImageCatalog } from "../../icons";
import type { ChargeCatalog, FittingCalculator, FittingImport, FittingOverridesStore } from "../../../fitting";
import { FittingOverridesStoreImpl } from "../../../fitting";
import type { TypeId } from "../../../gamedata/ids";
import type { Ships } from "../../../ships";
import { registerSimModule, type SigResolutionClass, type SimCradle, type SimValueParser } from "../../../sim";
import { createContainer, InjectionMode } from "awilix";
import type { I18n, Language } from "../../i18n";
import { UiEventsImpl } from "../../events";
import { PanelConfigurationMemoryImpl } from "../../panelConfigurationMemory";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import type { Side } from "../side";
import type { TurretEls } from "./turretEls";
import {
  addSigResButtons, fakeDocument, getFake, FakeElement, CHARGE_OPTIONS, mockGunFamilies, mockShips,
  mockTrackingInput,
} from "../testSupport";
import { TURRET } from "../../testing";
import type { PopupGroup } from "../popup";

const SIDE_ID: Record<Side, "ship-a" | "ship-b"> = { shipA: "ship-a", shipB: "ship-b" };

function sideId(side: Side): "ship-a" | "ship-b" {
  return SIDE_ID[side];
}

export function collectTurretEls(document: Document, side: Side): TurretEls {
  const id = sideId(side);
  return {
    tracking: document.getElementById(`${id}-tracking`)! as HTMLInputElement,
    sigRes: document.getElementById(`${id}-sigRes`)! as HTMLSelectElement,
    sigResOptions: document.getElementById(`${id}-sig-res-options`)!,
    variantGear: document.getElementById(`${id}-turret-variant-gear`)! as HTMLButtonElement,
    variants: document.getElementById(`${id}-turret-variants`)!,
    optimal: document.getElementById(`${id}-optimal`)! as HTMLInputElement,
    falloff: document.getElementById(`${id}-falloff`)! as HTMLInputElement,
    ammoField: document.getElementById(`${id}-ammo-field`)!,
    ammoTrigger: document.getElementById(`${id}-ammo-trigger`)! as HTMLButtonElement,
    ammoSummary: document.getElementById(`${id}-ammo-summary`)!,
    ammoSummaryIcon: document.getElementById(`${id}-ammo-summary-icon`)! as HTMLImageElement,
    ammoPopup: document.getElementById(`${id}-ammo-popup`)!,
    ammoCargoLabel: document.getElementById(`${id}-ammo-cargo-label`)!,
    ammoCargoList: document.getElementById(`${id}-ammo-cargo-list`)!,
    ammoExpand: document.getElementById(`${id}-ammo-expand`)! as HTMLButtonElement,
    ammoAllSection: document.getElementById(`${id}-ammo-all-section`)!,
    ammoAllList: document.getElementById(`${id}-ammo-all-list`)!,
  };
}

export function setTurretInputs(document: Document, side: Side): void {
  const id = sideId(side);
  getFake(document, `${id}-tracking`).value = "0.42";
  getFake(document, `${id}-sigRes`).value = "S";
  getFake(document, `${id}-optimal`).value = "5000";
  getFake(document, `${id}-falloff`).value = "5000";
  getFake(document, `${id}-ammo-all-section`).hidden = true;
  getFake(document, `${id}-ammo-trigger`).setAttribute("aria-expanded", "false");
  getFake(document, `${id}-ammo-popup`).hidden = true;
}

export function buildTurret(
  options: {
    side?: Side;
    imageCatalog?: Partial<ImageCatalog>;
    chargeCatalog?: Partial<ChargeCatalog>;
    fittingImport?: Partial<FittingImport>;
    ships?: Partial<Ships>;
    i18n?: Partial<I18n>;
  } = {},
) {
  const side = options.side ?? "shipA";
  const document = fakeDocument();
  globalThis.document = document;
  const els = collectTurretEls(document, side);
  setTurretInputs(document, side);
  addSigResButtons(document);
  addSigResOptions(document, side);
  const trackingInput = mockTrackingInput();
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
  const gunFamilies = mockGunFamilies();
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const hail: TypeId = "12608" as TypeId;
  const chargeCatalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => hail),
    usualForTurret: vi.fn(() => hail),
    chargesForSize: vi.fn(() => CHARGE_OPTIONS),
    chargesForTurret: vi.fn(() => CHARGE_OPTIONS),
    withCharge: vi.fn((turret, chargeId) => ({ ...turret, chargeId })),
    idForName: vi.fn((name) => CHARGE_OPTIONS.find((c) => c.name === name)?.id),
    has: vi.fn((id: TypeId) => CHARGE_OPTIONS.some((c) => c.id === id)),
    equivalentInSize: vi.fn(() => undefined),
    ...options.chargeCatalog,
  });
  const NAME_FOR_ID: Record<string, string> = {
    "12608": "Hail S",
    "21898": "Republic Fleet EMP S",
  };
  const itemNameForId = (id: TypeId, language: string): string => {
    if (id === "12608" && language === "zh") return "海怪 S";
    return NAME_FOR_ID[id] ?? String(id);
  };
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    propulsionStatsById: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(() => undefined),
    itemNameForId: vi.fn(itemNameForId),
    detectLanguageFromText: vi.fn(() => undefined),
    ...options.fittingImport,
  });
  const turretOverrides = new TurretOverridesStore();
  const fittingOverrides = new FittingOverridesStoreImpl();
  const panelMemory = new PanelConfigurationMemoryImpl();
  const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
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
  const SIG_RES_BY_MODULE: Record<string, SigResolutionClass> = {
    "486": "S", "21076": "S", "491": "M", "496": "L", "37289": "XL",
    "488": "S", "493": "M", "498": "L", "20454": "XL",
    "450": "S", "458": "M", "462": "L", "20444": "XL",
    "454": "S", "459": "M", "464": "L", "20446": "XL",
    "564": "S", "568": "M", "573": "L", "20450": "XL",
    "565": "S", "570": "M", "574": "L", "20448": "XL",
  };
  const CHARGE_SIZE_BY_SIG_RES: Record<SigResolutionClass, number> = { S: 1, M: 2, L: 3, XL: 4 };
  const fittingCalculator = vi.mocked<FittingCalculator>({
    resolveTurrets: vi.fn((state, _conditions) => state.turretGroups.map((g: { moduleId: TypeId; chargeId?: TypeId; count: number }) => {
      const chargeId = g.chargeId ?? hail;
      const charge = CHARGE_OPTIONS.find((c) => c.id === chargeId);
      const trackingMultiplier = charge?.trackingMultiplier ?? 1;
      const rangeMultiplier = charge?.rangeMultiplier ?? 1;
      const falloffMultiplier = charge?.falloffMultiplier ?? 1;
      const sigRes = SIG_RES_BY_MODULE[String(g.moduleId)] ?? "S";
      return {
        ...TURRET,
        moduleId: g.moduleId,
        chargeId,
        sigResolutionClass: sigRes,
        chargeSize: CHARGE_SIZE_BY_SIG_RES[sigRes],
        turretCount: g.count,
        tracking: TURRET.base.tracking * trackingMultiplier,
        optimal: TURRET.base.optimal * rangeMultiplier,
        falloff: TURRET.base.falloff * falloffMultiplier,
        damagePerShot: TURRET.damageMultiplier * (charge ? 20 : TURRET.damagePerShot / TURRET.damageMultiplier),
      };
    })),
    resolveLauncher: vi.fn(() => undefined),
    resolveHull: vi.fn(() => ({ fitted: { mass: 0, massMultiplier: 1, speedMultiplier: 1, inertiaMultiplier: 1, sigMultiplier: 1, sigRadiusAdd: 0 } })),
    resolvePropulsion: vi.fn(() => undefined),
    resolveEwar: vi.fn(() => ({ webs: [], grapplers: [], disruptors: [], scramblers: [], painters: [], scripts: [] })),
    resolveBoosts: vi.fn(() => ({ computers: [], scripts: [] })),
    resolveCargoCharges: vi.fn(() => []),
  });
  const controller = new TurretControllerImpl({
    side,
    els,
    chargeCatalog,
    gunFamilies,
    imageCatalog,
    trackingInput,
    i18n,
    fittingImport,
    resolver,
    turretOverrides,
    ships,
    events,
    popupGroup,
    simValueParser: simValueParserFromContainer(),
    fittingCalculator,
    fittingOverrides,
    panelMemory,
  });
  return {
    document,
    controller,
    chargeCatalog,
    imageCatalog,
    fittingImport,
    gunFamilies,
    i18n,
    trackingInput,
    turretOverrides,
    fittingOverrides,
    panelMemory,
    fittingCalculator,
    events,
    popupGroup,
  };
}

function addSigResOptions(document: Document, side: Side): void {
  const select = getFake(document, `${sideId(side)}-sigRes`);
  for (const value of ["S", "M", "L", "XL"]) {
    const option = new FakeElement();
    option.tagName = "OPTION";
    option.value = value;
    select.appendChild(option);
  }
}

function simValueParserFromContainer(): SimValueParser {
  const container = createContainer<SimCradle>({ injectionMode: InjectionMode.PROXY });
  registerSimModule(container);
  return container.cradle.simValueParser;
}
