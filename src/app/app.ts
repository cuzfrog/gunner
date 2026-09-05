import { Vec2 } from "../sim";
import type { DroneRuntimeState, DroneSpec, EngineView, EngagementEngine, Side, WeaponSpec } from "../sim";
import type { Controls, DroneGroupRenderInfo, DroneRenderInfo, Loop, MissileRenderCollection, Renderer, WeaponRange, WeaponRanges } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly engine: EngagementEngine;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    engine: EngagementEngine;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.engine = deps.engine;
    this.renderer = deps.renderer;
    this.loop = deps.loop;
  }

  start(): void {
    this.loop.setTickHandler((dt) => this.tick(dt));
    this.loop.setSpeed(this.controls.getSpeed());
    this.controls.setCallbacks({
      onReset: () => {
        this.engine.reset(this.controls.getEngineConfig());
        this.loop.reset();
        this.renderFrame();
      },
      onConfigChange: () => {
        this.engine.update(this.controls.getEngineConfig());
        this.renderFrame();
      },
      onDisplayChange: () => this.renderFrame(),
      onPlayPause: () => {
        this.loop.toggle();
        this.controls.setPlaying(this.loop.isRunning());
      },
      onStop: () => {
        this.loop.stop();
        this.controls.setPlaying(false);
      },
      onSpeedChange: (speed) => this.loop.setSpeed(speed),
    });
    this.engine.reset(this.controls.getEngineConfig());
    this.renderFrame();
  }

  tick(dt: number): void {
    const view = this.engine.step(dt);
    if (view.defenseRuntime.dead.shipA || view.defenseRuntime.dead.shipB) {
      this.loop.stop();
      this.controls.setPlaying(false);
    }
    this.renderFrame(view);
  }

  private renderFrame(view?: EngineView): void {
    const v = view ?? this.engine.view();
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setWeaponRangeVisibility(this.controls.getWeaponRangeVisibility());
    this.renderer.setDroneRangeVisibility(this.controls.getDroneRangeVisibility());
    this.renderer.setDroneControlRangeVisibility(this.controls.getDroneControlRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.setLockStates(v.locks);
    this.renderer.draw(v.snapshot, v.frame, this.rendererWeaponRanges(v), this.controls.getOverlays(), this.droneRenderInfo(v), this.missileRenderInfo(v), v.defenseRuntime);
    this.controls.update(v, v.readouts, v.defenseRuntime);
  }

  private rendererWeaponRanges(view: EngineView): WeaponRanges {
    return {
      shipA: this.weaponRangeForRenderer(view.effectiveWeapons.shipA, "shipA"),
      shipB: this.weaponRangeForRenderer(view.effectiveWeapons.shipB, "shipB"),
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

  private weaponRangeForRenderer(weapon: WeaponSpec | undefined, side: Side): WeaponRange {
    if (weapon?.kind === "turret") return { kind: "turret", optimal: weapon.optimal, falloff: weapon.falloff };
    if (weapon?.kind === "drone") return { kind: "drone", optimal: weapon.optimal, falloff: weapon.falloff };
    if (weapon?.kind === "missile") return { kind: "missile", range: weapon.flightRange };
    const fallback = this.controls.getWeapon(side);
    if (fallback?.kind === "missile") return { kind: "missile", range: fallback.flightRange };
    return { kind: "turret", optimal: 0, falloff: 0 };
  }
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
