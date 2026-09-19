import { Vec2 } from "./vec2";

/** A body orbiting a target on a phase slot: shared by drone and fighter squadrons. */
export interface OrbitBody {
  position: Vec2;
  velocity: Vec2;
  orbitPhase: number;
}

export const DEPLOY_RADIUS = 1000;
export const BODY_ACCEL_TAU = 1.0;
export const SEPARATION_RADIUS = 300;
export const SEPARATION_GAIN = 3.0;

export function deployBodies(bodies: OrbitBody[], anchor: Vec2): void {
  for (let i = 0; i < bodies.length; i++) {
    const angle = (i / bodies.length) * Math.PI * 2;
    bodies[i].position = anchor.add(new Vec2(Math.cos(angle) * DEPLOY_RADIUS, Math.sin(angle) * DEPLOY_RADIUS));
    bodies[i].velocity = new Vec2(0, 0);
  }
}

export function moveBodiesToward(bodies: OrbitBody[], destination: Vec2, maxSpeed: number, dt: number): boolean {
  let allArrived = true;
  for (const body of bodies) {
    const toDest = destination.sub(body.position);
    const dist = toDest.len();
    if (dist <= 1) { body.position = destination; body.velocity = new Vec2(0, 0); continue; }
    allArrived = false;
    const desired = toDest.norm().scale(maxSpeed);
    body.velocity = accelerateToward(body.velocity, desired, dt);
    const step = body.velocity.scale(dt);
    if (step.len() >= dist) { body.position = destination; body.velocity = new Vec2(0, 0); }
    else body.position = body.position.add(step);
  }
  return allArrived;
}

export function engageBodies(bodies: readonly OrbitBody[], targetPos: Vec2, orbitRange: number, orbitSpeed: number, maxVelocity: number, orbitAngle: number, dt: number): void {
  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const angle = body.orbitPhase + orbitAngle;
    const desiredPos = targetPos.add(new Vec2(Math.cos(angle) * orbitRange, Math.sin(angle) * orbitRange));
    const toDesired = desiredPos.sub(body.position);
    const dist = toDesired.len();
    if (dist <= 1) { body.position = desiredPos; continue; }
    const mwdFactor = Math.min(dist / orbitRange, 1);
    const speed = orbitSpeed + (maxVelocity - orbitSpeed) * mwdFactor;
    const desired = toDesired.norm().scale(speed);
    body.velocity = accelerateToward(body.velocity, desired, dt);
    const maxStep = speed * dt;
    const step = body.velocity.scale(dt);
    const capped = step.len() > maxStep ? step.norm().scale(maxStep) : step;
    if (capped.len() >= dist) body.position = desiredPos;
    else body.position = body.position.add(capped);
  }
}

export function applySeparation(bodies: OrbitBody[], dt: number): void {
  for (let i = 0; i < bodies.length; i++) {
    let separation = new Vec2(0, 0);
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const diff = bodies[i].position.sub(bodies[j].position);
      const dist = diff.len();
      if (dist > 0 && dist < SEPARATION_RADIUS) separation = separation.add(diff.norm().scale((SEPARATION_RADIUS - dist) / SEPARATION_RADIUS));
    }
    if (separation.len() > 0) {
      const correction = separation.scale(SEPARATION_GAIN * dt);
      bodies[i].position = bodies[i].position.add(correction);
    }
  }
}

export function accelerateToward(current: Vec2, desired: Vec2, dt: number): Vec2 {
  const factor = 1 - Math.exp(-dt / BODY_ACCEL_TAU);
  return desired.add(current.sub(desired).scale(1 - factor));
}

export function averageDistance(bodies: readonly OrbitBody[], target: Vec2): number {
  if (bodies.length === 0) return 0;
  let sum = 0;
  for (const body of bodies) sum += body.position.dist(target);
  return sum / bodies.length;
}
