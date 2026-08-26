import type { ImageCatalog } from "../../icons";
import type { ChargeCatalog, FittingImport } from "../../../fitting";
import type { Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import { UiEventsImpl } from "../../events";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import type { Side } from "../side";
import type { TurretEls } from "./turretEls";
import {
  addSigResButtons, fakeDocument, getFake, FakeElement, mockChargeCatalog, mockFittingImport, mockGunFamilies, mockShips,
  mockTrackingInput,
} from "../testSupport";
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
  });
  const imageCatalog = vi.mocked<ImageCatalog>({
    shipImageUrl: vi.fn(),
    itemIconUrl: vi.fn(() => undefined),
    droneIconUrl: vi.fn(),
    ...options.imageCatalog,
  });
  const gunFamilies = mockGunFamilies();
  const ships = vi.mocked<Ships>({ ...mockShips(), ...options.ships });
  const chargeCatalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => "Hail S"),
    usualForTurret: vi.fn(() => "Hail S"),
    chargesForSize: vi.fn(() => []),
    chargesForTurret: vi.fn(() => []),
    withCharge: vi.fn((turret) => turret),
    ...options.chargeCatalog,
  });
  const fittingImport = vi.mocked<FittingImport>({
    importFitting: vi.fn(() => undefined),
    propulsionVariantNames: vi.fn(),
    propulsionStats: vi.fn(),
    summarize: vi.fn(),
    canonicalEftText: vi.fn(() => undefined),
    itemName: vi.fn((name: string) => name),
    canonicalName: vi.fn((name: string) => name),
    ...options.fittingImport,
  });
  const turretOverrides = new TurretOverridesStore();
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
