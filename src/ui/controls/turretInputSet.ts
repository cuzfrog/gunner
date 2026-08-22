import { SIG_RESOLUTIONS } from "../../sim";
import type { ImportedTurret } from "../../fitting";
import type { ProfileParamOverrides } from "../settings";
import { isSigResClass } from "./controlsFormat";
import type { SigResButtons } from "./sigResButtons";
import { TrackingInput } from "./trackingInput";
import type { TurretEls } from "./turretEls";

interface TurretInputSetDeps {
  readonly els: TurretEls;
  readonly trackingInput: TrackingInput;
  readonly sigResButtons: SigResButtons;
  readonly overrides: () => Partial<ProfileParamOverrides>;
}

export class TurretInputSet {
  private readonly els: TurretEls;
  private readonly trackingInput: TrackingInput;
  private readonly sigResButtons: SigResButtons;
  private readonly overrides: () => Partial<ProfileParamOverrides>;

  constructor(deps: TurretInputSetDeps) {
    this.els = deps.els;
    this.trackingInput = deps.trackingInput;
    this.sigResButtons = deps.sigResButtons;
    this.overrides = deps.overrides;
  }

  set(turret: ImportedTurret): void {
    const sigResolution = SIG_RESOLUTIONS[turret.sigResolutionClass];
    const overrides = this.overrides();
    if (overrides.tracking === undefined) this.trackingInput.setRadValue(turret.tracking, sigResolution);
    if (overrides.sigRes === undefined) {
      this.els.sigRes.value = turret.sigResolutionClass;
      this.sigResButtons.set(turret.sigResolutionClass);
    }
    if (overrides.optimal === undefined) this.els.optimal.value = String(Math.round(turret.optimal));
    if (overrides.falloff === undefined) this.els.falloff.value = String(Math.round(turret.falloff));
    this.els.tracking.value = String(this.trackingInput.displayValue(sigResolution));
  }

  currentSigResValue(): "S" | "M" | "L" | "XL" {
    const value = this.els.sigRes.value;
    if (!isSigResClass(value)) throw new Error(`Invalid sigRes value: ${value}`);
    return value;
  }
}
