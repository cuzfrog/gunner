import * as v from "../math/vec2.js";
import type { EngagementFrame, ShipState } from "./types.js";

export function computeEngagement(
  attacker: ShipState,
  target: ShipState,
  time: number,
): EngagementFrame {
  const relPosition = v.sub(target.position, attacker.position);
  const distance = v.len(relPosition);
  const relVelocity = v.sub(target.velocity, attacker.velocity);
  const rHat = distance > 0 ? v.scale(relPosition, 1 / distance) : v.vec(1, 0);

  const radialVelocity = v.dot(relVelocity, rHat);
  const transversalVelocity = v.sub(relVelocity, v.scale(rHat, radialVelocity));
  const transversalSpeed = v.len(transversalVelocity);
  const angularVelocity = distance > 0 ? transversalSpeed / distance : 0;

  return {
    time,
    attacker,
    target,
    relPosition,
    distance,
    relVelocity,
    radialVelocity,
    transversalVelocity,
    transversalSpeed,
    angularVelocity,
  };
}
