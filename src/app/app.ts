import type { EngagementFrameComposer, EngagementView, EwarResolver, ShipState, Side, Simulation, TurretSpec, WeaponSpec } from "../sim";
import type { Controls, EffectiveReadouts, Loop, Renderer } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly ewarResolver: EwarResolver;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    engagementFrameComposer: EngagementFrameComposer;
    ewarResolver: EwarResolver;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
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
        this.loop.reset();
        this.renderFrame();
      },
      onConfigChange: () => {
        this.simulation.update(this.controls.getConfig());
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
    this.renderFrame();
  }

  tick(dt: number): void {
    this.simulation.step(dt);
    this.renderFrame();
  }

  private renderFrame(): void {
    const snapshot = this.simulation.snapshot();
    const input = {
      weapons: { shipA: this.controls.getTurret("shipA"), shipB: this.controls.getTurret("shipB") },
      sigRadii: { shipA: this.controls.getSig("shipA"), shipB: this.controls.getSig("shipB") },
    };
    const view = this.engagementFrameComposer.compose(snapshot, input);
    const effectiveReadouts: EffectiveReadouts = {
      shipA: this.sideReadoutValues(snapshot.shipA, snapshot.shipB, view, "shipA"),
      shipB: this.sideReadoutValues(snapshot.shipB, snapshot.shipA, view, "shipB"),
    };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setWeaponRangeVisibility(this.controls.getWeaponRangeVisibility());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.draw(snapshot, view.frame, this.rendererTurrets(view), this.controls.getOverlays());
    this.controls.update(view, effectiveReadouts);
  }

  private rendererTurrets(view: EngagementView): { shipA: TurretSpec; shipB: TurretSpec } {
    return {
      shipA: this.turretForRenderer(view.effectiveWeapons.shipA, "shipA"),
      shipB: this.turretForRenderer(view.effectiveWeapons.shipB, "shipB"),
    };
  }

  private turretForRenderer(weapon: WeaponSpec | undefined, side: Side): TurretSpec {
    if (weapon?.kind === "turret") return weapon;
    return this.controls.getTurret(side);
  }

  private sideReadoutValues(ship: ShipState, opponent: ShipState, view: EngagementView, side: Side): EffectiveReadouts["shipA"] {
    const attack = view.attacks[side];
    const effectiveWeapon = attack?.effectiveWeapon ?? view.effectiveWeapons[side];
    const boostedWeapon = attack?.boostedWeapon ?? effectiveWeapon;
    const disruption = this.ewarResolver.disruptionBreakdown(opponent.ewar, view.frame.distance);
    const effectiveTurret = effectiveWeapon?.kind === "turret" ? effectiveWeapon : this.controls.getTurret(side);
    const boostedTurret = boostedWeapon?.kind === "turret" ? boostedWeapon : effectiveTurret;
    return {
      speed: ship.maxSpeed,
      tracking: effectiveTurret.tracking,
      optimal: effectiveTurret.optimal,
      falloff: effectiveTurret.falloff,
      boostedTracking: boostedTurret.tracking,
      boostedOptimal: boostedTurret.optimal,
      boostedFalloff: boostedTurret.falloff,
      sigResolution: effectiveTurret.sigResolution,
      speedBreakdown: this.ewarResolver.speedBreakdown(opponent.ewar, view.frame.distance),
      trackingBreakdown: disruption,
      optimalBreakdown: disruption,
      falloffBreakdown: disruption,
    };
  }
}
