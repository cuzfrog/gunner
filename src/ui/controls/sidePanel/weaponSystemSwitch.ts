import type { ImportedLauncher, ImportedTurret } from "../../../fitting";
import type { DroneSpec, FighterSpec, WeaponKind } from "../../../sim";
import { damageVectorSum } from "../../../sim";
import type { UiEvents } from "../../events";
import type { Side } from "../side";

interface FittedWeaponSystems {
  readonly turret?: ImportedTurret;
  readonly launcher?: ImportedLauncher;
  readonly drones?: readonly DroneSpec[];
  readonly fighters?: readonly FighterSpec[];
}

export interface WeaponSystemSwitch {
  readonly side: Side;
  activeKind(): WeaponKind;
  setActiveKind(kind: WeaponKind): void;
  autoSelectPrimary(systems: FittedWeaponSystems): void;
  refresh(): void;
  clear(): void;
}

export interface WeaponSystemSwitchDeps {
  readonly side: Side;
  readonly turretButton: HTMLButtonElement;
  readonly missileButton: HTMLButtonElement;
  readonly droneButton: HTMLButtonElement;
  readonly fighterButton: HTMLButtonElement;
  readonly turretPanel: HTMLElement;
  readonly launcherPanel: HTMLElement;
  readonly dronePanel: HTMLElement;
  readonly fighterPanel: HTMLElement;
  readonly events: UiEvents;
}

export class WeaponSystemSwitchImpl implements WeaponSystemSwitch {
  readonly side: Side;
  private readonly turretButton: HTMLButtonElement;
  private readonly missileButton: HTMLButtonElement;
  private readonly droneButton: HTMLButtonElement;
  private readonly fighterButton: HTMLButtonElement;
  private readonly turretPanel: HTMLElement;
  private readonly launcherPanel: HTMLElement;
  private readonly dronePanel: HTMLElement;
  private readonly fighterPanel: HTMLElement;
  private readonly events: UiEvents;
  private kind: WeaponKind = "turret";

  constructor(deps: WeaponSystemSwitchDeps) {
    this.side = deps.side;
    this.turretButton = deps.turretButton;
    this.missileButton = deps.missileButton;
    this.droneButton = deps.droneButton;
    this.fighterButton = deps.fighterButton;
    this.turretPanel = deps.turretPanel;
    this.launcherPanel = deps.launcherPanel;
    this.dronePanel = deps.dronePanel;
    this.fighterPanel = deps.fighterPanel;
    this.events = deps.events;
    this.turretButton.addEventListener("click", () => this.onSelect("turret"));
    this.missileButton.addEventListener("click", () => this.onSelect("missile"));
    this.droneButton.addEventListener("click", () => this.onSelect("drone"));
    this.fighterButton.addEventListener("click", () => this.onSelect("fighter"));
    this.refresh();
  }

  activeKind(): WeaponKind {
    return this.kind;
  }

  setActiveKind(kind: WeaponKind): void {
    this.kind = kind;
    this.refresh();
  }

  autoSelectPrimary(systems: FittedWeaponSystems): void {
    const kind = primaryKind(systems);
    if (kind) this.kind = kind;
    this.refresh();
  }

  refresh(): void {
    this.turretButton.disabled = false;
    this.missileButton.disabled = false;
    this.droneButton.disabled = false;
    this.fighterButton.disabled = false;
    this.turretPanel.hidden = this.kind !== "turret";
    this.launcherPanel.hidden = this.kind !== "missile";
    this.dronePanel.hidden = this.kind !== "drone";
    this.fighterPanel.hidden = this.kind !== "fighter";
    this.turretButton.setAttribute("aria-pressed", String(this.kind === "turret"));
    this.missileButton.setAttribute("aria-pressed", String(this.kind === "missile"));
    this.droneButton.setAttribute("aria-pressed", String(this.kind === "drone"));
    this.fighterButton.setAttribute("aria-pressed", String(this.kind === "fighter"));
  }

  clear(): void {
    this.kind = "turret";
    this.refresh();
  }

  private onSelect(kind: WeaponKind): void {
    if (this.kind === kind) return;
    this.kind = kind;
    this.refresh();
    this.events.emitConfigInvalidated();
  }
}

// Priority order for dps ties: ship-mounted guns before missiles before drones.
function primaryKind(systems: FittedWeaponSystems): WeaponKind | undefined {
  const dps: readonly (readonly [WeaponKind, number])[] = [["turret", turretDps(systems.turret)], ["missile", launcherDps(systems.launcher)], ["drone", dronesDps(systems.drones)], ["fighter", fightersDps(systems.fighters)]];
  let best: readonly [WeaponKind, number] | undefined;
  for (const entry of dps) {
    if (entry[1] <= 0) continue;
    if (best === undefined || entry[1] > best[1]) best = entry;
  }
  return best?.[0];
}

function turretDps(turret: ImportedTurret | undefined): number {
  return turret && turret.cycleTime > 0 ? (damageVectorSum(turret.damagePerShot) * turret.turretCount) / turret.cycleTime : 0;
}

function launcherDps(launcher: ImportedLauncher | undefined): number {
  return launcher && launcher.cycleTime > 0 ? (damageVectorSum(launcher.damagePerMissile) * launcher.count) / launcher.cycleTime : 0;
}

function dronesDps(drones: readonly DroneSpec[] | undefined): number {
  return (drones ?? []).reduce((total, drone) => total + droneDps(drone), 0);
}

function droneDps(drone: DroneSpec): number {
  return drone.cycleTime > 0 ? (damageVectorSum(drone.damagePerShot) * drone.droneCount) / drone.cycleTime : 0;
}

function fightersDps(fighters: readonly FighterSpec[] | undefined): number {
  return (fighters ?? []).reduce((total, fighter) => total + fighterDps(fighter), 0);
}

function fighterDps(fighter: FighterSpec): number {
  return fighter.cycleTime > 0 ? (damageVectorSum(fighter.damagePerVolley) * fighter.fighterCount) / fighter.cycleTime : 0;
}
