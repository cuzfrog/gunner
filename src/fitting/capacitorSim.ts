import type { CapacitorSpec } from "../sim";

export interface StaticDrain {
  readonly amount: number; // GJ per activation per module instance
  readonly interval: number; // seconds between activations
  readonly count?: number; // identical module instances; staggered per pyfa
  readonly clipSize?: number; // activations before reload (cap boosters)
  readonly reloadTime?: number; // seconds
  readonly injector?: boolean; // injects amount instead of draining
}

export interface CapSimResult {
  readonly stable: boolean;
  readonly stableLow: number; // GJ watermark low, 0 when unstable
  readonly stableHigh: number; // GJ watermark right before activations, 0 when unstable
  readonly depletesAt?: number; // seconds when the pool hits 0, when unstable
}

export interface CapSimInput {
  readonly spec: CapacitorSpec;
  readonly drains: readonly StaticDrain[];
  readonly tMaxSeconds?: number; // default 86400 (1 day, pyfa's horizon)
}

interface Activation {
  tNow: number; // ms
  duration: number; // ms
  capNeed: number; // GJ, negative for injectors
  shot: number;
  clipSize: number;
  reloadTime: number; // ms
  isInjector: boolean;
}

const DEFAULT_T_MAX_SECONDS = 86400;
const STABILITY_PRECISION_DIGITS = 1;

/**
 * Event-driven capacitor simulation, a TypeScript port of pyfa's eos/capSim.py:
 * closed-form regen between activations, staggered identical modules, LCM period
 * stability detection, and cap boosters as postponed on-demand injectors.
 */
export function runCapSim(input: CapSimInput): CapSimResult {
  const capacity = input.spec.capacity;
  const tMax = (input.tMaxSeconds ?? DEFAULT_T_MAX_SECONDS) * 1000;
  if (capacity <= 0) return { stable: input.drains.length === 0, stableLow: 0, stableHigh: 0, ...(input.drains.length > 0 ? { depletesAt: 0 } : {}) };

  const state = buildActivationHeap(input.drains);
  const period = hasClip(input.drains) ? tMax : lcmPeriod(input.drains);

  const tau = input.spec.rechargeTime / 5;
  let cap = capacity;
  let capWrap = capacity;
  let capLowest = capacity;
  let capLowestPre = capacity;
  let tWrap = period;
  let tLast = 0;
  let depletedAt: number | undefined;
  const awaitingInjectors: Activation[] = [];

  while (true) {
    const activation = popActivation(state);
    if (!activation) break;
    if (activation.tNow >= tMax) break;
    const { tNow } = activation;

    if (tNow > tLast) cap = regen(cap, capacity, tau, (tNow - tLast) / 1000);

    if (tNow !== tLast) {
      if (cap < capLowestPre) capLowestPre = cap;
      if (tNow === tWrap && cap >= capWrap) {
        break; // history repeated with no less cap: stable
      }
      if (tNow === tWrap) {
        capWrap = roundToPrecision(cap);
        tWrap += period;
      }
    }

    tLast = tNow;

    if (activation.isInjector && cap - activation.capNeed > capacity) {
      awaitingInjectors.push(activation); // injection would overshoot: hold as on-demand reserve
      continue;
    }

    if (activation.capNeed > cap && cap < capacity) {
      // spend reserve injectors until the activation is affordable
      while (awaitingInjectors.length > 0 && activation.capNeed > cap && capacity > cap) {
        const needed = Math.min(activation.capNeed - cap, capacity - cap);
        const best = pickInjector(awaitingInjectors, (candidate) => -candidate.capNeed >= needed, "least");
        if (!best) break;
        cap = Math.min(capacity, cap - best.capNeed);
        fireInjector(best, state, tNow);
      }
    }

    cap -= activation.capNeed;
    if (cap > capacity) cap = capacity;

    if (cap < capLowest) {
      if (cap < 0) {
        depletedAt = tLast / 1000;
        break;
      }
      capLowest = cap;
    }

    while (awaitingInjectors.length > 0 && cap < capacity) {
      const needed = capacity - cap;
      const best = pickInjector(awaitingInjectors, (candidate) => -candidate.capNeed <= needed, "most");
      if (!best) break;
      cap -= best.capNeed; // injection without overshoot; capNeed is negative
      fireInjector(best, state, tNow);
    }

    scheduleNext(activation, state, tNow);
  }

  if (cap <= 0) return { stable: false, stableLow: 0, stableHigh: 0, depletesAt: depletedAt ?? tLast / 1000 };
  return { stable: true, stableLow: capLowest, stableHigh: capLowestPre };
}

export interface EveStablePercentInput {
  readonly capacity: number;
  readonly rechargeTime: number;
  readonly drainPerSecond: number;
}

/** EVE client cap-stable formula (high root); 0 when 2*D*tau >= C. Cross-check only. */
export function eveStablePercent(input: EveStablePercentInput): number {
  const tau = input.rechargeTime / 5;
  const argument = 1 - (2 * input.drainPerSecond * tau) / input.capacity;
  if (argument < 0) return 0;
  return 0.25 * Math.pow(1 + Math.sqrt(argument), 2) * 100;
}

function regen(cap: number, capacity: number, tau: number, dtSeconds: number): number {
  const x = Math.sqrt(cap / capacity);
  return Math.pow(1 + (x - 1) * Math.exp(-dtSeconds / tau), 2) * capacity;
}

function roundToPrecision(value: number): number {
  const factor = Math.pow(10, STABILITY_PRECISION_DIGITS);
  return Math.round(value * factor) / factor;
}

function popActivation(state: Activation[]): Activation | undefined {
  if (state.length === 0) return undefined;
  let minIndex = 0;
  for (let i = 1; i < state.length; i++) {
    if (compareActivation(state[i], state[minIndex]) < 0) minIndex = i;
  }
  return state.splice(minIndex, 1)[0];
}

function compareActivation(a: Activation, b: Activation): number {
  if (a.tNow !== b.tNow) return a.tNow - b.tNow;
  if (a.duration !== b.duration) return a.duration - b.duration;
  return a.capNeed - b.capNeed;
}

function pickInjector(awaiting: Activation[], matches: (candidate: Activation) => boolean, pick: "least" | "most"): Activation | undefined {
  let best: Activation | undefined;
  for (const candidate of awaiting) {
    if (!matches(candidate)) continue;
    if (!best) {
      best = candidate;
      continue;
    }
    const candidateInjection = -candidate.capNeed;
    const bestInjection = -best.capNeed;
    const better = pick === "least" ? candidateInjection < bestInjection : candidateInjection > bestInjection;
    if (better) best = candidate;
  }
  if (best) awaiting.splice(awaiting.indexOf(best), 1);
  return best;
}

function fireInjector(injector: Activation, state: Activation[], tNow: number): void {
  scheduleNext(injector, state, tNow);
}

function scheduleNext(activation: Activation, state: Activation[], tNow: number): void {
  let tNext = tNow + activation.duration;
  let shot = activation.shot + 1;
  if (activation.clipSize > 0 && shot % activation.clipSize === 0) {
    shot = 0;
    tNext += activation.reloadTime;
  }
  state.push({ ...activation, tNow: tNext, shot });
}

/** Module grouping and staggering per pyfa capSim.reset(). */
function buildActivationHeap(drains: readonly StaticDrain[]): Activation[] {
  const groups = new Map<string, { drain: StaticDrain; count: number }>();
  for (const drain of drains) {
    if (drain.amount <= 0 || drain.interval <= 0) continue;
    const key = [drain.amount, drain.interval, drain.clipSize ?? 0, drain.reloadTime ?? 0, drain.injector ?? false].join(":");
    const existing = groups.get(key);
    if (existing) existing.count += drain.count ?? 1;
    else groups.set(key, { drain, count: drain.count ?? 1 });
  }

  const state: Activation[] = [];
  for (const { drain, count } of groups.values()) {
    const duration = Math.round(drain.interval * 1000);
    const clipSize = drain.clipSize ?? 0;
    const reloadTime = Math.round((drain.reloadTime ?? 0) * 1000);
    const isInjector = drain.injector ?? false;
    if (isInjector) {
      // injectors are pushed per instance unstaggered: they are used on demand
      for (let i = 0; i < count; i++) state.push({ tNow: 0, duration, capNeed: -drain.amount, shot: 0, clipSize, reloadTime, isInjector });
      continue;
    }
    if (clipSize > 0) {
      // stagger the full clip-cycle across instances
      const staggerAmount = (duration * clipSize + reloadTime) / (count * clipSize);
      for (let i = 1; i < count; i++) state.push({ tNow: i * staggerAmount, duration, capNeed: drain.amount, shot: 0, clipSize, reloadTime, isInjector });
      state.push({ tNow: 0, duration, capNeed: drain.amount, shot: 0, clipSize, reloadTime, isInjector });
      continue;
    }
    // identical drains share one event at duration/count
    state.push({ tNow: 0, duration: Math.floor(duration / count), capNeed: drain.amount, shot: 0, clipSize, reloadTime, isInjector });
  }
  return state;
}

function hasClip(drains: readonly StaticDrain[]): boolean {
  return drains.some((drain) => (drain.clipSize ?? 0) > 0);
}

function lcmPeriod(drains: readonly StaticDrain[]): number {
  let period = 1;
  for (const drain of drains) {
    if (drain.injector) continue;
    const count = drain.count ?? 1;
    const duration = Math.floor(Math.round(drain.interval * 1000) / count);
    period = lcm(period, duration);
  }
  return period;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return (a * b) / gcd(a, b);
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
