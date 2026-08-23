import type { ImageCatalog } from "../../icons";
import type { ChargeCatalog, FittingImport } from "../../../fitting";
import type { I18n, Language } from "../../i18n";
import type { ProfileParamOverrides } from "../../settings";
import { TurretControllerImpl } from "./turretController";
import { TurretStateResolver } from "./turretStateResolver";
import type { TurretEls } from "./turretEls";
import { addSigResButtons, fakeDocument, getFake, FakeElement, mockChargeCatalog, mockFittingImport, mockGunFamilies, mockTrackingInput } from "../testSupport";

export function collectTurretEls(document: Document): TurretEls {
  const get = (id: string) => getFake(document, id) as unknown as HTMLElement;
  return {
    tracking: get("tracking") as HTMLInputElement,
    sigRes: get("sigRes") as HTMLSelectElement,
    sigResOptions: get("sig-res-options"),
    optimal: get("optimal") as HTMLInputElement,
    falloff: get("falloff") as HTMLInputElement,
    attackerAmmoTrigger: get("attacker-ammo-trigger") as HTMLButtonElement,
    attackerAmmoSummary: get("attacker-ammo-summary"),
    attackerAmmoSummaryIcon: get("attacker-ammo-summary-icon") as HTMLImageElement,
    attackerAmmoPopup: get("attacker-ammo-popup"),
    attackerAmmoCargoLabel: get("attacker-ammo-cargo-label"),
    attackerAmmoCargoList: get("attacker-ammo-cargo-list"),
    attackerAmmoExpand: get("attacker-ammo-expand") as HTMLButtonElement,
    attackerAmmoAllSection: get("attacker-ammo-all-section"),
    attackerAmmoAllList: get("attacker-ammo-all-list"),
  };
}

export function setTurretInputs(document: Document): void {
  getFake(document, "tracking").value = "0.42";
  getFake(document, "sigRes").value = "S";
  getFake(document, "optimal").value = "5000";
  getFake(document, "falloff").value = "5000";
  getFake(document, "attacker-ammo-all-section").hidden = true;
  getFake(document, "attacker-ammo-trigger").setAttribute("aria-expanded", "false");
  getFake(document, "attacker-ammo-popup").hidden = true;
}

export function buildTurret(
  options: {
    overrides?: Partial<ProfileParamOverrides>;
    imageCatalog?: Partial<ImageCatalog>;
    chargeCatalog?: Partial<ChargeCatalog>;
    fittingImport?: Partial<FittingImport>;
  } = {},
) {
  const document = fakeDocument();
  globalThis.document = document as unknown as Document;
  globalThis.Element = FakeElement as unknown as typeof Element;
  const els = collectTurretEls(document);
  setTurretInputs(document);
  addSigResButtons(document);
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
  const chargeCatalog = vi.mocked<ChargeCatalog>({
    usualForChargeSize: vi.fn(() => "Hail S"),
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
    ...options.fittingImport,
  });
  const overrides = () => options.overrides ?? {};
  const clearTurretOverrides = vi.fn();
  const onConfigChange = vi.fn();
  const popup = {
    isOpen: vi.fn(() => false),
    open: vi.fn(),
    close: vi.fn(),
    focusTrigger: vi.fn(),
    contains: vi.fn(),
  };
  const resolver = new TurretStateResolver({ chargeCatalog, fittingImport });
  const controller = new TurretControllerImpl({
    els,
    popup,
    chargeCatalog,
    gunFamilies,
    imageCatalog,
    trackingInput,
    i18n,
    fittingImport,
    resolver,
    overrides,
    clearTurretOverrides,
    onConfigChange,
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
    clearTurretOverrides,
    onConfigChange,
    popup,
  };
}
