import type { Rng, RngFactory } from "./rng";
import { type HitRollStrategy, sampledHitRoll } from "./hitRoll";
import type { Restorable } from "./restorable";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { DamageEvent, Side, WeaponKind } from "./types";
import { damageVectorScale, damageVectorSum } from "./types";

export interface WeaponCooldownSnapshot {
  readonly timer: number;
  readonly cycleTime: number;
  readonly spoolCycles: number;
}

export interface SideClockSnapshot {
  readonly cooldowns: ReadonlyMap<number, WeaponCooldownSnapshot>;
  readonly weaponSignature: string;
}

export interface WeaponClockState {
  readonly seed: number;
  readonly sides: Record<Side, SideClockSnapshot>;
}

export interface WeaponClock extends Restorable<WeaponClockState> {
  reset(): void;
  step(dt: number, view: EngagementView): readonly DamageEvent[];
  spoolCycles(side: Side, weaponIndex: number): number;
}

interface WeaponCooldown {
  timer: number;
  cycleTime: number;
  spoolCycles: number;
}

interface SideClock {
  cooldowns: Map<number, WeaponCooldown>;
  weaponSignature: string;
  rng: Rng;
}

export class WeaponClockImpl implements WeaponClock {
  private readonly rngFactory: RngFactory;
  private readonly hitRoll: HitRollStrategy;
  private sides: Record<Side, SideClock>;
  private seed: number;

  constructor({ rngFactory, hitRoll = sampledHitRoll }: { rngFactory: RngFactory; hitRoll?: HitRollStrategy }) {
    this.rngFactory = rngFactory;
    this.hitRoll = hitRoll;
    this.seed = 0;
    this.sides = { shipA: emptySide(() => this.rngFactory.create(this.seed)), shipB: emptySide(() => this.rngFactory.create(this.seed + 1)) };
  }

  reset(): void {
    this.seed += 2;
    this.sides = {
      shipA: emptySide(() => this.rngFactory.create(this.seed)),
      shipB: emptySide(() => this.rngFactory.create(this.seed + 1)),
    };
  }

  spoolCycles(side: Side, weaponIndex: number): number {
    return this.sides[side].cooldowns.get(weaponIndex)?.spoolCycles ?? 0;
  }

  capture(): WeaponClockState {
    return { seed: this.seed, sides: { shipA: snapshotClock(this.sides.shipA), shipB: snapshotClock(this.sides.shipB) } };
  }

  restore(state: WeaponClockState): void {
    this.seed = state.seed;
    this.sides = {
      shipA: materializeClock(state.sides.shipA, () => this.rngFactory.create(this.seed)),
      shipB: materializeClock(state.sides.shipB, () => this.rngFactory.create(this.seed + 1)),
    };
  }

  step(dt: number, view: EngagementView): readonly DamageEvent[] {
    const events: DamageEvent[] = [];
    if (view.locks.shipA.status === "locked") {
      const shipAEvents = this.stepSide("shipA", dt, view.weaponAttacks.shipA, "shipB");
      for (const event of shipAEvents) events.push(event);
    } else {
      this.clearCooldowns("shipA", view.weaponAttacks.shipA);
    }
    if (view.locks.shipB.status === "locked") {
      const shipBEvents = this.stepSide("shipB", dt, view.weaponAttacks.shipB, "shipA");
      for (const event of shipBEvents) events.push(event);
    } else {
      this.clearCooldowns("shipB", view.weaponAttacks.shipB);
    }
    return events;
  }

  private clearCooldowns(source: Side, attacks: readonly WeaponAttack[]): void {
    const clock = this.sides[source];
    clock.cooldowns.clear();
    clock.weaponSignature = weaponSignature(attacks);
  }

  private stepSide(source: Side, dt: number, attacks: readonly WeaponAttack[], target: Side): readonly DamageEvent[] {
    const events: DamageEvent[] = [];
    const clock = this.sides[source];
    const signature = weaponSignature(attacks);
    if (signature !== clock.weaponSignature) {
      clock.cooldowns.clear();
      clock.weaponSignature = signature;
    }
    for (let i = 0; i < attacks.length; i++) {
      const attack = attacks[i];
      const kind = attack.weapon.kind;
      if (kind === "missile") continue;
      const breakdown = attack.assessment.turret ?? attack.assessment.drone;
      if (!breakdown) continue;
      if (attack.assessment.drone && !attack.assessment.drone.inRange) continue;
      const cycleTime = attack.weapon.cycleTime;
      if (cycleTime <= 0) continue;
      const spoolSpec = attack.weapon.kind === "turret" ? attack.weapon.spool : undefined;
      if (spoolSpec !== undefined && attack.assessment.turret && !attack.assessment.turret.inOptimal) {
        // A disintegrator deactivates while its target is beyond optimal; reactivation restarts cycle and spool.
        clock.cooldowns.delete(i);
        continue;
      }
      const cooldown = clock.cooldowns.get(i) ?? { timer: cycleTime, cycleTime, spoolCycles: 0 };
      cooldown.timer -= dt;
      if (cooldown.timer <= 0) {
        cooldown.timer += cycleTime;
        if (cooldown.timer < 0) cooldown.timer = cycleTime;
        const event = this.rollEvent(source, target, i, kind, attack, breakdown.hit.chance, breakdown.expectedMultiplier, clock.rng);
        if (event) events.push(event);
        if (spoolSpec !== undefined) cooldown.spoolCycles += 1;
      }
      clock.cooldowns.set(i, cooldown);
    }
    return events;
  }

  private rollEvent(source: Side, target: Side, weaponIndex: number, kind: WeaponKind, attack: WeaponAttack, hitChance: number, expectedMultiplier: number, rng: Rng): DamageEvent | undefined {
    // The assessment damage is already spool-inclusive (fireControl scales it via spoolMultiplier),
    // so events only carry the hit-quality roll on top of it.
    const appliedVolley = attack.assessment.damage.appliedVolleyByType;
    if (damageVectorSum(appliedVolley) <= 0) return undefined;
    const hitMultiplier = this.hitRoll(rng, hitChance, expectedMultiplier);
    if (hitMultiplier <= 0) return undefined;
    const scale = expectedMultiplier > 0 ? hitMultiplier / expectedMultiplier : 0;
    const rawByType = damageVectorScale(appliedVolley, scale);
    if (damageVectorSum(rawByType) <= 0) return undefined;
    return { target, source, weaponIndex, kind, rawByType };
  }
}

function emptySide(createRng: () => Rng): SideClock {
  return { cooldowns: new Map(), weaponSignature: "", rng: createRng() };
}

function snapshotClock(clock: SideClock): SideClockSnapshot {
  const cooldowns = [...clock.cooldowns].map(
    ([index, cooldown]) => [index, { timer: cooldown.timer, cycleTime: cooldown.cycleTime, spoolCycles: cooldown.spoolCycles }] as const,
  );
  return { cooldowns: new Map(cooldowns), weaponSignature: clock.weaponSignature };
}

function materializeClock(snapshot: SideClockSnapshot, createRng: () => Rng): SideClock {
  const cooldowns = [...snapshot.cooldowns].map(
    ([index, cooldown]) => [index, { timer: cooldown.timer, cycleTime: cooldown.cycleTime, spoolCycles: cooldown.spoolCycles }] as const,
  );
  return { cooldowns: new Map(cooldowns), weaponSignature: snapshot.weaponSignature, rng: createRng() };
}

function weaponSignature(attacks: readonly WeaponAttack[]): string {
  let sig = "";
  for (const attack of attacks) {
    const w = attack.weapon;
    const spool = w.kind === "turret" && w.spool ? `${w.spool.perCycle}:${w.spool.max}` : "";
    sig += w.kind + ":" + w.cycleTime + (spool ? ":" + spool : "") + ";";
  }
  return sig;
}
