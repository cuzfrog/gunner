import { Vec2, damageVectorScale } from "../sim";
import type { DamageEvent, DefenseSimConfig, DefenseSimulator, DefenseView, DroneRuntimeState, DroneSimulator, DroneSimConfig, DroneSpec, EngagementFrameComposer, EngagementInput, EngagementView, EwarResolver, LockClock, LockState, MissileAttackFacts, MissileBoosterResolver, MissileLaunchSpec, MissileSimulator, MissileSimConfig, MissileSpec, SensorBoosterResolver, SensorSpec, ShipState, Side, Simulation, WeaponClock, WeaponSpec } from "../sim";
import type { Controls, DroneGroupRenderInfo, DroneRenderInfo, EffectiveReadouts, Loop, MissileRenderCollection, Renderer, WeaponRange, WeaponRanges } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly droneSimulator: DroneSimulator;
  private readonly missileSimulator: MissileSimulator;
  private readonly defenseSimulator: DefenseSimulator;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly missileBoosterResolver: MissileBoosterResolver;
  private readonly sensorBoosterResolver: SensorBoosterResolver;
  private readonly weaponClock: WeaponClock;
  private readonly lockClock: LockClock;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    droneSimulator: DroneSimulator;
    missileSimulator: MissileSimulator;
    defenseSimulator: DefenseSimulator;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    missileBoosterResolver: MissileBoosterResolver;
    sensorBoosterResolver: SensorBoosterResolver;
    weaponClock: WeaponClock;
    lockClock: LockClock;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
    this.droneSimulator = deps.droneSimulator;
    this.missileSimulator = deps.missileSimulator;
    this.defenseSimulator = deps.defenseSimulator;
    this.engagementFrameComposer = deps.engagementFrameComposer;
    this.ewarResolver = deps.ewarResolver;
    this.missileBoosterResolver = deps.missileBoosterResolver;
    this.sensorBoosterResolver = deps.sensorBoosterResolver;
    this.weaponClock = deps.weaponClock;
    this.lockClock = deps.lockClock;
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
        this.weaponClock.reset();
        this.lockClock.reset();
        this.defenseSimulator.reset(this.defenseSimConfig());
        this.loop.reset();
        this.initializeLocks();
        this.renderFrame();
      },
      onConfigChange: () => {
        this.simulation.update(this.controls.getConfig());
        this.droneSimulator.update(this.droneSimConfig());
        this.missileSimulator.update(this.missileSimConfig());
        this.defenseSimulator.update(this.defenseSimConfig());
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
    this.weaponClock.reset();
    this.lockClock.reset();
    this.defenseSimulator.reset(this.defenseSimConfig());
    this.initializeLocks();
    this.renderFrame();
  }

  tick(dt: number): void {
    this.simulation.step(dt);
    const snapshot = this.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    const locks = this.lockClock.step(dt, {
      distance,
      sensorA: this.effectiveSensorSpec(snapshot.shipA, snapshot.shipB, distance),
      sensorB: this.effectiveSensorSpec(snapshot.shipB, snapshot.shipA, distance),
      sigA: this.paintedSig(snapshot.shipB, snapshot.shipA, distance),
      sigB: this.paintedSig(snapshot.shipA, snapshot.shipB, distance),
    });
    const input = this.engagementInput(snapshot, locks);
    const view = this.engagementFrameComposer.compose(snapshot, input);
    this.droneSimulator.step(dt, view.frame);
    const missileEvents = this.missileSimulator.step(dt, view.frame, this.missileLaunchSpecs(view, locks));
    const weaponEvents = this.weaponClock.step(dt, view);
    const events: DamageEvent[] = [...missileEvents, ...weaponEvents];
    this.defenseSimulator.step(dt, events);
    const defenseView = this.defenseSimulator.view();
    if (defenseView.dead.shipA || defenseView.dead.shipB) {
      this.loop.stop();
      this.controls.setPlaying(false);
    }
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

  private defenseSimConfig(): DefenseSimConfig {
    return {
      shipA: this.controls.getDefense("shipA"),
      shipB: this.controls.getDefense("shipB"),
      damageEnabled: { shipA: this.controls.getDamageEnabled("shipA"), shipB: this.controls.getDamageEnabled("shipB") },
      repairMode: { shipA: this.controls.getRepairMode("shipA"), shipB: this.controls.getRepairMode("shipB") },
      repairerActivation: { shipA: this.controls.getRepairerActivation("shipA"), shipB: this.controls.getRepairerActivation("shipB") },
      rahActivation: { shipA: this.controls.getRahActivation("shipA"), shipB: this.controls.getRahActivation("shipB") },
    };
  }

  private engagementInput(snapshot: ReturnType<Simulation["snapshot"]>, locks: Record<Side, LockState>): EngagementInput {
    return {
      weapons: { shipA: this.controls.getWeapons("shipA"), shipB: this.controls.getWeapons("shipB") },
      sigRadii: { shipA: this.controls.getSig("shipA"), shipB: this.controls.getSig("shipB") },
      droneStates: { shipA: this.droneSimulator.states("shipA"), shipB: this.droneSimulator.states("shipB") },
      missileFacts: { shipA: this.missileFactsFor("shipA"), shipB: this.missileFactsFor("shipB") },
      defenses: { shipA: this.controls.getDefense("shipA"), shipB: this.controls.getDefense("shipB") },
      overloaded: { shipA: this.controls.getOverloaded("shipA"), shipB: this.controls.getOverloaded("shipB") },
      locks,
    };
  }

  private effectiveSensorSpec(ship: ShipState, opponent: ShipState, distance: number): SensorSpec | undefined {
    if (!ship.sensorSpec) return undefined;
    const boosted = this.sensorBoosterResolver.boostedSensorSpec(ship.sensorSpec, ship.sensorBoosts);
    return this.ewarResolver.dampenedSensorSpec(boosted, opponent.ewar, distance);
  }

  private paintedSig(ship: ShipState, opponent: ShipState, distance: number): number {
    const baseSig = opponent.sig ?? 1;
    return baseSig * this.ewarResolver.sigMultiplier(ship.ewar, distance);
  }

  private initializeLocks(): void {
    const snapshot = this.simulation.snapshot();
    const distance = snapshot.shipB.position.sub(snapshot.shipA.position).len();
    this.lockClock.step(0, {
      distance,
      sensorA: this.effectiveSensorSpec(snapshot.shipA, snapshot.shipB, distance),
      sensorB: this.effectiveSensorSpec(snapshot.shipB, snapshot.shipA, distance),
      sigA: this.paintedSig(snapshot.shipB, snapshot.shipA, distance),
      sigB: this.paintedSig(snapshot.shipA, snapshot.shipB, distance),
    });
  }

  private missileFactsFor(side: Side): readonly MissileAttackFacts[] {
    const weapons = this.controls.getWeapons(side);
    const facts: MissileAttackFacts[] = [];
    let missileIndex = 0;
    for (const weapon of weapons) {
      if (weapon.kind === "missile") {
        facts.push(this.missileSimulator.facts(side, missileIndex));
        missileIndex++;
      }
    }
    return facts;
  }

  private missileLaunchSpecs(view: EngagementView, locks: Record<Side, LockState>): Record<Side, readonly MissileLaunchSpec[]> {
    return {
      shipA: locks.shipA.status === "locked" ? this.buildLaunchSpecs("shipA", view) : [],
      shipB: locks.shipB.status === "locked" ? this.buildLaunchSpecs("shipB", view) : [],
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
      const baseVolleyByType = damageVectorScale(boosted.damagePerMissile, boosted.launcherCount);
      specs.push({ weaponIndex: missileIndex, boosted, paintedTargetSig: paintedSig, baseVolleyByType });
      missileIndex++;
    }
    return specs;
  }

  private renderFrame(): void {
    const snapshot = this.simulation.snapshot();
    const view = this.engagementFrameComposer.compose(snapshot, this.engagementInput(snapshot, this.lockClock.states()));
    const effectiveReadouts: EffectiveReadouts = {
      shipA: this.sideReadoutValues(snapshot.shipA, snapshot.shipB, view, "shipA"),
      shipB: this.sideReadoutValues(snapshot.shipB, snapshot.shipA, view, "shipB"),
    };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setWeaponRangeVisibility(this.controls.getWeaponRangeVisibility());
    this.renderer.setDroneRangeVisibility(this.controls.getDroneRangeVisibility());
    this.renderer.setDroneControlRangeVisibility(this.controls.getDroneControlRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.setLockStates(view.locks);
    this.renderer.draw(snapshot, view.frame, this.rendererWeaponRanges(view), this.controls.getOverlays(), this.droneRenderInfo(), this.missileRenderInfo(), this.defenseSimulator.view());
    this.controls.update(view, effectiveReadouts, this.defenseSimulator.view());
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

  private missileRenderInfo(): MissileRenderCollection {
    return {
      shipA: this.missileSimulator.states("shipA").map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail })),
      shipB: this.missileSimulator.states("shipB").map((m) => ({ position: m.position, velocity: m.velocity, trail: m.trail })),
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
