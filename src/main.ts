import { Simulation } from "./sim/simulation.js";
import { computeEngagement } from "./sim/kinematics.js";
import { computeHitChance } from "./sim/hitChance.js";
import { Controls } from "./ui/controls.js";
import { Renderer } from "./ui/renderer.js";
import { Loop } from "./ui/loop.js";

function main() {
  const canvas = document.getElementById("scene") as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Canvas element not found");

  const controls = new Controls();
  const turret = controls.getTurret();
  const targetSig = controls.getTargetSig();
  const sim = new Simulation(controls.getConfig());

  const renderer = new Renderer(canvas);

  const update = () => {
    const snapshot = sim.snapshot();
    const frame = computeEngagement(snapshot.attacker, snapshot.target, snapshot.time);
    const turretNow = controls.getTurret();
    const hit = computeHitChance(frame, turretNow, controls.getTargetSig());
    renderer.draw(snapshot, frame, hit, turretNow);
    controls.update(frame, hit);
  };

  const loop = new Loop((dt) => {
    sim.step(dt);
    update();
  });

  loop.setSpeed(controls.getSpeed());

  controls.setCallbacks({
    onReset: () => {
      sim.reset(controls.getConfig());
      loop.reset();
      update();
    },
    onPlayPause: () => {
      loop.toggle();
      controls.setPlaying(loop.isRunning());
    },
    onSpeedChange: (speed) => {
      loop.setSpeed(speed);
    },
  });

  update();
}

main();
