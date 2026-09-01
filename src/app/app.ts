import type { DroneSimulator, DroneSimConfig, DroneSpec, EngagementFrameComposer, EngagementInput, EngagementView, EwarResolver, ShipState, Side, Simulation, WeaponSpec } from "../sim";
import type { Controls, EffectiveReadouts, Loop, Renderer, WeaponRange, WeaponRanges } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly droneSimulator: DroneSimulator;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    droneSimulator: DroneSimulator;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
    this.droneSimulator = deps.droneSimulator;
    this.engagementFrameComposer = deps.engagementFrameComposer;
    this.ewarResolver = deps.ewarResolver;
    this.renderer = deps.renderer;
    this.loop = deps.loop;
  }

  start(): void {
    this.loop.setTickHandler((dt) => this.tick(dt));
    this.loop.setSpeed(this.controls.getSpeed());
    this.controls.setCallbacks({
      onReset: () => {
        this.simulation.reset(this.controls.getConfig());
        this.droneSimulator.reset(this.droneSimConfig());
        this.loop.reset();
        this.renderFrame();
      },
      onConfigChange: () => {
        this.simulation.update(this.controls.getConfig());
        this.droneSimulator.reset(this.droneSimConfig());
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
    this.droneSimulator.reset(this.droneSimConfig());
    this.renderFrame();
  }

  tick(dt: number): void {
    this.simulation.step(dt);
    const snapshot = this.simulation.snapshot();
    const input = this.engagementInput(snapshot);
    const view = this.engagementFrameComposer.compose(snapshot, input);
    this.droneSimulator.step(dt, view.frame);
    this.renderFrame();
  }

  private droneSimConfig(): DroneSimConfig {
    return {
      shipA: droneSpecsFrom(this.controls.getWeapons("shipA")),
      shipB: droneSpecsFrom(this.controls.getWeapons("shipB")),
    };
  }

  private engagementInput(snapshot: ReturnType<Simulation["snapshot"]>): EngagementInput {
    return {
      weapons: { shipA: this.controls.getWeapons("shipA"), shipB: this.controls.getWeapons("shipB") },
      sigRadii: { shipA: this.controls.getSig("shipA"), shipB: this.controls.getSig("shipB") },
      droneStates: { shipA: this.droneSimulator.states("shipA"), shipB: this.droneSimulator.states("shipB") },
    };
  }

  private renderFrame(): void {
    const snapshot = this.simulation.snapshot();
    const view = this.engagementFrameComposer.compose(snapshot, this.engagementInput(snapshot));
    const effectiveReadouts: EffectiveReadouts = {
      shipA: this.sideReadoutValues(snapshot.shipA, snapshot.shipB, view, "shipA"),
      shipB: this.sideReadoutValues(snapshot.shipB, snapshot.shipA, view, "shipB"),
    };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setWeaponRangeVisibility(this.controls.getWeaponRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.draw(snapshot, view.frame, this.rendererWeaponRanges(view), this.controls.getOverlays());
    this.controls.update(view, effectiveReadouts);
  }

  private rendererWeaponRanges(view: EngagementView): WeaponRanges {
    return {
      shipA: this.weaponRangeForRenderer(view.effectiveWeapons.shipA, "shipA"),
      shipB: this.weaponRangeForRenderer(view.effectiveWeapons.shipB, "shipB"),
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

  private sideReadoutValues(ship: ShipState, opponent: ShipState, view: EngagementView, side: Side): EffectiveReadouts["shipA"] {
    const attack = view.attacks[side];
    const effectiveWeapon = attack?.effectiveWeapon ?? view.effectiveWeapons[side];
    const boostedWeapon = attack?.boostedWeapon ?? effectiveWeapon;
    const speedBreakdown = this.ewarResolver.speedBreakdown(opponent.ewar, view.frame.distance);
    if (effectiveWeapon?.kind === "missile") {
      return {
        kind: "missile",
        speed: ship.maxSpeed,
        explosionRadius: effectiveWeapon.explosionRadius,
        explosionVelocity: effectiveWeapon.explosionVelocity,
        maxVelocity: effectiveWeapon.maxVelocity,
        flightTime: effectiveWeapon.flightTime,
        flightRange: effectiveWeapon.flightRange,
        speedBreakdown,
      };
    }
    if (effectiveWeapon?.kind === "turret") {
      const boostedTurret = boostedWeapon?.kind === "turret" ? boostedWeapon : effectiveWeapon;
      const disruption = this.ewarResolver.disruptionBreakdown(opponent.ewar, view.frame.distance);
      return {
        kind: "turret",
        speed: ship.maxSpeed,
        tracking: effectiveWeapon.tracking,
        optimal: effectiveWeapon.optimal,
        falloff: effectiveWeapon.falloff,
        boostedTracking: boostedTurret.tracking,
        boostedOptimal: boostedTurret.optimal,
        boostedFalloff: boostedTurret.falloff,
        sigResolution: effectiveWeapon.sigResolution,
        speedBreakdown,
        trackingBreakdown: disruption,
        optimalBreakdown: disruption,
        falloffBreakdown: disruption,
      };
    }
    if (effectiveWeapon?.kind === "drone") {
      return {
        kind: "drone",
        speed: ship.maxSpeed,
        tracking: effectiveWeapon.tracking,
        optimal: effectiveWeapon.optimal,
        falloff: effectiveWeapon.falloff,
        sigResolution: effectiveWeapon.sigResolution,
        speedBreakdown,
      };
    }
    return { kind: "none", speed: ship.maxSpeed, speedBreakdown };
  }
}

function droneSpecsFrom(weapons: readonly WeaponSpec[]): readonly DroneSpec[] {
  return weapons.filter((w): w is DroneSpec => w.kind === "drone");
}
