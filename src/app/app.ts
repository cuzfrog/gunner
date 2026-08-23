import type { EngagementEvaluator, Kinematics, Simulation } from "../sim";
import type { Controls, Loop, Renderer } from "../ui";

export interface App {
  start(): void;
  tick(dt: number): void;
}

export class AppImpl implements App {
  private readonly controls: Controls;
  private readonly simulation: Simulation;
  private readonly kinematics: Kinematics;
  private readonly engagementEvaluator: EngagementEvaluator;
  private readonly renderer: Renderer;
  private readonly loop: Loop;

  constructor(deps: {
    controls: Controls;
    simulation: Simulation;
    kinematics: Kinematics;
    engagementEvaluator: EngagementEvaluator;
    renderer: Renderer;
    loop: Loop;
  }) {
    this.controls = deps.controls;
    this.simulation = deps.simulation;
    this.kinematics = deps.kinematics;
    this.engagementEvaluator = deps.engagementEvaluator;
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
    const frame = this.kinematics.computeEngagement(snapshot.attacker, snapshot.target, snapshot.time);
    const turret = this.controls.getTurret();
    const assessment = this.engagementEvaluator.evaluate(snapshot, {
      attacker: { turret, targetSigRadius: this.controls.getTargetSig() },
    });
    const effectiveTurret = assessment.attacker ? assessment.attacker.effectiveTurret : turret;
    const hit = assessment.attacker ? assessment.attacker.hit : { chance: 0, trackingTerm: 0, rangeTerm: 0 };
    this.renderer.setGridBrightness(this.controls.getGridBrightness());
    this.renderer.draw(snapshot, frame, hit, effectiveTurret);
    this.controls.update(frame, hit);
  }
}
