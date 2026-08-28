import type { TurretController } from "../turret";
import type { LauncherController } from "../launcher";
import type { WeaponKind } from "../../../sim";
import type { UiEvents } from "../../events";
import type { Side } from "../side";

export interface WeaponSystemSwitch {
  readonly side: Side;
  activeKind(): WeaponKind;
  setActiveKind(kind: WeaponKind): void;
  refresh(): void;
  clear(): void;
}

export interface WeaponSystemSwitchDeps {
  readonly side: Side;
  readonly container: HTMLElement;
  readonly turretButton: HTMLButtonElement;
  readonly missileButton: HTMLButtonElement;
  readonly turretController: TurretController;
  readonly launcherController: LauncherController;
  readonly events: UiEvents;
}

export class WeaponSystemSwitchImpl implements WeaponSystemSwitch {
  readonly side: Side;
  private readonly container: HTMLElement;
  private readonly turretButton: HTMLButtonElement;
  private readonly missileButton: HTMLButtonElement;
  private readonly turretController: TurretController;
  private readonly launcherController: LauncherController;
  private readonly events: UiEvents;
  private kind: WeaponKind = "turret";

  constructor(deps: WeaponSystemSwitchDeps) {
    this.side = deps.side;
    this.container = deps.container;
    this.turretButton = deps.turretButton;
    this.missileButton = deps.missileButton;
    this.turretController = deps.turretController;
    this.launcherController = deps.launcherController;
    this.events = deps.events;
    this.turretButton.addEventListener("click", () => this.onSelect("turret"));
    this.missileButton.addEventListener("click", () => this.onSelect("missile"));
    this.refresh();
  }

  activeKind(): WeaponKind {
    return this.kind;
  }

  setActiveKind(kind: WeaponKind): void {
    this.kind = kind;
    this.refresh();
  }

  refresh(): void {
    const hasTurret = this.turretController.turret() !== undefined;
    const hasLauncher = this.launcherController.launcher() !== undefined;
    const showSwitch = hasTurret && hasLauncher;
    this.container.classList.toggle("is-hidden", !showSwitch);
    if (!hasTurret && this.kind === "turret") {
      this.kind = hasLauncher ? "missile" : "turret";
    }
    if (!hasLauncher && this.kind === "missile") {
      this.kind = hasTurret ? "turret" : "missile";
    }
    this.turretButton.setAttribute("aria-pressed", String(this.kind === "turret"));
    this.missileButton.setAttribute("aria-pressed", String(this.kind === "missile"));
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
