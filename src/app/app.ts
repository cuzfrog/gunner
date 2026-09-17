import { Vec2 } from "../sim";
import type { DroneRuntimeState, DroneSpec, EngineView, EngagementEngine, Side, WeaponSpec } from "../sim";
import type { Controls, DroneGroupRenderInfo, DroneRenderInfo, Loop, MissileRenderCollection, Renderer, UiEvents, WeaponRange, WeaponRanges } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly engine: EngagementEngine;
  private readonly renderer: Renderer;
  private readonly loop: Loop;
  private cameraRanges: WeaponRanges = { shipA: ZERO_RANGE, shipB: ZERO_RANGE };

  constructor(deps: {
    controls: Controls;
    engine: EngagementEngine;
    renderer: Renderer;
    loop: Loop;
    uiEvents: UiEvents;
  }) {
    this.controls = deps.controls;
    this.engine = deps.engine;
    this.renderer = deps.renderer;
    this.loop = deps.loop;
    deps.uiEvents.onCapBoosterInject((side, boosterIndex) => this.engine.injectCapBooster(side, boosterIndex));
  }

  start(): void {
    this.refreshCameraRanges();
    this.loop.setTickHandler((dt) => this.tick(dt));
    this.loop.setSpeed(this.controls.getSpeed());
    this.controls.setCallbacks({
      onReset: () => {
        this.engine.reset(this.controls.getEngineConfig());
        this.loop.reset();
        this.controls.setPlaying(this.loop.isRunning(), false);
      },
      onConfigChange: () => {
        this.refreshCameraRanges();
        this.engine.update(this.controls.getEngineConfig());
      },
      onDisplayChange: () => this.renderFrame(),
      onPlayPause: () => {
        if (this.isEnded()) {
          this.engine.reset(this.controls.getEngineConfig());
          this.loop.reset();
          this.loop.start();
          this.controls.setPlaying(true, false);
          return;
        }
        this.loop.toggle();
        this.controls.setPlaying(this.loop.isRunning(), this.isEnded());
      },
      onStop: () => {
        this.loop.stop();
        this.controls.setPlaying(false, this.isEnded());
      },
      onSpeedChange: (speed) => this.loop.setSpeed(speed),
    });
    this.engine.events().onViewUpdated((view) => this.renderFrame(view));
    this.engine.events().onShipDestroyed(() => {
      this.loop.stop();
      this.controls.setPlaying(false, true);
    });
    this.engine.reset(this.controls.getEngineConfig());
  }

  tick(dt: number): void { this.engine.step(dt); }

  private isEnded(): boolean {
    const dead = this.engine.view().defenseRuntime.dead;
    return dead.shipA || dead.shipB;
  }

  private renderFrame(view?: EngineView): void {
    const v = view ?? this.engine.view();
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setWeaponRangeVisibility(this.controls.getWeaponRangeVisibility());
    this.renderer.setDroneRangeVisibility(this.controls.getDroneRangeVisibility());
    this.renderer.setDroneControlRangeVisibility(this.controls.getDroneControlRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.setCameraRanges(this.cameraRanges);
    this.renderer.setLockStates(v.locks);
    this.renderer.draw(v.snapshot, v.frame, this.rendererWeaponRanges(v), this.controls.getOverlays(), this.droneRenderInfo(v), this.missileRenderInfo(v), v.defenseRuntime);
  }

  private refreshCameraRanges(): void {
    const weapons = this.controls.getEngineConfig().weapons;
    this.cameraRanges = { shipA: configuredWeaponRange(firstMountedWeapon(weapons.shipA)), shipB: configuredWeaponRange(firstMountedWeapon(weapons.shipB)) };
  }

  private rendererWeaponRanges(view: EngineView): WeaponRanges {
    return {
      shipA: this.shipWeaponRange(view, "shipA"),
      shipB: this.shipWeaponRange(view, "shipB"),
    };
  }

  private droneRenderInfo(view: EngineView): DroneRenderInfo {
    return {
      shipA: droneGroupRenderInfo(view.drones.shipA, view.droneSpecs.shipA),
      shipB: droneGroupRenderInfo(view.drones.shipB, view.droneSpecs.shipB),
    };
  }

  private missileRenderInfo(view: EngineView): MissileRenderCollection {
    return {
      shipA: view.missiles.shipA.map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail })),
      shipB: view.missiles.shipB.map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail })),
    };
  }

  // The ship-centered weapon ring represents ship-mounted weapons only. Drone optimal/falloff is
  // measured from the drone, not the ship, so drone weapons never produce this ring; drone
  // envelopes render through DroneRenderInfo group rings and the drone control range ring.
  private shipWeaponRange(view: EngineView, side: Side): WeaponRange {
    const mounted = view.weaponAttacks[side].find((attack) => attack.weapon.kind !== "drone");
    return mounted ? configuredWeaponRange(mounted.assessment.effectiveWeapon) : ZERO_RANGE;
  }
}

const ZERO_RANGE: WeaponRange = { kind: "turret", optimal: 0, falloff: 0 };

function configuredWeaponRange(weapon: WeaponSpec | undefined): WeaponRange {
  if (weapon?.kind === "turret") return { kind: "turret", optimal: weapon.optimal, falloff: weapon.falloff };
  if (weapon?.kind === "missile") return { kind: "missile", range: weapon.flightRange };
  return ZERO_RANGE;
}

function firstMountedWeapon(weapons: readonly WeaponSpec[]): WeaponSpec | undefined {
  return weapons.find((weapon) => weapon.kind !== "drone");
}

function droneGroupRenderInfo(states: readonly DroneRuntimeState[], specs: readonly DroneSpec[]): readonly DroneGroupRenderInfo[] {
  const out: DroneGroupRenderInfo[] = [];
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const state = states[i];
    out.push({ positions: state?.positions ?? [new Vec2(0, 0)], optimal: spec.optimal, falloff: spec.falloff, controlRange: spec.controlRange });
  }
  return out;
}
