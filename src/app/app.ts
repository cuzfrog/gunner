import type { EngagementFrameComposer, Simulation } from "../sim";
import type { Controls, EffectiveReadouts, Loop, Renderer } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly engagementFrameComposer: EngagementFrameComposer;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    engagementFrameComposer: EngagementFrameComposer;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
    this.engagementFrameComposer = deps.engagementFrameComposer;
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
    const turret = this.controls.getTurret();
    const targetSigRadius = this.controls.getTargetSig();
    const view = this.engagementFrameComposer.compose(snapshot, { turret, targetSigRadius });
    const boostedTurret = view.assessment?.boostedTurret ?? view.effectiveTurret;
    const effectiveReadouts: EffectiveReadouts = {
      attackerSpeed: snapshot.attacker.maxSpeed,
      targetSpeed: snapshot.target.maxSpeed,
      tracking: view.effectiveTurret.tracking,
      optimal: view.effectiveTurret.optimal,
      falloff: view.effectiveTurret.falloff,
      boostedTracking: boostedTurret.tracking,
      boostedOptimal: boostedTurret.optimal,
      boostedFalloff: boostedTurret.falloff,
    };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.setRangeRingsEnabled(this.controls.hasAttackerGuns());
    this.renderer.setManualZoom(this.controls.getAutoZoom(), this.controls.getZoomFactor());
    this.renderer.draw(snapshot, view.frame, view.hit, view.effectiveTurret, this.controls.getOverlays());
    this.controls.update(view.frame, view.hit, effectiveReadouts);
  }
}
