import type { Rng, RngFactory } from "./rng";
import { rollHit } from "./hitRoll";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { DamageEvent, Side, WeaponKind } from "./types";
import { damageVectorScale, damageVectorSum } from "./types";

export interface WeaponClock {
  reset(): void;
  step(dt: number, view: EngagementView): readonly DamageEvent[];
}

interface WeaponCooldown {
  timer: number;
  cycleTime: number;
}

interface SideClock {
  cooldowns: Map<number, WeaponCooldown>;
  weaponSignature: string;
  rng: Rng;
}

export class WeaponClockImpl implements WeaponClock {
  private readonly rngFactory: RngFactory;
  private sides: Record<Side, SideClock>;
  private seed: number;

  constructor({ rngFactory }: { rngFactory: RngFactory }) {
    this.rngFactory = rngFactory;
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
    const signature = weaponSignature(attacks);
    if (signature !== clock.weaponSignature) {
      clock.cooldowns.clear();
      clock.weaponSignature = signature;
    }
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
      const cooldown = clock.cooldowns.get(i) ?? { timer: cycleTime, cycleTime };
      cooldown.timer -= dt;
      if (cooldown.timer <= 0) {
        cooldown.timer += cycleTime;
        if (cooldown.timer < 0) cooldown.timer = cycleTime;
        const event = this.rollEvent(source, target, i, kind, attack, breakdown.hit.chance, breakdown.expectedMultiplier, clock.rng);
        if (event) events.push(event);
      }
      clock.cooldowns.set(i, cooldown);
    }
    return events;
  }

  private rollEvent(source: Side, target: Side, weaponIndex: number, kind: WeaponKind, attack: WeaponAttack, hitChance: number, expectedMultiplier: number, rng: Rng): DamageEvent | undefined {
    const appliedVolley = attack.assessment.damage.appliedVolleyByType;
    if (damageVectorSum(appliedVolley) <= 0) return undefined;
    const hitMultiplier = rollHit(rng, hitChance);
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

function weaponSignature(attacks: readonly WeaponAttack[]): string {
  let sig = "";
  for (const attack of attacks) {
    const w = attack.weapon;
    sig += w.kind + ":" + w.cycleTime + ";";
  }
  return sig;
}
