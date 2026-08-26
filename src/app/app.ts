import type { EngagementFrameComposer, EngagementView, EwarResolver, ShipState, Side, Simulation } from "../sim";
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
      turrets: { shipA: this.controls.getTurret("shipA"), shipB: this.controls.getTurret("shipB") },
      sigRadii: { shipA: this.controls.getSig("shipA"), shipB: this.controls.getSig("shipB") },
    };
    const view = this.engagementFrameComposer.compose(snapshot, input);
    const effectiveReadouts: EffectiveReadouts = {
      shipA: this.sideReadoutValues(snapshot.shipA, snapshot.shipB, view, "shipA"),
      shipB: this.sideReadoutValues(snapshot.shipB, snapshot.shipA, view, "shipB"),
    };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setRangeRingsEnabled(this.controls.hasGuns("shipA"));
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.draw(snapshot, view.frame, view.hits.shipA, view.effectiveTurrets.shipA, this.controls.getOverlays());
    this.controls.update(view, effectiveReadouts);
  }

  private sideReadoutValues(ship: ShipState, opponent: ShipState, view: EngagementView, side: Side): EffectiveReadouts["shipA"] {
    const attack = view.attacks[side];
    const effectiveTurret = attack?.effectiveTurret ?? view.effectiveTurrets[side];
    const boostedTurret = attack?.boostedTurret ?? effectiveTurret;
    const disruption = this.ewarResolver.disruptionBreakdown(opponent.ewar, view.frame.distance);
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
