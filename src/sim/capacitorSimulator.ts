import type { TypeId } from "../gamedata/ids";
import type { CapBoosterMode, CapBoosterSimSpec, CapacitorPropulsionDrain, CapacitorSideConfig, CapacitorSpec, IncomingDrain, ScheduledDrain, Side, SimConfig } from "./types";
import type { Restorable } from "./restorable";

export interface CapacitorDrainState {
  readonly moduleId: ScheduledDrain["moduleId"];
  readonly amount: number;
  readonly interval: number;
  readonly active: boolean;
  readonly running: boolean;
  readonly starved: boolean;
  readonly timer: number;
}

export interface IncomingDrainState {
  readonly moduleId: TypeId;
  readonly amount: number;
  readonly interval: number;
  readonly transfer: boolean;
  readonly count: number;
  readonly timer: number;
  readonly running: boolean;
}

export interface CapacitorBoosterState {
  readonly moduleId: CapBoosterSimSpec["moduleId"];
  readonly amount: number;
  readonly cycleTime: number;
  readonly clipSize: number;
  readonly reloadTime: number;
  readonly mode: CapBoosterMode;
  readonly charges: number;
  readonly cycleTimer: number;
  readonly reloading: boolean;
  readonly reloadTimer: number;
}

export interface CapacitorPropulsionState {
  readonly moduleId: TypeId;
  readonly amount: number;
  readonly interval: number;
  readonly timer: number;
  readonly running: boolean;
  readonly starved: boolean;
}

export interface CapacitorPropulsionView {
  readonly moduleId: TypeId;
  readonly running: boolean;
  readonly starved: boolean;
}

export interface CapacitorView {
  readonly cap: number;
  readonly capacity: number;
  readonly percentage: number;
  readonly regenPerSecond: number;
  readonly netPerSecond: number;
  readonly incomingDrainPerSecond: number;
  readonly starved: boolean;
  // Module ids denied a debit during the current engine frame (weapons, repairers, drains).
  readonly starvedModuleIds: readonly TypeId[];
  readonly drains: readonly CapacitorDrainState[];
  // Projected cap-warfare debits from the opponent (neutralizers/nosferatu), keyed by module id.
  readonly incoming: readonly IncomingDrainState[];
  readonly boosters: readonly CapacitorBoosterState[];
  /** Live propulsion drain state, for usage-row attribution in the popup. Absent = no propulsion module configured. */
  readonly propulsion: CapacitorPropulsionView | undefined;
}

export interface CapacitorGate {
  attemptDebit(side: Side, amount: number, moduleId?: TypeId): boolean;
}

export interface CapacitorSimConfig {
  readonly sim: SimConfig;
  readonly sides: Record<Side, CapacitorSideConfig>;
}

export interface SideCapacitorSnapshot {
  readonly spec: CapacitorSpec | undefined;
  readonly infinite: boolean;
  readonly cap: number;
  readonly drains: readonly CapacitorDrainState[];
  readonly incoming: readonly IncomingDrainState[];
  readonly boosters: readonly CapacitorBoosterState[];
  readonly propulsion: CapacitorPropulsionState | undefined;
}

export interface CapacitorSimulatorState {
  readonly time: number;
  readonly sides: Record<Side, SideCapacitorSnapshot>;
}

export interface CapacitorSimulator extends CapacitorGate, Restorable<CapacitorSimulatorState> {
  reset(config: CapacitorSimConfig): void;
  update(config: CapacitorSimConfig): void;
  step(dt: number, propulsionSuppressed: Record<Side, boolean>): void;
  view(): Record<Side, CapacitorView>;
  propulsionStarved(side: Side): boolean;
  injectBooster(side: Side, boosterIndex: number): void;
  /** Merges the engine's projected cap-warfare debits for one side (timer-preserving by module id). */
  incomingDrains(side: Side, drains: readonly IncomingDrain[]): void;
  /** Per-frame input: deterministic drain rate of gate-initiated debits managed outside this simulator (weapon and repairer cycles). */
  setExternalDrainPerSecond(rates: Record<Side, number>): void;
}

interface DrainRuntime {
  moduleId: ScheduledDrain["moduleId"];
  amount: number;
  interval: number;
  active: boolean;
  running: boolean;
  starved: boolean;
  timer: number;
}

interface BoosterRuntime {
  moduleId: CapBoosterSimSpec["moduleId"];
  amount: number;
  cycleTime: number;
  clipSize: number;
  reloadTime: number;
  mode: CapBoosterMode;
  charges: number;
  cycleTimer: number;
  reloading: boolean;
  reloadTimer: number;
}

interface PropulsionRuntime {
  moduleId: TypeId;
  amount: number;
  interval: number;
  timer: number;
  running: boolean;
  starved: boolean;
}

interface IncomingRuntime {
  moduleId: IncomingDrain["moduleId"];
  amount: number;
  interval: number;
  transfer: boolean;
  count: number;
  timer: number;
  running: boolean;
}

interface SideRuntime {
  spec: CapacitorSpec | undefined;
  infinite: boolean;
  cap: number;
  drains: DrainRuntime[];
  incoming: IncomingRuntime[];
  boosters: BoosterRuntime[];
  propulsion: PropulsionRuntime | undefined;
  propulsionSuppressed: boolean;
  anyStarved: boolean;
  starvedModuleIds: TypeId[];
  externalDrainPerSecond: number;
}

const TAU_DENOMINATOR = 5; // EVE recharge tau = rechargeTime / 5
const CAPACITY_EPSILON_FACTOR = 1e-9;

export class CapacitorSimulatorImpl implements CapacitorSimulator {
  private sides: Record<Side, SideRuntime>;
  private time: number;

  constructor() {
    this.time = 0;
    this.sides = { shipA: emptySide(), shipB: emptySide() };
  }

  reset(config: CapacitorSimConfig): void {
    this.time = 0;
    this.sides = {
      shipA: sideFromConfig(config.sim.shipA.capacitor, config.sim.shipA.propulsionCapacityMultiplier, config.sides.shipA),
      shipB: sideFromConfig(config.sim.shipB.capacitor, config.sim.shipB.propulsionCapacityMultiplier, config.sides.shipB),
    };
  }

  update(config: CapacitorSimConfig): void {
    mergeSide(this.sides.shipA, config.sim.shipA.capacitor, config.sim.shipA.propulsionCapacityMultiplier, config.sides.shipA);
    mergeSide(this.sides.shipB, config.sim.shipB.capacitor, config.sim.shipB.propulsionCapacityMultiplier, config.sides.shipB);
  }

  step(dt: number, propulsionSuppressed: Record<Side, boolean>): void {
    if (dt <= 0) return;
    this.time += dt;
    stepSide(this.sides, "shipA", dt, propulsionSuppressed.shipA);
    stepSide(this.sides, "shipB", dt, propulsionSuppressed.shipB);
  }

  attemptDebit(side: Side, amount: number, moduleId?: TypeId): boolean {
    const runtime = this.sides[side];
    if (!hasPool(runtime)) return true;
    if (runtime.cap + capacityEpsilon(runtime.spec) >= amount) {
      runtime.cap -= amount;
      return true;
    }
    runtime.anyStarved = true;
    if (moduleId !== undefined && !runtime.starvedModuleIds.includes(moduleId)) runtime.starvedModuleIds.push(moduleId);
    return false;
  }

  propulsionStarved(side: Side): boolean {
    return this.sides[side].propulsion?.starved ?? false;
  }

  injectBooster(side: Side, boosterIndex: number): void {
    const runtime = this.sides[side];
    if (!hasPool(runtime)) return;
    const booster = runtime.boosters[boosterIndex];
    if (!booster || booster.mode !== "manual" || booster.reloading || booster.charges <= 0 || booster.cycleTimer > 0) return;
    injectCharge(runtime, booster);
    if (booster.charges <= 0) {
      booster.reloading = true;
      booster.reloadTimer = booster.reloadTime;
      booster.cycleTimer = 0;
    }
  }

  incomingDrains(side: Side, drains: readonly IncomingDrain[]): void {
    const runtime = this.sides[side];
    const merged: IncomingRuntime[] = [];
    for (const drain of drains) {
      if (drain.interval <= 0) continue;
      const existing = runtime.incoming.find((candidate) => candidate.moduleId === drain.moduleId);
      if (existing) {
        existing.amount = drain.amount;
        existing.interval = drain.interval;
        existing.transfer = drain.transfer;
        existing.count = drain.count;
        merged.push(existing);
      } else {
        merged.push({ moduleId: drain.moduleId, amount: drain.amount, interval: drain.interval, transfer: drain.transfer, count: drain.count, timer: 0, running: false });
      }
    }
    runtime.incoming = merged;
  }

  setExternalDrainPerSecond(rates: Record<Side, number>): void {
    this.sides.shipA.externalDrainPerSecond = rates.shipA;
    this.sides.shipB.externalDrainPerSecond = rates.shipB;
  }

  view(): Record<Side, CapacitorView> {
    return { shipA: sideView(this.sides.shipA), shipB: sideView(this.sides.shipB) };
  }

  capture(): CapacitorSimulatorState {
    return {
      time: this.time,
      sides: { shipA: sideSnapshot(this.sides.shipA), shipB: sideSnapshot(this.sides.shipB) },
    };
  }

  restore(state: CapacitorSimulatorState): void {
    this.time = state.time;
    this.sides = { shipA: sideFromSnapshot(state.sides.shipA), shipB: sideFromSnapshot(state.sides.shipB) };
  }
}

function hasPool(runtime: SideRuntime): boolean {
  return runtime.spec !== undefined && !runtime.infinite && runtime.spec.capacity > 0;
}

function capacityOf(spec: CapacitorSpec | undefined): number {
  return spec?.capacity ?? 0;
}

function capacityEpsilon(spec: CapacitorSpec | undefined): number {
  return capacityOf(spec) * CAPACITY_EPSILON_FACTOR;
}

function emptySide(): SideRuntime {
  return { spec: undefined, infinite: false, cap: 0, drains: [], incoming: [], boosters: [], propulsion: undefined, propulsionSuppressed: false, anyStarved: false, starvedModuleIds: [], externalDrainPerSecond: 0 };
}

function sideFromConfig(spec: CapacitorSpec | undefined, capacityMultiplier: number | undefined, config: CapacitorSideConfig): SideRuntime {
  const runtime = emptySide();
  const effective = multiplyCapacity(spec, capacityMultiplier);
  runtime.spec = effective;
  runtime.infinite = config.infinite;
  runtime.cap = effective && effective.capacity > 0 ? effective.capacity : 0;
  runtime.drains = config.drains.filter((drain) => drain.interval > 0).map((drain) => ({ moduleId: drain.moduleId, amount: drain.amount, interval: drain.interval, active: drain.active, running: false, starved: false, timer: 0 }));
  runtime.boosters = config.boosters.map((booster) => ({ ...booster, charges: booster.clipSize, cycleTimer: 0, reloading: false, reloadTimer: 0 }));
  runtime.propulsion = propulsionRuntime(config.propulsion);
  return runtime;
}

function mergeSide(runtime: SideRuntime, spec: CapacitorSpec | undefined, capacityMultiplier: number | undefined, config: CapacitorSideConfig): void {
  const effective = multiplyCapacity(spec, capacityMultiplier);
  const specChanged = runtime.spec?.capacity !== effective?.capacity || runtime.spec?.rechargeTime !== effective?.rechargeTime;
  runtime.spec = effective;
  runtime.infinite = config.infinite;
  if (specChanged && effective && effective.capacity > 0) runtime.cap = effective.capacity;
  mergeDrains(runtime, config.drains);
  mergeBoosters(runtime, config.boosters);
  mergePropulsion(runtime, config.propulsion);
}

/** Propulsion capacity penalty (e.g. MWD 0.75) composes the effective pool from the propulsion-independent spec. */
function multiplyCapacity(spec: CapacitorSpec | undefined, multiplier: number | undefined): CapacitorSpec | undefined {
  if (!spec || multiplier === undefined || multiplier === 1) return spec;
  return { capacity: spec.capacity * multiplier, rechargeTime: spec.rechargeTime };
}

function mergeDrains(runtime: SideRuntime, drains: readonly ScheduledDrain[]): void {
  const merged: DrainRuntime[] = [];
  for (const drain of drains) {
    if (drain.interval <= 0) continue;
    const existing = runtime.drains.find((candidate) => candidate.moduleId === drain.moduleId);
    if (existing) {
      existing.amount = drain.amount;
      existing.interval = drain.interval;
      const reactivated = drain.active && !existing.active;
      existing.active = drain.active;
      if (!drain.active) {
        existing.running = false;
        existing.starved = false;
      } else if (reactivated) {
        existing.timer = 0;
        existing.starved = false;
      }
      merged.push(existing);
    } else {
      merged.push({ moduleId: drain.moduleId, amount: drain.amount, interval: drain.interval, active: drain.active, running: false, starved: false, timer: 0 });
    }
  }
  runtime.drains = merged;
}

function mergeBoosters(runtime: SideRuntime, boosters: readonly CapBoosterSimSpec[]): void {
  const merged: BoosterRuntime[] = [];
  for (const booster of boosters) {
    const existing = runtime.boosters.find((candidate) => candidate.moduleId === booster.moduleId);
    if (existing && sameBoosterSpec(existing, booster)) {
      existing.mode = booster.mode;
      merged.push(existing);
    } else {
      merged.push({ ...booster, charges: booster.clipSize, cycleTimer: 0, reloading: false, reloadTimer: 0 });
    }
  }
  runtime.boosters = merged;
}

function sameBoosterSpec(existing: BoosterRuntime, booster: CapBoosterSimSpec): boolean {
  return existing.amount === booster.amount && existing.cycleTime === booster.cycleTime && existing.clipSize === booster.clipSize && existing.reloadTime === booster.reloadTime;
}

/** Builds the propulsion runtime from the configured drain, or undefined when absent or non-positive. */
function propulsionRuntime(drain: CapacitorPropulsionDrain | undefined): PropulsionRuntime | undefined {
  if (!drain || drain.amount <= 0 || drain.interval <= 0) return undefined;
  return { moduleId: drain.moduleId, amount: drain.amount, interval: drain.interval, timer: 0, running: false, starved: false };
}

function mergePropulsion(runtime: SideRuntime, drain: CapacitorPropulsionDrain | undefined): void {
  const next = propulsionRuntime(drain);
  if (!next) {
    runtime.propulsion = undefined;
    return;
  }
  if (runtime.propulsion && runtime.propulsion.moduleId === next.moduleId && runtime.propulsion.amount === next.amount && runtime.propulsion.interval === next.interval) return;
  runtime.propulsion = next;
}

function stepSide(sides: Record<Side, SideRuntime>, side: Side, dt: number, suppressed: boolean): void {
  const runtime = sides[side];
  runtime.anyStarved = false;
  runtime.starvedModuleIds = [];
  if (!hasPool(runtime) || runtime.infinite) {
    stepFreeSide(runtime, dt);
    return;
  }
  updateSuppression(runtime, suppressed);
  rescheduleStarved(runtime);
  walkEvents(sides, side, dt);
}

function stepFreeSide(runtime: SideRuntime, dt: number): void {
  for (const drain of runtime.drains) {
    if (!drain.active) continue;
    drain.running = true;
    drain.starved = false;
    drain.timer -= dt;
    if (drain.timer <= 0) drain.timer = drain.interval;
  }
  for (const entry of runtime.incoming) {
    entry.running = true;
    entry.timer -= dt;
    if (entry.timer <= 0) entry.timer = entry.interval;
  }
  const propulsion = runtime.propulsion;
  if (propulsion) {
    propulsion.running = true;
    propulsion.starved = false;
    propulsion.timer -= dt;
    if (propulsion.timer <= 0) propulsion.timer = propulsion.interval;
  }
  if (runtime.infinite && runtime.spec) runtime.cap = runtime.spec.capacity;
}

function updateSuppression(runtime: SideRuntime, suppressed: boolean): void {
  const propulsion = runtime.propulsion;
  if (!propulsion) return;
  if (suppressed) {
    propulsion.running = false;
    propulsion.starved = false;
    runtime.propulsionSuppressed = true;
    return;
  }
  if (runtime.propulsionSuppressed) {
    // Reactivation starts a fresh cycle: debit immediately.
    propulsion.timer = 0;
  }
  runtime.propulsionSuppressed = false;
}

function rescheduleStarved(runtime: SideRuntime): void {
  for (const drain of runtime.drains) {
    if (drain.active && drain.starved) drain.timer = retryDelay(runtime, drain.amount);
  }
  const propulsion = runtime.propulsion;
  if (propulsion && propulsion.starved && !runtime.propulsionSuppressed) propulsion.timer = retryDelay(runtime, propulsion.amount);
}

interface EventHolder {
  at: number;
  fire(): number; // returns the next relative event time, or Infinity when done
  save(remaining: number): void;
}

function collectHolders(sides: Record<Side, SideRuntime>, side: Side, runtime: SideRuntime): EventHolder[] {
  const holders: EventHolder[] = [];
  for (const drain of runtime.drains) {
    if (drain.active && Number.isFinite(drain.timer)) {
      holders.push({ at: drain.timer, fire: () => applyDrainEvent(runtime, drain), save: (remaining) => { drain.timer = remaining; } });
    }
  }
  for (const entry of runtime.incoming) {
    if (Number.isFinite(entry.timer)) {
      holders.push({ at: entry.timer, fire: () => applyIncomingEvent(sides, side, entry), save: (remaining) => { entry.timer = remaining; } });
    }
  }
  const propulsion = runtime.propulsion;
  if (propulsion && !runtime.propulsionSuppressed && Number.isFinite(propulsion.timer)) {
    holders.push({ at: propulsion.timer, fire: () => applyPropulsionEvent(runtime, propulsion), save: (remaining) => { propulsion.timer = remaining; } });
  }
  for (const booster of runtime.boosters) {
    if (booster.reloading || booster.mode === "auto") {
      holders.push({ at: booster.reloading ? booster.reloadTimer : booster.cycleTimer, fire: () => fireBooster(runtime, booster), save: (remaining) => saveBoosterTimer(booster, remaining) });
    }
  }
  return holders;
}

function fireBooster(runtime: SideRuntime, booster: BoosterRuntime): number {
  if (booster.reloading) {
    completeReload(booster);
    return booster.mode === "auto" ? booster.cycleTime : Number.POSITIVE_INFINITY;
  }
  applyAutoBoosterEvent(runtime, booster);
  return booster.reloading ? booster.reloadTime : booster.cycleTime;
}

function saveBoosterTimer(booster: BoosterRuntime, remaining: number): void {
  if (booster.reloading) booster.reloadTimer = remaining;
  else booster.cycleTimer = remaining;
}

/** Walks every scheduled event inside the step in time order, regenerating between events. */
function walkEvents(sides: Record<Side, SideRuntime>, side: Side, dt: number): void {
  const runtime = sides[side];
  for (const booster of runtime.boosters) {
    if (booster.mode === "manual" && !booster.reloading) booster.cycleTimer = Math.max(0, booster.cycleTimer - dt);
  }
  const holders = collectHolders(sides, side, runtime);
  let elapsed = 0;
  for (;;) {
    let best: EventHolder | undefined;
    for (const holder of holders) {
      if (best === undefined || holder.at < best.at) best = holder;
    }
    if (!best || best.at >= dt) break;
    regen(runtime, best.at - elapsed);
    elapsed = best.at;
    const nextRelative = best.fire();
    if (Number.isFinite(nextRelative)) best.at = elapsed + nextRelative;
    else holders.splice(holders.indexOf(best), 1);
  }
  regen(runtime, dt - elapsed);
  for (const holder of holders) holder.save(holder.at - dt);
}

function applyDrainEvent(runtime: SideRuntime, drain: DrainRuntime): number {
  if (runtime.cap + capacityEpsilon(runtime.spec) >= drain.amount) {
    runtime.cap -= drain.amount;
    drain.running = true;
    drain.starved = false;
    return drain.interval;
  }
  drain.running = false;
  drain.starved = true;
  runtime.anyStarved = true;
  if (!runtime.starvedModuleIds.includes(drain.moduleId)) runtime.starvedModuleIds.push(drain.moduleId);
  return retryDelay(runtime, drain.amount);
}

/** Cap-warfare debit from the opponent: neutralizers drain, nosferatu transfer to the attacker pool. */
function applyIncomingEvent(sides: Record<Side, SideRuntime>, side: Side, entry: IncomingRuntime): number {
  const runtime = sides[side];
  const opponent = sides[side === "shipA" ? "shipB" : "shipA"];
  entry.running = true;
  if (entry.transfer) return transferIncoming(runtime, opponent, entry);
  const drained = Math.min(entry.amount, runtime.cap);
  runtime.cap -= drained;
  return entry.interval;
}

function transferIncoming(runtime: SideRuntime, opponent: SideRuntime, entry: IncomingRuntime): number {
  const attackerCap = opponent.infinite || !hasPool(opponent) ? Number.POSITIVE_INFINITY : opponent.cap;
  if (attackerCap >= runtime.cap) return entry.interval;
  const headroom = hasPool(opponent) && !opponent.infinite ? capacityOf(opponent.spec) - opponent.cap : 0;
  const transfer = Math.min(entry.amount, runtime.cap, headroom);
  if (transfer <= 0) return entry.interval;
  runtime.cap -= transfer;
  opponent.cap = Math.min(opponent.cap + transfer, capacityOf(opponent.spec));
  return entry.interval;
}

function applyPropulsionEvent(runtime: SideRuntime, propulsion: PropulsionRuntime): number {
  if (runtime.cap + capacityEpsilon(runtime.spec) >= propulsion.amount) {
    runtime.cap -= propulsion.amount;
    propulsion.running = true;
    propulsion.starved = false;
    return propulsion.interval;
  }
  propulsion.running = false;
  propulsion.starved = true;
  runtime.anyStarved = true;
  return retryDelay(runtime, propulsion.amount);
}

function applyAutoBoosterEvent(runtime: SideRuntime, booster: BoosterRuntime): void {
  if (runtime.cap >= capacityOf(runtime.spec) - capacityEpsilon(runtime.spec)) {
    // pyfa semantics: postpone injection that would overshoot a full pool.
    booster.cycleTimer = booster.cycleTime;
    return;
  }
  injectCharge(runtime, booster);
  if (booster.charges <= 0) {
    booster.reloading = true;
    booster.reloadTimer = booster.reloadTime;
    booster.cycleTimer = 0;
  }
}

function injectCharge(runtime: SideRuntime, booster: BoosterRuntime): void {
  runtime.cap = Math.min(runtime.cap + booster.amount, capacityOf(runtime.spec));
  booster.charges -= 1;
  booster.cycleTimer = booster.cycleTime;
}

function completeReload(booster: BoosterRuntime): void {
  booster.reloading = false;
  booster.charges = booster.clipSize;
  booster.cycleTimer = booster.cycleTime;
}

/** Closed-form time until regen reaches the given amount, so retries are frame-size independent. */
function retryDelay(runtime: SideRuntime, amount: number): number {
  const spec = runtime.spec;
  if (!spec) return Number.POSITIVE_INFINITY;
  const target = amount + capacityEpsilon(spec);
  if (target >= spec.capacity) return Number.POSITIVE_INFINITY;
  if (runtime.cap + capacityEpsilon(spec) >= target) return 0;
  const tau = spec.rechargeTime / TAU_DENOMINATOR;
  const numerator = Math.sqrt(target / spec.capacity) - 1;
  const denominator = Math.sqrt(Math.max(runtime.cap, 0) / spec.capacity) - 1;
  return -tau * Math.log(numerator / denominator);
}

function regen(runtime: SideRuntime, dt: number): void {
  const spec = runtime.spec;
  if (dt <= 0 || !spec || runtime.cap >= spec.capacity) return;
  const tau = spec.rechargeTime / TAU_DENOMINATOR;
  const root = Math.sqrt(runtime.cap / spec.capacity);
  runtime.cap = spec.capacity * Math.pow(1 + (root - 1) * Math.exp(-dt / tau), 2);
}

function sideView(runtime: SideRuntime): CapacitorView {
  const propulsion = propulsionView(runtime);
  if (!runtime.spec || runtime.spec.capacity <= 0) {
    return {
      cap: 0, capacity: 0, percentage: 100, regenPerSecond: 0, netPerSecond: 0,
      incomingDrainPerSecond: averageDrainRate(runtime), starved: runtime.anyStarved,
      starvedModuleIds: [], propulsion, drains: runtime.drains.map(drainState), incoming: runtime.incoming.map(incomingState), boosters: runtime.boosters.map(boosterState),
    };
  }
  if (runtime.infinite) {
    const incoming = averageDrainRate(runtime);
    return {
      cap: runtime.spec.capacity, capacity: runtime.spec.capacity, percentage: 100, regenPerSecond: 0, netPerSecond: -incoming,
      incomingDrainPerSecond: incoming, starved: false, starvedModuleIds: [], propulsion,
      drains: runtime.drains.map((drain) => drainState({ ...drain, running: drain.active, starved: false })),
      incoming: runtime.incoming.map(incomingState),
      boosters: runtime.boosters.map(boosterState),
    };
  }
  const tau = runtime.spec.rechargeTime / TAU_DENOMINATOR;
  const root = Math.sqrt(runtime.cap / runtime.spec.capacity);
  const regenPerSecond = (2 * runtime.spec.capacity * root * (1 - root)) / tau;
  const incoming = averageDrainRate(runtime);
  return {
    cap: runtime.cap, capacity: runtime.spec.capacity, percentage: (runtime.cap / runtime.spec.capacity) * 100,
    regenPerSecond, netPerSecond: regenPerSecond - incoming, incomingDrainPerSecond: incoming,
    starved: runtime.anyStarved,
    starvedModuleIds: [...runtime.starvedModuleIds], propulsion,
    drains: runtime.drains.map(drainState), incoming: runtime.incoming.map(incomingState), boosters: runtime.boosters.map(boosterState),
  };
}

/** Free and infinite sides never starve; running mirrors the last step's flags. */
function propulsionView(runtime: SideRuntime): CapacitorPropulsionView | undefined {
  const propulsion = runtime.propulsion;
  if (!propulsion) return undefined;
  return { moduleId: propulsion.moduleId, running: propulsion.running, starved: propulsion.starved };
}

/** Deterministic average drain: every active debit cycles a fixed amount over a fixed interval, so the per-second cost is exact. */
function averageDrainRate(runtime: SideRuntime): number {
  let rate = 0;
  for (const drain of runtime.drains) {
    if (drain.active) rate += drain.amount / drain.interval;
  }
  for (const entry of runtime.incoming) {
    rate += entry.amount / entry.interval;
  }
  const propulsion = runtime.propulsion;
  if (propulsion && !runtime.propulsionSuppressed) rate += propulsion.amount / propulsion.interval;
  return rate + runtime.externalDrainPerSecond;
}

function drainState(drain: DrainRuntime): CapacitorDrainState {
  return { moduleId: drain.moduleId, amount: drain.amount, interval: drain.interval, active: drain.active, running: drain.running, starved: drain.starved, timer: drain.timer };
}

function incomingState(entry: IncomingRuntime): IncomingDrainState {
  return { moduleId: entry.moduleId, amount: entry.amount, interval: entry.interval, transfer: entry.transfer, count: entry.count, timer: entry.timer, running: entry.running };
}

function boosterState(booster: BoosterRuntime): CapacitorBoosterState {
  return { moduleId: booster.moduleId, amount: booster.amount, cycleTime: booster.cycleTime, clipSize: booster.clipSize, reloadTime: booster.reloadTime, mode: booster.mode, charges: booster.charges, cycleTimer: booster.cycleTimer, reloading: booster.reloading, reloadTimer: booster.reloadTimer };
}

function sideSnapshot(runtime: SideRuntime): SideCapacitorSnapshot {
  return {
    spec: runtime.spec ? { ...runtime.spec } : undefined,
    infinite: runtime.infinite,
    cap: runtime.cap,
    drains: runtime.drains.map(drainState),
    incoming: runtime.incoming.map(incomingState),
    boosters: runtime.boosters.map(boosterState),
    propulsion: runtime.propulsion ? { ...runtime.propulsion } : undefined,
  };
}

function sideFromSnapshot(snapshot: SideCapacitorSnapshot): SideRuntime {
  return {
    spec: snapshot.spec ? { ...snapshot.spec } : undefined,
    infinite: snapshot.infinite,
    cap: snapshot.cap,
    drains: snapshot.drains.map((drain) => ({ ...drain })),
    incoming: snapshot.incoming.map((entry) => ({ ...entry })),
    boosters: snapshot.boosters.map((booster) => ({ ...booster })),
    propulsion: snapshot.propulsion ? { ...snapshot.propulsion } : undefined,
    propulsionSuppressed: false,
    anyStarved: false,
    starvedModuleIds: [],
    externalDrainPerSecond: 0,
  };
}
