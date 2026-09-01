import { Vec2 } from "../sim";
import type { DroneRuntimeState, DroneSimulator, DroneSimConfig, DroneSpec, EngagementFrameComposer, EngagementInput, EngagementView, EwarResolver, MissileBoosterResolver, MissileLaunchSpec, MissileSimulator, MissileSimConfig, MissileSpec, ShipState, Side, Simulation, WeaponSpec } from "../sim";
import type { Controls, DroneGroupRenderInfo, DroneRenderInfo, EffectiveReadouts, Loop, Renderer, WeaponRange, WeaponRanges } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly droneSimulator: DroneSimulator;
  private readonly missileSimulator: MissileSimulator;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly missileBoosterResolver: MissileBoosterResolver;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    droneSimulator: DroneSimulator;
    missileSimulator: MissileSimulator;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    missileBoosterResolver: MissileBoosterResolver;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
    this.droneSimulator = deps.droneSimulator;
    this.missileSimulator = deps.missileSimulator;
    this.engagementFrameComposer = deps.engagementFrameComposer;
    this.ewarResolver = deps.ewarResolver;
    this.missileBoosterResolver = deps.missileBoosterResolver;
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
        this.missileSimulator.reset(this.missileSimConfig());
        this.loop.reset();
        this.renderFrame();
      },
      onConfigChange: () => {
        this.simulation.update(this.controls.getConfig());
        this.droneSimulator.reset(this.droneSimConfig());
        this.missileSimulator.reset(this.missileSimConfig());
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
    this.missileSimulator.reset(this.missileSimConfig());
    this.renderFrame();
  }

  tick(dt: number): void {
    this.simulation.step(dt);
    const snapshot = this.simulation.snapshot();
    const input = this.engagementInput(snapshot);
    const view = this.engagementFrameComposer.compose(snapshot, input);
    this.droneSimulator.step(dt, view.frame);
    this.missileSimulator.step(dt, view.frame, this.missileLaunchSpecs(view));
    this.renderFrame();
  }

  private droneSimConfig(): DroneSimConfig {
    return {
      shipA: droneSpecsFrom(this.controls.getWeapons("shipA")),
      shipB: droneSpecsFrom(this.controls.getWeapons("shipB")),
    };
  }

  private missileSimConfig(): MissileSimConfig {
    return {
      shipA: missileSpecsFrom(this.controls.getWeapons("shipA")),
      shipB: missileSpecsFrom(this.controls.getWeapons("shipB")),
    };
  }

  private engagementInput(snapshot: ReturnType<Simulation["snapshot"]>): EngagementInput {
    return {
      weapons: { shipA: this.controls.getWeapons("shipA"), shipB: this.controls.getWeapons("shipB") },
      sigRadii: { shipA: this.controls.getSig("shipA"), shipB: this.controls.getSig("shipB") },
      droneStates: { shipA: this.droneSimulator.states("shipA"), shipB: this.droneSimulator.states("shipB") },
      missileFacts: { shipA: this.missileFactsFor("shipA"), shipB: this.missileFactsFor("shipB") },
    };
  }

  private missileFactsFor(side: Side): readonly import("../sim").MissileAttackFacts[] {
    const weapons = this.controls.getWeapons(side);
    const facts: import("../sim").MissileAttackFacts[] = [];
    let missileIndex = 0;
    for (const weapon of weapons) {
      if (weapon.kind === "missile") {
        facts.push(this.missileSimulator.facts(side, missileIndex));
        missileIndex++;
      }
    }
    return facts;
  }

  private missileLaunchSpecs(view: EngagementView): Record<Side, readonly MissileLaunchSpec[]> {
    return {
      shipA: this.buildLaunchSpecs("shipA", view),
      shipB: this.buildLaunchSpecs("shipB", view),
    };
  }

  private buildLaunchSpecs(side: Side, view: EngagementView): readonly MissileLaunchSpec[] {
    const weapons = this.controls.getWeapons(side);
    const shipState = side === "shipA" ? view.frame.shipA : view.frame.shipB;
    const opponentSig = side === "shipA" ? this.controls.getSig("shipB") : this.controls.getSig("shipA");
    const paintedSig = opponentSig * this.ewarResolver.sigMultiplier(shipState.ewar, view.frame.distance);
    const specs: MissileLaunchSpec[] = [];
    let missileIndex = 0;
    for (const weapon of weapons) {
      if (weapon.kind !== "missile") continue;
      const boosted = this.missileBoosterResolver.boostedMissile(weapon, shipState.missileBoosts);
      specs.push({ weaponIndex: missileIndex, boosted, paintedTargetSig: paintedSig });
      missileIndex++;
    }
    return specs;
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
    this.renderer.setDroneRangeVisibility(this.controls.getDroneRangeVisibility());
    this.renderer.setDroneControlRangeVisibility(this.controls.getDroneControlRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.draw(snapshot, view.frame, this.rendererWeaponRanges(view), this.controls.getOverlays(), this.droneRenderInfo());
    this.controls.update(view, effectiveReadouts);
  }

  private rendererWeaponRanges(view: EngagementView): WeaponRanges {
    return {
      shipA: this.weaponRangeForRenderer(view.effectiveWeapons.shipA, "shipA"),
      shipB: this.weaponRangeForRenderer(view.effectiveWeapons.shipB, "shipB"),
    };
  }

  private droneRenderInfo(): DroneRenderInfo {
    return {
      shipA: droneGroupRenderInfo(this.droneSimulator.states("shipA"), droneSpecsFrom(this.controls.getWeapons("shipA"))),
      shipB: droneGroupRenderInfo(this.droneSimulator.states("shipB"), droneSpecsFrom(this.controls.getWeapons("shipB"))),
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

function missileSpecsFrom(weapons: readonly WeaponSpec[]): readonly MissileSpec[] {
  return weapons.filter((w): w is MissileSpec => w.kind === "missile");
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
