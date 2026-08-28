import { SIG_RESOLUTIONS, type SigResolutionClass, type SimValueParser } from "../../../sim";
import type { ImportedTurret } from "../../../fitting";
import type { ChoiceGroup } from "../choiceGroup";
import type { TrackingInput } from "../trackingInput";
import type { TurretEls } from "./turretEls";
import type { TurretOverrides } from "./turretOverrides";

interface TurretInputSetDeps {
  readonly els: TurretEls;
  readonly trackingInput: TrackingInput;
  readonly sigResChoice: ChoiceGroup;
  readonly turretOverrides: TurretOverrides;
  readonly simValueParser: SimValueParser;
}

export class TurretInputSet {
  private readonly els: TurretEls;
  private readonly trackingInput: TrackingInput;
  private readonly sigResChoice: ChoiceGroup;
  private readonly turretOverrides: TurretOverrides;
  private readonly simValueParser: SimValueParser;

  constructor(deps: TurretInputSetDeps) {
    this.els = deps.els;
    this.trackingInput = deps.trackingInput;
    this.sigResChoice = deps.sigResChoice;
    this.turretOverrides = deps.turretOverrides;
    this.simValueParser = deps.simValueParser;
  }

  set(turret: ImportedTurret): void {
    const overrides = this.turretOverrides.get();
    const sigRes = overrides.sigRes ?? turret.sigResolutionClass;
    const sigResolution = SIG_RESOLUTIONS[sigRes];
    if (overrides.tracking !== undefined) this.trackingInput.setRadValue(overrides.tracking, sigResolution);
    else this.trackingInput.setRadValue(turret.tracking, sigResolution);
    this.els.sigRes.value = sigRes;
    this.sigResChoice.set(sigRes);
    if (overrides.optimal !== undefined) this.els.optimal.value = String(Math.round(overrides.optimal));
    else this.els.optimal.value = String(Math.round(turret.optimal));
    if (overrides.falloff !== undefined) this.els.falloff.value = String(Math.round(overrides.falloff));
    else this.els.falloff.value = String(Math.round(turret.falloff));
    this.els.tracking.value = String(this.trackingInput.displayValue(sigResolution));
  }

  setSigRes(value: SigResolutionClass): void {
    this.els.sigRes.value = value;
    this.sigResChoice.set(value);
    this.els.tracking.value = String(this.trackingInput.displayValue(SIG_RESOLUTIONS[value]));
  }

  setEnabled(enabled: boolean): void {
    this.els.tracking.disabled = !enabled;
    this.els.sigRes.disabled = !enabled;
    this.els.optimal.disabled = !enabled;
    this.els.falloff.disabled = !enabled;
  }

  currentSigResValue(): SigResolutionClass {
    const parsed = this.simValueParser.parseSigResolutionClass(this.els.sigRes.value);
    if (parsed === undefined) throw new Error(`Invalid sigRes value: ${this.els.sigRes.value}`);
    return parsed;
  }
}
