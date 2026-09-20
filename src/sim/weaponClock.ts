import type { Rng, RngFactory } from "./rng";
import { type HitRollStrategy, sampledHitRoll } from "./hitRoll";
import type { CapacitorGate } from "./capacitorSimulator";
import type { Restorable } from "./restorable";
import type { EngagementView, WeaponAttack } from "./engagementFrameComposer";
import type { DamageEvent, Side, VortonSpec, WeaponKind, WeaponSpec } from "./types";
import { MODULE_HEAT_HITPOINTS } from "./types";
import { damageVectorScale, damageVectorSum } from "./types";

export interface WeaponCooldownSnapshot {
  readonly timer: number;
  readonly cycleTime: number;
  readonly spoolCycles: number;
  readonly identity: string;
  readonly magazine?: WeaponMagazineState;
}

export interface SideClockSnapshot {
  readonly cooldowns: ReadonlyMap<number, WeaponCooldownSnapshot>;
  readonly heat: ReadonlyMap<string, number>; // heatIdentity -> remaining module-group HP (MODULE_HEAT_HITPOINTS * count)
}

export interface WeaponClockState {
  readonly seed: number;
  readonly sides: Record<Side, SideClockSnapshot>;
}

export interface WeaponClock extends Restorable<WeaponClockState> {
  reset(): void;
  step(dt: number, view: EngagementView, capacitor?: CapacitorGate, overloaded?: Record<Side, boolean>): readonly DamageEvent[];
  spoolCycles(side: Side, weaponIndex: number): number;
}

interface WeaponMagazineState {
  readonly numShots: number;
  readonly refuelSeconds: number;
  readonly shotsLeft: number;
}

/** Normalized heat fields of a heat-capable weapon group (turret or vorton). */
interface WeaponHeatState {
  readonly identity: string;
  readonly damagePerCycle: number;
  readonly count: number;
}

interface WeaponCooldown {
  timer: number;
  cycleTime: number;
  spoolCycles: number;
  identity: string;
  magazine?: WeaponMagazineState;
}

interface SideClock {
  cooldowns: Map<number, WeaponCooldown>;
  heat: Map<string, number>;
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

  step(dt: number, view: EngagementView, capacitor?: CapacitorGate, overloaded: Record<Side, boolean> = { shipA: false, shipB: false }): readonly DamageEvent[] {
    const events: DamageEvent[] = [];
    if (view.locks.shipA.status === "locked") {
      const shipAEvents = this.stepSide("shipA", dt, view.weaponAttacks.shipA, "shipB", capacitor, overloaded.shipA);
      for (const event of shipAEvents) events.push(event);
    } else {
      // Disengaged: weapons stop cycling entirely, matching the capacitor gate that only drains weapon capacitors while engaged.
      this.sides["shipA"].cooldowns.clear();
    }
    if (view.locks.shipB.status === "locked") {
      const shipBEvents = this.stepSide("shipB", dt, view.weaponAttacks.shipB, "shipA", capacitor, overloaded.shipB);
      for (const event of shipBEvents) events.push(event);
    } else {
      this.sides["shipB"].cooldowns.clear();
    }
    return events;
  }

  private stepSide(source: Side, dt: number, attacks: readonly WeaponAttack[], target: Side, capacitor: CapacitorGate | undefined, overloaded: boolean): readonly DamageEvent[] {
    const events: DamageEvent[] = [];
    const clock = this.sides[source];
    for (let i = 0; i < attacks.length; i++) {
      const attack = attacks[i];
      const kind = attack.weapon.kind;
      if (kind === "missile") continue;
      const heatState = heatStateOf(attack.weapon);
      if (heatState && burnedOut(clock.heat, heatState)) continue;
      const identity = weaponIdentity(attack.weapon);
      const existing = clock.cooldowns.get(i);
      if (existing && existing.identity !== identity) {
        // The weapon at this slot changed (ammo swap, reorder, refit): restart only its cycle and spool.
        clock.cooldowns.delete(i);
      }
      const breakdown = attack.assessment.turret ?? attack.assessment.drone ?? attack.assessment.fighter ?? attack.assessment.vorton;
      if (!breakdown) continue;
      if (attack.assessment.drone && !attack.assessment.drone.inRange) continue;
      const cycleTime = attack.weapon.cycleTime;
      if (cycleTime <= 0) continue;
      const spoolSpec = attack.weapon.kind === "turret" ? attack.weapon.spool : undefined;
      if (spoolSpec !== undefined && attack.assessment.turret && !attack.assessment.turret.inOptimal) {
        // A disintegrator deactivates while its target is beyond optimal; reactivation restarts cycle and spool.
        // Deactivation is checked BEFORE the activation debit: a weapon about to deactivate never pays an activation,
        // otherwise an out-of-optimal spooling turret with a capacitor need would re-activate (and re-debit) every frame.
        clock.cooldowns.delete(i);
        continue;
      }
      const capNeed = weaponCapacitorNeed(attack.weapon);
      const isNew = !clock.cooldowns.has(i);
      if (capacitor && capNeed > 0 && isNew && !capacitor.attemptDebit(source, capNeed, attack.weapon.moduleId)) {
        // Activation denied: no cooldown entry, the debit is retried next frame.
        continue;
      }
      const cooldown = clock.cooldowns.get(i) ?? { timer: cycleTime, cycleTime, spoolCycles: 0, identity, magazine: fighterMagazineState(attack.weapon) };
      cooldown.timer -= dt;
      if (cooldown.timer <= 0) {
        if (capacitor && capNeed > 0 && !capacitor.attemptDebit(source, capNeed, attack.weapon.moduleId)) {
          // Starved mid-cycle: the module stays off until the capacitor recovers.
          cooldown.timer = 0;
          clock.cooldowns.set(i, cooldown);
          continue;
        }
        if (kind === "fighter") {
          // Fighters apply through missile math: no hit-quality roll, deterministic volley.
          const event = this.deterministicEvent(source, target, i, "fighter", attack);
          if (event) events.push(event);
          advanceFighterCycle(cooldown, attack.weapon);
        } else {
          cooldown.timer += cycleTime;
          if (cooldown.timer < 0) cooldown.timer = cycleTime;
          if (kind === "vorton") {
            // Vortons apply through missile math like fighters: deterministic volley, no hit roll, no spool.
            const event = this.deterministicEvent(source, target, i, "vorton", attack);
            if (event) events.push(event);
          } else {
            const rolled = attack.assessment.turret ?? attack.assessment.drone;
            if (!rolled) continue;
            const event = this.rollEvent(source, target, i, kind, attack, rolled.hit.chance, rolled.expectedMultiplier, clock.rng);
            if (event) events.push(event);
            if (spoolSpec !== undefined) cooldown.spoolCycles += 1;
          }
          if (heatState && overloaded) applyHeat(clock.heat, heatState);
        }
      }
      clock.cooldowns.set(i, cooldown);
    }
    return events;
  }

  private deterministicEvent(source: Side, target: Side, weaponIndex: number, kind: WeaponKind, attack: WeaponAttack): DamageEvent | undefined {
    const appliedVolley = attack.assessment.damage.appliedVolleyByType;
    if (damageVectorSum(appliedVolley) <= 0) return undefined;
    return { target, source, weaponIndex, kind, rawByType: appliedVolley, ...(attack.assessment.unitTarget ? { unitTarget: attack.assessment.unitTarget } : {}) };
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
    return { target, source, weaponIndex, kind, rawByType, ...(attack.assessment.unitTarget ? { unitTarget: attack.assessment.unitTarget } : {}) };
  }
}

function emptySide(createRng: () => Rng): SideClock {
  return { cooldowns: new Map(), heat: new Map(), rng: createRng() };
}

/** Turret and vorton groups carry the heat fields; the identity embeds the count so a refit restores a fresh pool. */
function heatStateOf(weapon: WeaponSpec): WeaponHeatState | undefined {
  if (weapon.kind === "turret") return weapon.heatDamagePerCycle === undefined ? undefined : { identity: `${weapon.moduleId}:${weapon.turretCount}`, damagePerCycle: weapon.heatDamagePerCycle, count: weapon.turretCount };
  if (weapon.kind === "vorton") return vortonHeatState(weapon);
  return undefined;
}

function vortonHeatState(weapon: VortonSpec): WeaponHeatState | undefined {
  return weapon.heatDamagePerCycle === undefined ? undefined : { identity: `${weapon.moduleId}:${weapon.count}`, damagePerCycle: weapon.heatDamagePerCycle, count: weapon.count };
}

/** A weapon group is burned out once its heat pool reaches zero; the pool starts at MODULE_HEAT_HITPOINTS per module. */
function burnedOut(heat: Map<string, number>, state: WeaponHeatState): boolean {
  return (heat.get(state.identity) ?? MODULE_HEAT_HITPOINTS * state.count) <= 0;
}

function applyHeat(heat: Map<string, number>, state: WeaponHeatState): void {
  const current = heat.get(state.identity) ?? MODULE_HEAT_HITPOINTS * state.count;
  heat.set(state.identity, current - state.damagePerCycle * state.count);
}

function fighterMagazineState(weapon: WeaponSpec): WeaponMagazineState | undefined {
  if (weapon.kind !== "fighter" || weapon.magazine === undefined) return undefined;
  return { numShots: weapon.magazine.numShots, refuelSeconds: weapon.magazine.refuelingTime + weapon.magazine.numShots * weapon.magazine.rearmTime, shotsLeft: weapon.magazine.numShots };
}

function advanceFighterCycle(cooldown: WeaponCooldown, weapon: WeaponSpec): void {
  const magazine = cooldown.magazine;
  if (weapon.kind !== "fighter" || magazine === undefined) {
    cooldown.timer += cooldown.cycleTime;
    if (cooldown.timer < 0) cooldown.timer = cooldown.cycleTime;
    return;
  }
  const shotsLeft = magazine.shotsLeft - 1;
  if (shotsLeft > 0) {
    cooldown.timer += cooldown.cycleTime;
    if (cooldown.timer < 0) cooldown.timer = cooldown.cycleTime;
    cooldown.magazine = { ...magazine, shotsLeft };
    return;
  }
  // Magazine exhausted: the squadron refuels and rearms, then the next attack run needs a full cycle.
  cooldown.timer += magazine.refuelSeconds + cooldown.cycleTime;
  if (cooldown.timer < 0) cooldown.timer = cooldown.cycleTime;
  cooldown.magazine = { ...magazine, shotsLeft: magazine.numShots };
}

function snapshotClock(clock: SideClock): SideClockSnapshot {
  const cooldowns = [...clock.cooldowns].map(
    ([index, cooldown]) => [index, { timer: cooldown.timer, cycleTime: cooldown.cycleTime, spoolCycles: cooldown.spoolCycles, identity: cooldown.identity, ...(cooldown.magazine ? { magazine: { ...cooldown.magazine } } : {}) }] as const,
  );
  return { cooldowns: new Map(cooldowns), heat: new Map(clock.heat) };
}

function materializeClock(snapshot: SideClockSnapshot, createRng: () => Rng): SideClock {
  const cooldowns = [...snapshot.cooldowns].map(
    ([index, cooldown]) => [index, { timer: cooldown.timer, cycleTime: cooldown.cycleTime, spoolCycles: cooldown.spoolCycles, identity: cooldown.identity, ...(cooldown.magazine ? { magazine: { ...cooldown.magazine } } : {}) }] as const,
  );
  return { cooldowns: new Map(cooldowns), heat: new Map(snapshot.heat), rng: createRng() };
}

function weaponIdentity(weapon: WeaponSpec): string {
  const spool = weapon.kind === "turret" && weapon.spool ? `${weapon.spool.perCycle}:${weapon.spool.max}` : "";
  return weapon.kind + ":" + weapon.moduleId + ":" + weapon.cycleTime + (spool ? ":" + spool : "");
}

function weaponCapacitorNeed(weapon: WeaponSpec): number {
  if (weapon.kind === "turret") return weapon.capacitorNeed !== undefined ? weapon.capacitorNeed * weapon.turretCount : 0;
  if (weapon.kind === "vorton") return weapon.capacitorNeed !== undefined ? weapon.capacitorNeed * weapon.count : 0;
  return 0;
}
