import type { ImageCatalog } from "../../icons";
import type { ChargeCatalog, FittingImport } from "../../../fitting";
import type { Ships } from "../../../ships";
import type { I18n, Language } from "../../i18n";
import { UiEventsImpl } from "../../events";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import { TurretOverridesStore } from "./turretOverrides";
import type { TurretEls } from "./turretEls";
import {
  addSigResButtons, fakeDocument, getFake, FakeElement, mockChargeCatalog, mockFittingImport, mockGunFamilies, mockShips,
  mockTrackingInput,
} from "../testSupport";
import type { PopupGroup } from "../popup";

export function collectTurretEls(document: Document): TurretEls {
  const get = (id: string) => getFake(document, id) as unknown as HTMLElement;
  return {
    tracking: get("tracking") as HTMLInputElement,
    sigRes: get("sigRes") as HTMLSelectElement,
    sigResOptions: get("sig-res-options"),
    optimal: get("optimal") as HTMLInputElement,
    falloff: get("falloff") as HTMLInputElement,
    shipAAmmoTrigger: get("ship-a-ammo-trigger") as HTMLButtonElement,
    shipAAmmoSummary: get("ship-a-ammo-summary"),
    shipAAmmoSummaryIcon: get("ship-a-ammo-summary-icon") as HTMLImageElement,
    shipAAmmoPopup: get("ship-a-ammo-popup"),
    shipAAmmoCargoLabel: get("ship-a-ammo-cargo-label"),
    shipAAmmoCargoList: get("ship-a-ammo-cargo-list"),
    shipAAmmoExpand: get("ship-a-ammo-expand") as HTMLButtonElement,
    shipAAmmoAllSection: get("ship-a-ammo-all-section"),
    shipAAmmoAllList: get("ship-a-ammo-all-list"),
  };
}

export function setTurretInputs(document: Document): void {
  getFake(document, "tracking").value = "0.42";
  getFake(document, "sigRes").value = "S";
  getFake(document, "optimal").value = "5000";
  getFake(document, "falloff").value = "5000";
  getFake(document, "ship-a-ammo-all-section").hidden = true;
  getFake(document, "ship-a-ammo-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "ship-a-ammo-popup").hidden = true;
}

export function buildTurret(
  options: {
    imageCatalog?: Partial<ImageCatalog>;
    chargeCatalog?: Partial<ChargeCatalog>;
    fittingImport?: Partial<FittingImport>;
    ships?: Partial<Ships>;
  } = {},
) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
  addSigResOptions(document);
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

function addSigResOptions(document: Document): void {
  const select = getFake(document, "sigRes");
  for (const value of ["S", "M", "L", "XL"]) {
    const option = new FakeElement();
    option.tagName = "OPTION";
    option.value = value;
    select.appendChild(option);
  }
}
