import {
  SIG_RESOLUTIONS,
  type EngagementFrame,
  type HitChance,
  type HitChanceBreakdown,
  type ShipConfig,
  type SigResolutionClass,
  type SimConfig,
  type TurretSpec,
} from "../sim";
import { TrackingInput } from "./trackingInput";

export interface ControlsCallbacks {
  readonly onReset: () => void;
  readonly onConfigChange: () => void;
  readonly onPlayPause: () => void;
  readonly onSpeedChange: (speed: number) => void;
}

export interface Controls {
  getTurret(): TurretSpec;
  getTargetSig(): number;
  getConfig(): SimConfig;
  getSpeed(): number;
  update(frame: EngagementFrame, hit: HitChanceBreakdown): void;
  setPlaying(playing: boolean): void;
  setCallbacks(callbacks: ControlsCallbacks): void;
}

export class DomControls implements Controls {
  private readonly els: Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLElement>;
  private readonly hitChance: HitChance;
  private readonly trackingInput: TrackingInput;
  private callbacks?: ControlsCallbacks;

  constructor({ hitChance }: { hitChance: HitChance }) {
    this.hitChance = hitChance;
    this.trackingInput = new TrackingInput();
    this.els = {
      tracking: el("tracking"),
      trackingUnitRad: el("tracking-unit-rad"),
      trackingUnitScore: el("tracking-unit-score"),
      sigRes: el("sigRes"),
      optimal: el("optimal"),
      falloff: el("falloff"),
      attackerSpeed: el("attacker-speed"),
      attackerMode: el("attacker-mode"),
      attackerRange: el("attacker-range"),
      initialDistance: el("initial-distance"),
      targetSpeed: el("target-speed"),
      targetMode: el("target-mode"),
      targetRange: el("target-range"),
      targetSig: el("target-sig"),
      play: el("play"),
      reset: el("reset"),
      simSpeed: el("sim-speed"),
      resDistance: el("res-distance"),
      resTransversal: el("res-transversal"),
      resAngular: el("res-angular"),
      resRadial: el("res-radial"),
      resTrackPen: el("res-track-pen"),
      resRangePen: el("res-range-pen"),
      resHit: el("res-hit"),
      resHitCard: el("res-hit-card"),
    };

    this.setBestInitialDistance();
    this.bind();
  }

  getTurret(): TurretSpec {
    return {
      tracking: this.trackingInput.rad,
      sigResolution: SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass],
      optimal: num(this.els.optimal),
      falloff: num(this.els.falloff),
    };
  }

  getTargetSig(): number {
    return num(this.els.targetSig);
  }

  getConfig(): SimConfig {
    const initialDistance = Math.max(num(this.els.initialDistance), 1);
    const attacker: ShipConfig = {
      id: "attacker",
      maxSpeed: num(this.els.attackerSpeed),
      mode: (this.els.attackerMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.attackerRange),
      orbitDirection: "cw",
    };
    const target: ShipConfig = {
      id: "target",
      maxSpeed: num(this.els.targetSpeed),
      mode: (this.els.targetMode as HTMLSelectElement).value as ShipConfig["mode"],
      desiredRange: num(this.els.targetRange),
      orbitDirection: "cw",
    };
    return { attacker, target, initialDistance };
  }

  getSpeed(): number {
    return num(this.els.simSpeed);
  }

  update(frame: EngagementFrame, hit: HitChanceBreakdown): void {
    const trackPenalty = Number.isFinite(hit.trackingTerm) ? (0.5 ** hit.trackingTerm) * 100 : 0;
    const rangePenalty = Number.isFinite(hit.rangeTerm) ? (0.5 ** hit.rangeTerm) * 100 : 0;

    setText(this.els.resDistance, formatDistance(frame.distance));
    setText(this.els.resTransversal, `${frame.transversalSpeed.toFixed(1)} m/s`);
    setText(this.els.resAngular, `${frame.angularVelocity.toFixed(4)} rad/s`);
    setText(this.els.resRadial, `${frame.radialVelocity.toFixed(1)} m/s`);
    setText(this.els.resTrackPen, `${trackPenalty.toFixed(1)}%`);
    setText(this.els.resRangePen, `${rangePenalty.toFixed(1)}%`);
    setText(this.els.resHit, `${(hit.chance * 100).toFixed(1)}%`);

    (this.els.resHitCard as HTMLElement).style.borderColor = hitChanceColor(hit.chance);
  }

  setPlaying(playing: boolean): void {
    (this.els.play as HTMLButtonElement).textContent = playing ? "Pause" : "Play";
  }

  setCallbacks(callbacks: ControlsCallbacks): void {
    this.callbacks = callbacks;
  }

  private setBestInitialDistance(): void {
    const turret = this.getTurret();
    const targetSig = this.getTargetSig();
    const targetSpeed = num(this.els.targetSpeed);
    const best = this.hitChance.findBestDistance(targetSpeed, turret, targetSig);

    (this.els.initialDistance as HTMLInputElement).value = String(Math.round(best));

    // Make the target's desired orbit range match the starting distance by default.
    (this.els.targetRange as HTMLInputElement).value = String(Math.round(best));
  }

  private currentSigResolution(): number {
    return SIG_RESOLUTIONS[(this.els.sigRes as HTMLSelectElement).value as SigResolutionClass];
  }

  private setTrackingUnit(unit: "rad" | "score"): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setUnit(unit, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
    this.updateUnitToggle();
  }

  private updateTrackingFromInput(): void {
    const value = num(this.els.tracking);
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.setDisplayValue(value, sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateTrackingForSigResolution(): void {
    const sigResolution = this.currentSigResolution();
    const display = this.trackingInput.displayValue(sigResolution);
    (this.els.tracking as HTMLInputElement).value = String(display);
  }

  private updateUnitToggle(): void {
    (this.els.trackingUnitRad as HTMLButtonElement).classList.toggle("active", this.trackingInput.unit === "rad");
    (this.els.trackingUnitScore as HTMLButtonElement).classList.toggle("active", this.trackingInput.unit === "score");
  }

  private bind(): void {
    (this.els.play as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onPlayPause());
    (this.els.reset as HTMLButtonElement).addEventListener("click", () => this.callbacks?.onReset());
    (this.els.simSpeed as HTMLSelectElement).addEventListener("change", () => {
      this.callbacks?.onSpeedChange(this.getSpeed());
    });
    (this.els.trackingUnitRad as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("rad"));
    (this.els.trackingUnitScore as HTMLButtonElement).addEventListener("click", () => this.setTrackingUnit("score"));

    const inputs: (keyof typeof this.els)[] = [
      "tracking",
      "sigRes",
      "optimal",
      "falloff",
      "attackerSpeed",
      "attackerMode",
      "attackerRange",
      "initialDistance",
      "targetSpeed",
      "targetMode",
      "targetRange",
      "targetSig",
    ];
    for (const id of inputs) {
      this.els[id].addEventListener("input", () => {
        if (id === "tracking") this.updateTrackingFromInput();
        if (id === "sigRes") this.updateTrackingForSigResolution();
        this.callbacks?.onConfigChange();
      });
    }
  }
}

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing DOM element #${id}`);
  return e as HTMLElement;
}

function num(input: HTMLInputElement | HTMLSelectElement | HTMLElement): number {
  const value = (input as HTMLInputElement).value;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function formatDistance(m: number): string {
  if (m >= 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function hitChanceColor(chance: number): string {
  if (chance >= 0.9) return "#9cc954";
  if (chance >= 0.5) return "#5ccbcb";
  if (chance >= 0.25) return "#fce447";
  if (chance >= 0.05) return "#f67c0f";
  return "#d81f27";
}
