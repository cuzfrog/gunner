import { type ActiveHardenerSpec, type BurstModifiers, type DamageEvent, type DamageResists, type DamageType, type DamageVector, type DefenseLayer, type DefenseSpec, type LayerDamage, type RahSpec, type RepairerSpec, type Side, DAMAGE_TYPES, IDENTITY_BURST_MODIFIERS, MODULE_HEAT_HITPOINTS, ZERO_RESISTS } from "./types";
import type { CapacitorGate } from "./capacitorSimulator";
import type { Restorable } from "./restorable";
import type { StackingPenalty } from "./stackingPenalty";

export type RepairMode = "auto" | "manual";

export interface DefensePoolState {
  readonly shield: number;
  readonly armor: number;
  readonly hull: number;
}

export interface RepairerViewState {
  readonly layer: DefenseLayer;
  readonly cycling: boolean;
  readonly cycleProgress: number;
  readonly ancillaryCharges: number | undefined;
  readonly reloading: boolean;
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly hpPerSecond: number;
  readonly starved: boolean;
  /** Present once the module burned out from heat damage and stopped repairing. */
  readonly burned?: boolean;
}

export interface RahViewState {
  readonly resists: DamageResists;
  readonly cycling: boolean;
  readonly cycleProgress: number;
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly starved: boolean;
}

export interface HardenerViewState {
  readonly moduleId: ActiveHardenerSpec["moduleId"];
  readonly layer: DefenseLayer;
  readonly online: boolean;
  readonly starved: boolean;
  readonly cycleProgress: number;
  /** Present once the module burned out from heat damage and dropped offline. */
  readonly burned?: boolean;
}

export interface DefenseView {
  readonly pools: Record<Side, DefensePoolState>;
  readonly poolMaxes: Record<Side, DefensePoolState>;
  readonly poolPercentages: Record<Side, Readonly<Record<DefenseLayer, number>>>;
  readonly dead: Record<Side, boolean>;
  readonly deadAt: Record<Side, number | undefined>;
  readonly damageEnabled: Record<Side, boolean>;
  readonly shieldRegenPerSecond: Record<Side, number>;
  readonly repairers: Record<Side, readonly RepairerViewState[]>;
  readonly repairMode: Record<Side, RepairMode>;
  readonly rah: Record<Side, RahViewState | undefined>;
  readonly hardeners: Record<Side, readonly HardenerViewState[]>;
}

export interface RepairerActivationEntry {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface RahActivationEntry {
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface DefenseSimConfig {
  readonly shipA: DefenseSpec;
  readonly shipB: DefenseSpec;
  readonly damageEnabled: Record<Side, boolean>;
  readonly repairMode: Record<Side, RepairMode>;
  readonly repairerActivation: Record<Side, readonly RepairerActivationEntry[]>;
  readonly rahActivation: Record<Side, RahActivationEntry | undefined>;
  /** Side-level overload toggle; an overloaded hardener applies its overload bonus to the resists. */
  readonly overloaded: Record<Side, boolean>;
}

export interface RepairerStateSnapshot {
  readonly cycleTimer: number;
  readonly inCycle: boolean;
  readonly ancillaryCharges: number;
  readonly reloading: boolean;
  readonly reloadTimer: number;
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly hpThisCycle: number;
  readonly heatHp: number;
  readonly burned: boolean;
}

export interface RahStateSnapshot {
  readonly resists: DamageResists;
  readonly cycleTimer: number;
  readonly inCycle: boolean;
  readonly active: boolean;
  readonly overloaded: boolean;
  readonly armorDamageAccumulator: DamageVector;
}

export interface HardenerStateSnapshot {
  readonly timer: number;
  readonly online: boolean;
  readonly needsPayment: boolean;
  readonly starved: boolean;
  readonly heatHp: number;
  readonly burned: boolean;
}

export interface SidePoolsSnapshot {
  readonly shield: number;
  readonly armor: number;
  readonly hull: number;
  readonly shieldMax: number;
  readonly armorMax: number;
  readonly hullMax: number;
  readonly shieldMaxBase: number;
  readonly armorMaxBase: number;
  readonly shieldRechargeTime: number;
  readonly shieldUniformity: number;
  readonly baseResists: Readonly<Record<DefenseLayer, DamageResists>>;
  readonly hardeners: readonly ActiveHardenerSpec[];
  readonly hardenerStates: readonly HardenerStateSnapshot[];
  readonly overloaded: boolean;
  readonly resists: Readonly<Record<DefenseLayer, Readonly<Record<DamageType, number>>>>;
  readonly bursts: BurstModifiers;
  readonly dead: boolean;
  readonly deadAt: number | undefined;
  readonly damageEnabled: boolean;
  readonly repairers: readonly RepairerSpec[];
  readonly repairerStates: readonly RepairerStateSnapshot[];
  readonly repairMode: RepairMode;
  readonly rahSpec: RahSpec | undefined;
  readonly rahState: RahStateSnapshot | undefined;
  readonly inflicted: LayerDamage;
}

export interface DefenseSimulatorState {
  readonly sides: Record<Side, SidePoolsSnapshot>;
  readonly time: number;
  readonly eventBuffer: readonly DamageEvent[];
  readonly nextTickBoundary: number;
}

export interface DefenseSimulator extends Restorable<DefenseSimulatorState> {
  reset(config: DefenseSimConfig): void;
  update(config: DefenseSimConfig): void;
  step(dt: number, events: readonly DamageEvent[], capacitor?: CapacitorGate, bursts?: Record<Side, BurstModifiers>): void;
  flushPendingDamage(capacitor?: CapacitorGate): void;
  view(): DefenseView;
  inflictedTotals(): Record<Side, LayerDamage>;
}

type MutableDamageVector = Record<DamageType, number>;
type MutableDamageResists = Record<DamageType, number>;
type MutableLayerDamage = { shield: number; armor: number; hull: number };

interface RepairerState {
  cycleTimer: number;
  inCycle: boolean;
  ancillaryCharges: number;
  reloading: boolean;
  reloadTimer: number;
  active: boolean;
  overloaded: boolean;
  hpThisCycle: number;
  starved: boolean;
  heatHp: number;
  burned: boolean;
}

interface RahState {
  resists: MutableDamageResists;
  cycleTimer: number;
  inCycle: boolean;
  active: boolean;
  overloaded: boolean;
  starved: boolean;
  armorDamageAccumulator: MutableDamageVector;
}

interface HardenerState {
  timer: number;
  online: boolean;
  needsPayment: boolean;
  starved: boolean;
  heatHp: number;
  burned: boolean;
}

interface SidePools {
  shield: number;
  armor: number;
  hull: number;
  shieldMax: number;
  armorMax: number;
  hullMax: number;
  shieldMaxBase: number;
  armorMaxBase: number;
  shieldRechargeTime: number;
  shieldUniformity: number;
  baseResists: Readonly<Record<DefenseLayer, DamageResists>>;
  hardeners: readonly ActiveHardenerSpec[];
  hardenerStates: HardenerState[];
  overloaded: boolean;
  resists: Readonly<Record<DefenseLayer, Readonly<Record<DamageType, number>>>>;
  bursts: BurstModifiers;
  dead: boolean;
  deadAt: number | undefined;
  damageEnabled: boolean;
  repairers: readonly RepairerSpec[];
  repairerStates: RepairerState[];
  repairMode: RepairMode;
  rahSpec: RahSpec | undefined;
  rahState: RahState | undefined;
  inflicted: MutableLayerDamage;
}

export class DefenseSimulatorImpl implements DefenseSimulator {
  private sides: Record<Side, SidePools> = { shipA: emptyPools(), shipB: emptyPools() };
  private time: number;
  private eventBuffer: DamageEvent[];
  private nextTickBoundary: number;
  private readonly stacking: StackingPenalty;

  constructor({ stackingPenalty }: { readonly stackingPenalty: StackingPenalty }) {
    this.stacking = stackingPenalty;
    this.time = 0;
    this.eventBuffer = [];
    this.nextTickBoundary = 1;
  }

  reset(config: DefenseSimConfig): void {
    this.sides = {
      shipA: poolsFromSpec(config.shipA, config.damageEnabled.shipA, config.repairMode.shipA, config.repairerActivation.shipA, config.rahActivation.shipA, config.overloaded.shipA, this.stacking),
      shipB: poolsFromSpec(config.shipB, config.damageEnabled.shipB, config.repairMode.shipB, config.repairerActivation.shipB, config.rahActivation.shipB, config.overloaded.shipB, this.stacking),
    };
    this.time = 0;
    this.eventBuffer = [];
    this.nextTickBoundary = 1;
  }

  update(config: DefenseSimConfig): void {
    this.sides = {
      shipA: mergePools(this.sides.shipA, config.shipA, config.damageEnabled.shipA, config.repairMode.shipA, config.repairerActivation.shipA, config.rahActivation.shipA, config.overloaded.shipA, this.stacking),
      shipB: mergePools(this.sides.shipB, config.shipB, config.damageEnabled.shipB, config.repairMode.shipB, config.repairerActivation.shipB, config.rahActivation.shipB, config.overloaded.shipB, this.stacking),
    };
  }

  step(dt: number, events: readonly DamageEvent[], capacitor?: CapacitorGate, bursts?: Record<Side, BurstModifiers>): void {
    this.time += dt;
    for (const event of events) {
      this.eventBuffer.push(event);
    }
    this.sides.shipA.bursts = bursts?.shipA ?? IDENTITY_BURST_MODIFIERS;
    this.sides.shipB.bursts = bursts?.shipB ?? IDENTITY_BURST_MODIFIERS;
    const released = this.collectReleasedEvents();
    this.stepSide("shipA", dt, released.shipA, capacitor);
    this.stepSide("shipB", dt, released.shipB, capacitor);
  }

  flushPendingDamage(capacitor?: CapacitorGate): void {
    const buffered = this.eventBuffer;
    this.eventBuffer = [];
    this.stepSide("shipA", 0, buffered.filter((event) => event.target === "shipA"), capacitor);
    this.stepSide("shipB", 0, buffered.filter((event) => event.target === "shipB"), capacitor);
  }

  view(): DefenseView {
    return {
      pools: {
        shipA: { shield: this.sides.shipA.shield, armor: this.sides.shipA.armor, hull: this.sides.shipA.hull },
        shipB: { shield: this.sides.shipB.shield, armor: this.sides.shipB.armor, hull: this.sides.shipB.hull },
      },
      poolMaxes: {
        shipA: { shield: this.sides.shipA.shieldMax, armor: this.sides.shipA.armorMax, hull: this.sides.shipA.hullMax },
        shipB: { shield: this.sides.shipB.shieldMax, armor: this.sides.shipB.armorMax, hull: this.sides.shipB.hullMax },
      },
      poolPercentages: {
        shipA: poolPercentages(this.sides.shipA),
        shipB: poolPercentages(this.sides.shipB),
      },
      dead: { shipA: this.sides.shipA.dead, shipB: this.sides.shipB.dead },
      deadAt: { shipA: this.sides.shipA.deadAt, shipB: this.sides.shipB.deadAt },
      damageEnabled: { shipA: this.sides.shipA.damageEnabled, shipB: this.sides.shipB.damageEnabled },
      shieldRegenPerSecond: {
        shipA: shieldRegenRate(this.sides.shipA),
        shipB: shieldRegenRate(this.sides.shipB),
      },
      repairers: {
        shipA: repairerViews(this.sides.shipA),
        shipB: repairerViews(this.sides.shipB),
      },
      repairMode: { shipA: this.sides.shipA.repairMode, shipB: this.sides.shipB.repairMode },
      rah: { shipA: rahView(this.sides.shipA), shipB: rahView(this.sides.shipB) },
      hardeners: { shipA: hardenerViews(this.sides.shipA), shipB: hardenerViews(this.sides.shipB) },
    };
  }

  inflictedTotals(): Record<Side, LayerDamage> {
    return { shipA: { ...this.sides.shipA.inflicted }, shipB: { ...this.sides.shipB.inflicted } };
  }

  capture(): DefenseSimulatorState {
    return {
      sides: { shipA: snapshotPools(this.sides.shipA), shipB: snapshotPools(this.sides.shipB) },
      time: this.time,
      eventBuffer: [...this.eventBuffer],
      nextTickBoundary: this.nextTickBoundary,
    };
  }

  restore(state: DefenseSimulatorState): void {
    this.sides = { shipA: materializePools(state.sides.shipA), shipB: materializePools(state.sides.shipB) };
    this.time = state.time;
    this.eventBuffer = [...state.eventBuffer];
    this.nextTickBoundary = state.nextTickBoundary;
  }

  private collectReleasedEvents(): Record<Side, readonly DamageEvent[]> {
    const shipAEvents: DamageEvent[] = [];
    const shipBEvents: DamageEvent[] = [];
    if (this.time >= this.nextTickBoundary) {
      while (this.time >= this.nextTickBoundary) {
        this.nextTickBoundary += 1;
      }
      for (const event of this.eventBuffer) {
        if (event.target === "shipA") shipAEvents.push(event);
        else shipBEvents.push(event);
      }
      this.eventBuffer = [];
    }
    return { shipA: shipAEvents, shipB: shipBEvents };
  }

  private stepSide(side: Side, dt: number, events: readonly DamageEvent[], capacitor?: CapacitorGate): void {
    stepSidePools(this.sides[side], dt, events, this.time, side, capacitor, this.stacking);
  }}

function stepSidePools(pools: SidePools, dt: number, events: readonly DamageEvent[], time: number, side: Side, capacitor: CapacitorGate | undefined, stacking: StackingPenalty): void {
  applyEffectiveMaxes(pools);
  if (pools.dead) return;
  if (!pools.damageEnabled) {
    pools.shield = pools.shieldMax;
    pools.armor = pools.armorMax;
    pools.hull = pools.hullMax;
    return;
  }
  stepHardeners(pools, dt, side, capacitor);
  updateAppliedResists(pools, stacking);
  applyShieldRegen(pools, dt);
  const armorDamageByType = applyEvents(pools, events);
  stepRepairers(pools, dt, side, capacitor);
  stepRah(pools, dt, armorDamageByType, side, capacitor);
  if (pools.hullMax > 0 && pools.hull <= 0) {
    pools.hull = 0;
    pools.dead = true;
    pools.deadAt = time;
  }
}

function emptyPools(): SidePools {
  return {
    shield: 0, armor: 0, hull: 0,
    shieldMax: 0, armorMax: 0, hullMax: 0,
    shieldMaxBase: 0, armorMaxBase: 0,
    shieldRechargeTime: 0,
    shieldUniformity: 0,
    baseResists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
    hardeners: [], hardenerStates: [], overloaded: false,
    resists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
    bursts: IDENTITY_BURST_MODIFIERS,
    dead: false, deadAt: undefined, damageEnabled: true,
    repairers: [], repairerStates: [],
    repairMode: "auto",
    rahSpec: undefined, rahState: undefined,
    inflicted: { shield: 0, armor: 0, hull: 0 },
  };
}

function poolsFromSpec(spec: DefenseSpec, damageEnabled: boolean, repairMode: RepairMode, repairerActivation: readonly RepairerActivationEntry[], rahActivation: RahActivationEntry | undefined, overloaded: boolean, stacking: StackingPenalty): SidePools {
  const rahSpec = spec.rah;
  const rahState = rahSpec ? createRahState(rahSpec, rahActivation) : undefined;
  const pools: SidePools = {
    shield: spec.layers.shield.hp,
    armor: spec.layers.armor.hp,
    hull: spec.layers.hull.hp,
    shieldMax: spec.layers.shield.hp,
    armorMax: spec.layers.armor.hp,
    hullMax: spec.layers.hull.hp,
    shieldMaxBase: spec.layers.shield.hp,
    armorMaxBase: spec.layers.armor.hp,
    shieldRechargeTime: spec.shieldRechargeTime,
    shieldUniformity: spec.shieldUniformity,
    baseResists: spec.baseResists,
    hardeners: spec.hardeners,
    hardenerStates: spec.hardeners.map((hardener) => ({ timer: hardener.cycleTime, online: true, needsPayment: true, starved: false, heatHp: MODULE_HEAT_HITPOINTS, burned: false })),
    overloaded,
    resists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
    bursts: IDENTITY_BURST_MODIFIERS,
    dead: false, deadAt: undefined, damageEnabled,
    repairers: spec.repairers,
    repairerStates: createRepairerStates(spec.repairers, repairerActivation),
    repairMode,
    rahSpec,
    rahState,
    inflicted: { shield: 0, armor: 0, hull: 0 },
  };
  updateAppliedResists(pools, stacking);
  return pools;
}

function mergePools(prev: SidePools, spec: DefenseSpec, damageEnabled: boolean, repairMode: RepairMode, repairerActivation: readonly RepairerActivationEntry[], rahActivation: RahActivationEntry | undefined, overloaded: boolean, stacking: StackingPenalty): SidePools {
  const rahSpec = spec.rah;
  const rahState = rahSpec ? mergeRahState(prev.rahState, rahSpec, rahActivation) : undefined;
  const shieldMax = spec.layers.shield.hp;
  const armorMax = spec.layers.armor.hp;
  const hullMax = spec.layers.hull.hp;
  const merged: SidePools = {
    shield: mergePool(prev.shield, prev.shieldMax, shieldMax),
    armor: mergePool(prev.armor, prev.armorMax, armorMax),
    hull: mergePool(prev.hull, prev.hullMax, hullMax),
    shieldMax,
    armorMax,
    hullMax,
    shieldMaxBase: shieldMax,
    armorMaxBase: armorMax,
    shieldRechargeTime: spec.shieldRechargeTime,
    shieldUniformity: spec.shieldUniformity,
    baseResists: spec.baseResists,
    hardeners: spec.hardeners,
    hardenerStates: mergeHardenerStates(prev.hardeners, prev.hardenerStates, spec.hardeners),
    overloaded,
    resists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
    bursts: prev.bursts,
    dead: prev.dead,
    deadAt: prev.deadAt,
    damageEnabled,
    repairers: spec.repairers,
    repairerStates: mergeRepairerStates(prev.repairers, prev.repairerStates, spec.repairers, repairerActivation),
    repairMode,
    rahSpec,
    rahState,
    inflicted: { ...prev.inflicted },
  };
  updateAppliedResists(merged, stacking);
  return merged;
}

function mergeHardenerStates(prevHardeners: readonly ActiveHardenerSpec[], prev: HardenerState[], specs: readonly ActiveHardenerSpec[]): HardenerState[] {
  return specs.map((spec, i) => {
    const existing = prev[i];
    if (existing && prevHardeners[i]?.moduleId === spec.moduleId) return existing;
    return { timer: spec.cycleTime, online: true, needsPayment: true, starved: false, heatHp: MODULE_HEAT_HITPOINTS, burned: false };
  });
}

function mergePool(current: number, prevMax: number, newMax: number): number {
  if (prevMax <= 0) return newMax;
  return clampPool(current, newMax);
}

function createRepairerStates(specs: readonly RepairerSpec[], activation: readonly RepairerActivationEntry[]): RepairerState[] {
  return specs.map((spec, i) => {
    const saved = activation[i];
    return {
      cycleTimer: 0,
      inCycle: false,
      ancillaryCharges: spec.ancillary ? spec.ancillary.shots : 0,
      reloading: false,
      reloadTimer: 0,
      active: saved?.active ?? true,
      overloaded: saved?.overloaded ?? true,
      hpThisCycle: 0,
      starved: false,
      heatHp: MODULE_HEAT_HITPOINTS,
      burned: false,
    };
  });
}

function createRahState(rahSpec: RahSpec, activation: RahActivationEntry | undefined): RahState {
  return {
    resists: { ...rahSpec.baseResists },
    cycleTimer: 0,
    inCycle: false,
    active: activation?.active ?? true,
    overloaded: activation?.overloaded ?? true,
    starved: false,
    armorDamageAccumulator: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  };
}

function mergeRahState(prev: RahState | undefined, rahSpec: RahSpec, activation: RahActivationEntry | undefined): RahState {
  if (!prev) return createRahState(rahSpec, activation);
  const active = activation?.active ?? prev.active;
  const overloaded = activation?.overloaded ?? prev.overloaded;
  if (!prev.active && active) return createRahState(rahSpec, { active: true, overloaded });
  return {
    resists: { ...prev.resists },
    cycleTimer: prev.cycleTimer,
    inCycle: prev.inCycle,
    active,
    overloaded,
    starved: prev.starved,
    armorDamageAccumulator: { ...prev.armorDamageAccumulator },
  };
}

function mergeRepairerStates(prevSpecs: readonly RepairerSpec[], prev: RepairerState[], specs: readonly RepairerSpec[], activation: readonly RepairerActivationEntry[]): RepairerState[] {
  return specs.map((spec, i) => {
    const existing = prev[i];
    const saved = activation[i];
    if (existing && prevSpecs[i]?.moduleId === spec.moduleId) return { ...existing, active: saved?.active ?? existing.active, overloaded: saved?.overloaded ?? existing.overloaded };
    return {
      cycleTimer: 0,
      inCycle: false,
      ancillaryCharges: spec.ancillary ? spec.ancillary.shots : 0,
      reloading: false,
      reloadTimer: 0,
      active: saved?.active ?? true,
      overloaded: saved?.overloaded ?? true,
      hpThisCycle: 0,
      starved: false,
      heatHp: MODULE_HEAT_HITPOINTS,
      burned: false,
    };
  });
}

function clampPool(current: number, max: number): number {
  if (current > max) return max;
  if (current < 0) return 0;
  return current;
}

function applyEffectiveMaxes(pools: SidePools): void {
  const shieldMax = pools.shieldMaxBase * pools.bursts.shieldHp;
  const armorMax = pools.armorMaxBase * pools.bursts.armorHp;
  if (pools.shield > shieldMax) pools.shield = shieldMax;
  if (pools.armor > armorMax) pools.armor = armorMax;
  pools.shieldMax = shieldMax;
  pools.armorMax = armorMax;
}

function updateAppliedResists(pools: SidePools, stacking: StackingPenalty): void {
  const shield = layerAppliedResists(pools, "shield", stacking);
  const armor = layerAppliedResists(pools, "armor", stacking);
  const hull = layerAppliedResists(pools, "hull", stacking);
  pools.resists = {
    shield,
    armor: pools.rahState && pools.rahState.active ? computeLiveArmorResists(armor, pools.rahState.resists) : armor,
    hull,
  };
}

function layerAppliedResists(pools: SidePools, layer: DefenseLayer, stacking: StackingPenalty): DamageResists {
  const result: Record<DamageType, number> = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  const burstResonance = layer === "shield" ? pools.bursts.shieldResonance : layer === "armor" ? pools.bursts.armorResonance : 1;
  for (const type of DAMAGE_TYPES) {
    const hardenerResonances = pools.hardeners.flatMap((hardener, i) => (pools.hardenerStates[i]?.online ? [hardenerResonance(hardener, type, pools.overloaded)] : []));
    const stacked = stacking.apply([...hardenerResonances, burstResonance]);
    result[type] = clampResist(1 - (1 - pools.baseResists[layer][type]) * stacked);
  }
  return result;
}

function hardenerResonance(hardener: ActiveHardenerSpec, type: DamageType, overloaded: boolean): number {
  const bonus = overloaded ? hardener.resistBonus[type] * hardener.overloadBonusMultiplier : hardener.resistBonus[type];
  return 1 - bonus;
}

function stepHardeners(pools: SidePools, dt: number, side: Side, capacitor: CapacitorGate | undefined): void {
  for (let i = 0; i < pools.hardeners.length; i++) {
    stepHardener(dt, side, pools.hardeners[i], pools.hardenerStates[i], capacitor);
  }
}

function stepHardener(dt: number, side: Side, spec: ActiveHardenerSpec, state: HardenerState, capacitor: CapacitorGate | undefined): void {
  if (state.burned) {
    state.online = false;
    return;
  }
  if (state.online) {
    if (state.needsPayment && !payHardener(side, spec, state, capacitor)) return;
    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer += spec.cycleTime;
      state.needsPayment = true;
      if (spec.heatDamage !== undefined && spec.heatDamage > 0) applyModuleHeat(spec.heatDamage, state);
    }
  } else if (payHardener(side, spec, state, capacitor)) {
    state.timer = spec.cycleTime;
  }
}

/** Applies heat damage to a module state pool; burnout is permanent for the rest of the engagement. */
function applyModuleHeat(heatDamage: number, state: { heatHp: number; burned: boolean }): void {
  state.heatHp -= heatDamage;
  if (state.heatHp <= 0) state.burned = true;
}

function payHardener(side: Side, spec: ActiveHardenerSpec, state: HardenerState, capacitor: CapacitorGate | undefined): boolean {
  if (capacitor && spec.capacitorNeed > 0 && !capacitor.attemptDebit(side, spec.capacitorNeed, spec.moduleId)) {
    state.online = false;
    state.starved = true;
    state.needsPayment = true;
    return false;
  }
  state.online = true;
  state.starved = false;
  state.needsPayment = false;
  return true;
}

function computeLiveArmorResists(baseResists: DamageResists, rahResists: DamageResists): DamageResists {
  return {
    em: clampResist(1 - (1 - baseResists.em) * (1 - rahResists.em)),
    thermal: clampResist(1 - (1 - baseResists.thermal) * (1 - rahResists.thermal)),
    kinetic: clampResist(1 - (1 - baseResists.kinetic) * (1 - rahResists.kinetic)),
    explosive: clampResist(1 - (1 - baseResists.explosive) * (1 - rahResists.explosive)),
  };
}

function applyShieldRegen(pools: SidePools, dt: number): void {
  if (pools.shieldRechargeTime <= 0 || pools.shieldMax <= 0) return;
  if (pools.shield >= pools.shieldMax || pools.shield <= 0) return;
  pools.shield = shieldCapacityAfter(pools.shield, pools.shieldMax, pools.shieldRechargeTime, dt);
  if (pools.shield > pools.shieldMax) pools.shield = pools.shieldMax;
}

function shieldCapacityAfter(current: number, max: number, rechargeTime: number, dt: number): number {
  const ratio = current / max;
  const exponent = Math.exp(-5 * dt / rechargeTime);
  const factor = 1 + exponent * (Math.sqrt(ratio) - 1);
  return max * factor * factor;
}

function shieldRegenRate(pools: SidePools): number {
  if (pools.shieldRechargeTime <= 0 || pools.shieldMax <= 0) return 0;
  if (pools.shield >= pools.shieldMax || pools.shield <= 0) return 0;
  const sqrtRatio = Math.sqrt(pools.shield / pools.shieldMax);
  return (10 * pools.shieldMax / pools.shieldRechargeTime) * sqrtRatio * (1 - sqrtRatio);
}

function applyEvents(pools: SidePools, events: readonly DamageEvent[]): MutableDamageVector {
  const armorDamageByType: MutableDamageVector = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  for (const event of events) {
    for (const type of DAMAGE_TYPES) {
      const rawDamage = event.rawByType[type];
      if (rawDamage <= 0) continue;
      armorDamageByType[type] += applyDamageType(pools, type, rawDamage);
    }
  }
  return armorDamageByType;
}

function applyDamageType(pools: SidePools, type: DamageType, rawDamage: number): number {
  let remaining = rawDamage;
  if (pools.shield > 0) {
    const bleedRaw = remaining * shieldBleedFraction(pools);
    const towardShield = remaining - bleedRaw;
    const shield = applyLayer(pools.shield, towardShield, pools.resists.shield[type]);
    pools.shield -= shield.absorbed;
    accumulateInflicted(pools.inflicted, "shield", shield.absorbed);
    remaining = bleedRaw + shield.outgoingRaw;
  }
  if (remaining <= 0) return 0;
  let armorAbsorbed = 0;
  if (pools.armor > 0) {
    const armor = applyLayer(pools.armor, remaining, pools.resists.armor[type]);
    pools.armor -= armor.absorbed;
    accumulateInflicted(pools.inflicted, "armor", armor.absorbed);
    armorAbsorbed = armor.absorbed;
    remaining = armor.outgoingRaw;
  }
  if (remaining <= 0) return armorAbsorbed;
  const hull = applyLayer(Number.POSITIVE_INFINITY, remaining, pools.resists.hull[type]);
  pools.hull -= hull.absorbed;
  accumulateInflicted(pools.inflicted, "hull", hull.absorbed);
  return armorAbsorbed;
}

interface LayerAbsorption {
  readonly absorbed: number;
  readonly outgoingRaw: number;
}

function applyLayer(pool: number, incomingRaw: number, resist: number): LayerAbsorption {
  const multiplier = 1 - resist;
  if (multiplier <= 0) return { absorbed: 0, outgoingRaw: incomingRaw };
  const absorbed = Math.min(pool, incomingRaw * multiplier);
  return { absorbed, outgoingRaw: incomingRaw - absorbed / multiplier };
}

function accumulateInflicted(inflicted: MutableLayerDamage, layer: DefenseLayer, amount: number): void {
  if (amount <= 0) return;
  inflicted[layer] += amount;
}

function shieldBleedFraction(pools: SidePools): number {
  if (pools.shieldUniformity <= 0 || pools.shieldMax <= 0) return 0;
  const threshold = pools.shieldUniformity * pools.shieldMax;
  if (pools.shield >= threshold) return 0;
  return 1 - pools.shield / threshold;
}

function stepRepairers(pools: SidePools, dt: number, side: Side, capacitor: CapacitorGate | undefined): void {
  for (let i = 0; i < pools.repairers.length; i++) {
    stepRepairer(pools, side, pools.repairers[i], pools.repairerStates[i], dt, capacitor);
  }
}

function stepRepairer(pools: SidePools, side: Side, spec: RepairerSpec, state: RepairerState, dt: number, capacitor: CapacitorGate | undefined): void {
  state.starved = false;
  if (state.burned) return;
  if (state.reloading) {
    state.reloadTimer -= dt;
    if (state.reloadTimer <= 0) {
      state.reloading = false;
      state.ancillaryCharges = spec.ancillary ? spec.ancillary.shots : 0;
      state.reloadTimer = 0;
    }
    return;
  }
  if (!state.inCycle && shouldStartCycle(pools, spec, state)) {
    startCycle(pools, side, spec, state, capacitor);
  }
  if (state.inCycle) {
    state.cycleTimer -= dt;
    if (state.cycleTimer <= 0) {
      completeCycle(pools, spec, state);
    }
  }
}

function shouldStartCycle(pools: SidePools, spec: RepairerSpec, state: RepairerState): boolean {
  if (pools.repairMode === "manual") return state.active;
  if (!state.active) return false;
  return layerPoolAmount(pools, spec.layer) < layerPoolMax(pools, spec.layer);
}

/** Command bursts shorten repair duration for the layer's repair systems (hull repairers are never boosted). */
function burstRepairMultiplier(bursts: BurstModifiers, layer: DefenseLayer): number {
  return layer === "shield" ? bursts.shieldRepair : layer === "armor" ? bursts.armorRepair : 1;
}

function startCycle(pools: SidePools, side: Side, spec: RepairerSpec, state: RepairerState, capacitor: CapacitorGate | undefined): void {
  const repairMultiplier = burstRepairMultiplier(pools.bursts, spec.layer);
  if (capacitor && spec.capacitorNeed > 0 && !capacitor.attemptDebit(side, spec.capacitorNeed * repairMultiplier, spec.moduleId)) {
    // Starved: the module stays off until the capacitor recovers; retried next frame.
    state.starved = true;
    return;
  }
  state.inCycle = true;
  state.cycleTimer = effectiveCycleTime(spec, state) * repairMultiplier;
  const amount = effectiveAmount(spec, state);
  const isCharged = spec.ancillary !== undefined && state.ancillaryCharges > 0;
  const healAmount = isCharged ? amount * spec.ancillary.chargeMultiplier : amount;
  state.hpThisCycle = healAmount;
  if (spec.layer === "shield") {
    applyHeal(pools, spec.layer, healAmount);
  }
  if (spec.ancillary !== undefined && isCharged) {
    state.ancillaryCharges -= 1;
  }
}

function completeCycle(pools: SidePools, spec: RepairerSpec, state: RepairerState): void {
  state.inCycle = false;
  state.cycleTimer = 0;
  if (spec.layer !== "shield") {
    applyHeal(pools, spec.layer, state.hpThisCycle);
  }
  state.hpThisCycle = 0;
  if (state.overloaded && spec.heatDamage > 0) applyModuleHeat(spec.heatDamage, state);
  if (spec.ancillary !== undefined && state.ancillaryCharges <= 0 && !state.reloading) {
    state.reloading = true;
    state.reloadTimer = spec.ancillary.reloadTime;
  }
}

function applyHeal(pools: SidePools, layer: DefenseLayer, amount: number): void {
  if (layer === "shield") {
    pools.shield = Math.min(pools.shield + amount, pools.shieldMax);
  } else if (layer === "armor") {
    pools.armor = Math.min(pools.armor + amount, pools.armorMax);
  } else {
    pools.hull = Math.min(pools.hull + amount, pools.hullMax);
  }
}

function effectiveCycleTime(spec: RepairerSpec, state: RepairerState): number {
  return state.overloaded ? spec.cycleTime * spec.overload.cycleTimeMultiplier : spec.cycleTime;
}

function effectiveAmount(spec: RepairerSpec, state: RepairerState): number {
  return state.overloaded ? spec.amount * spec.overload.amountMultiplier : spec.amount;
}

function layerPoolAmount(pools: SidePools, layer: DefenseLayer): number {
  if (layer === "shield") return pools.shield;
  if (layer === "armor") return pools.armor;
  return pools.hull;
}

function layerPoolMax(pools: SidePools, layer: DefenseLayer): number {
  if (layer === "shield") return pools.shieldMax;
  if (layer === "armor") return pools.armorMax;
  return pools.hullMax;
}

function stepRah(pools: SidePools, dt: number, armorDamageByType: MutableDamageVector, side: Side, capacitor: CapacitorGate | undefined): void {
  const rah = pools.rahState;
  const rahSpec = pools.rahSpec;
  if (!rah || !rahSpec) return;
  for (const type of DAMAGE_TYPES) {
    rah.armorDamageAccumulator[type] += armorDamageByType[type];
  }
  rah.starved = false;
  if (!rah.active) return;
  if (!rah.inCycle) {
    if (capacitor && (rahSpec.capacitorNeed ?? 0) > 0 && !capacitor.attemptDebit(side, rahSpec.capacitorNeed ?? 0, rahSpec.moduleId)) {
      // Starved: the module stays off until the capacitor recovers; retried next frame.
      rah.starved = true;
      return;
    }
    rah.inCycle = true;
    rah.cycleTimer = rahCycleTime(rahSpec, rah);
  }
  rah.cycleTimer -= dt;
  if (rah.cycleTimer <= 0) {
    shiftRahResists(rah, rahSpec);
    rah.cycleTimer = rahCycleTime(rahSpec, rah);
    rah.armorDamageAccumulator = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  }
}

function rahCycleTime(rahSpec: RahSpec, rah: RahState): number {
  return rah.overloaded ? rahSpec.cycleTime * rahSpec.overloadCycleTimeMultiplier : rahSpec.cycleTime;
}

const RAH_TIE_BREAK_ORDER: readonly DamageType[] = ["em", "explosive", "kinetic", "thermal"];

function shiftRahResists(rah: RahState, rahSpec: RahSpec): void {
  const damage = rah.armorDamageAccumulator;
  const totalDamage = damage.em + damage.thermal + damage.kinetic + damage.explosive;
  if (totalDamage <= 0) return;
  const shift = rahSpec.shiftAmount;
  const current: MutableDamageResists = { em: rah.resists.em, thermal: rah.resists.thermal, kinetic: rah.resists.kinetic, explosive: rah.resists.explosive };
  const damaged = DAMAGE_TYPES.filter((type) => damage[type] > 0);
  if (damaged.length === 1) {
    let shifted = 0;
    for (const type of DAMAGE_TYPES) {
      if (type === damaged[0]) continue;
      const drain = Math.min(shift, current[type]);
      current[type] -= drain;
      shifted += drain;
    }
    current[damaged[0]] += shifted;
  } else {
    const ranked = [...RAH_TIE_BREAK_ORDER].sort((a, b) => damage[a] - damage[b]);
    const drainLowest = Math.min(shift, current[ranked[0]]);
    const drainSecondLowest = Math.min(shift, current[ranked[1]]);
    current[ranked[0]] -= drainLowest;
    current[ranked[1]] -= drainSecondLowest;
    const gain = (drainLowest + drainSecondLowest) / 2;
    current[ranked[2]] += gain;
    current[ranked[3]] += gain;
  }
  rah.resists = current;
}

function hardenerViews(pools: SidePools): readonly HardenerViewState[] {
  return pools.hardeners.map((spec, i) => {
    const state = pools.hardenerStates[i];
    return {
      moduleId: spec.moduleId,
      layer: spec.layer,
      online: state.online,
      starved: state.starved,
      cycleProgress: state.online ? 1 - Math.max(state.timer, 0) / spec.cycleTime : 0,
      burned: state.burned || undefined,
    };
  });
}

function repairerViews(pools: SidePools): readonly RepairerViewState[] {
  return pools.repairers.map((spec, i) => {
    const state = pools.repairerStates[i];
    const cycleTime = effectiveCycleTime(spec, state) * burstRepairMultiplier(pools.bursts, spec.layer);
    const amount = effectiveAmount(spec, state);
    const isCharged = spec.ancillary !== undefined && state.ancillaryCharges > 0;
    const effectiveHp = isCharged ? amount * spec.ancillary.chargeMultiplier : amount;
    const hpPerSecond = state.active && !state.reloading && !state.burned ? effectiveHp / cycleTime : 0;
    return {
      layer: spec.layer,
      cycling: state.inCycle,
      cycleProgress: state.inCycle ? 1 - state.cycleTimer / cycleTime : 0,
      ancillaryCharges: spec.ancillary ? state.ancillaryCharges : undefined,
      reloading: state.reloading,
      active: state.active,
      overloaded: state.overloaded,
      hpPerSecond,
      starved: state.starved,
      burned: state.burned || undefined,
    };
  });
}

function rahView(pools: SidePools): RahViewState | undefined {
  const rah = pools.rahState;
  const rahSpec = pools.rahSpec;
  if (!rah || !rahSpec) return undefined;
  const cycleTime = rahCycleTime(rahSpec, rah);
  return {
    resists: { ...rah.resists },
    cycling: rah.inCycle && rah.active,
    cycleProgress: rah.inCycle && rah.active ? 1 - rah.cycleTimer / cycleTime : 0,
    active: rah.active,
    overloaded: rah.overloaded,
    starved: rah.starved,
  };
}

function poolPercentages(pools: SidePools): Readonly<Record<DefenseLayer, number>> {
  return {
    shield: pools.shieldMax > 0 ? pools.shield / pools.shieldMax : 1,
    armor: pools.armorMax > 0 ? pools.armor / pools.armorMax : 1,
    hull: pools.hullMax > 0 ? pools.hull / pools.hullMax : 1,
  };
}

function clampResist(resist: number): number {
  if (resist < 0) return 0;
  if (resist > 1) return 1;
  return resist;
}

function snapshotPools(pools: SidePools): SidePoolsSnapshot {
  return {
    shield: pools.shield, armor: pools.armor, hull: pools.hull,
    shieldMax: pools.shieldMax, armorMax: pools.armorMax, hullMax: pools.hullMax,
    shieldMaxBase: pools.shieldMaxBase, armorMaxBase: pools.armorMaxBase,
    shieldRechargeTime: pools.shieldRechargeTime,
    shieldUniformity: pools.shieldUniformity,
    baseResists: pools.baseResists,
    hardeners: pools.hardeners,
    hardenerStates: pools.hardenerStates.map(snapshotHardenerState),
    overloaded: pools.overloaded,
    resists: pools.resists,
    bursts: pools.bursts,
    dead: pools.dead, deadAt: pools.deadAt, damageEnabled: pools.damageEnabled,
    repairers: pools.repairers,
    repairerStates: pools.repairerStates.map(snapshotRepairerState),
    repairMode: pools.repairMode,
    rahSpec: pools.rahSpec,
    rahState: pools.rahState ? snapshotRahState(pools.rahState) : undefined,
    inflicted: { ...pools.inflicted },
  };
}

function materializePools(snapshot: SidePoolsSnapshot): SidePools {
  return {
    shield: snapshot.shield, armor: snapshot.armor, hull: snapshot.hull,
    shieldMax: snapshot.shieldMax, armorMax: snapshot.armorMax, hullMax: snapshot.hullMax,
    shieldMaxBase: snapshot.shieldMaxBase, armorMaxBase: snapshot.armorMaxBase,
    shieldRechargeTime: snapshot.shieldRechargeTime,
    shieldUniformity: snapshot.shieldUniformity,
    baseResists: snapshot.baseResists,
    hardeners: snapshot.hardeners,
    hardenerStates: snapshot.hardenerStates.map(materializeHardenerState),
    overloaded: snapshot.overloaded,
    resists: snapshot.resists,
    bursts: snapshot.bursts,
    dead: snapshot.dead, deadAt: snapshot.deadAt, damageEnabled: snapshot.damageEnabled,
    repairers: snapshot.repairers,
    repairerStates: snapshot.repairerStates.map(materializeRepairerState),
    repairMode: snapshot.repairMode,
    rahSpec: snapshot.rahSpec,
    rahState: snapshot.rahState ? materializeRahState(snapshot.rahState) : undefined,
    inflicted: { ...snapshot.inflicted },
  };
}

function snapshotHardenerState(state: HardenerState): HardenerStateSnapshot {
  return { timer: state.timer, online: state.online, needsPayment: state.needsPayment, starved: state.starved, heatHp: state.heatHp, burned: state.burned };
}

function materializeHardenerState(snapshot: HardenerStateSnapshot): HardenerState {
  return { timer: snapshot.timer, online: snapshot.online, needsPayment: snapshot.needsPayment, starved: snapshot.starved, heatHp: snapshot.heatHp, burned: snapshot.burned };
}

function snapshotRepairerState(state: RepairerState): RepairerStateSnapshot {
  return {
    cycleTimer: state.cycleTimer, inCycle: state.inCycle, ancillaryCharges: state.ancillaryCharges, reloading: state.reloading,
    reloadTimer: state.reloadTimer, active: state.active, overloaded: state.overloaded, hpThisCycle: state.hpThisCycle,
    heatHp: state.heatHp, burned: state.burned,
  };
}

function materializeRepairerState(snapshot: RepairerStateSnapshot): RepairerState {
  return {
    cycleTimer: snapshot.cycleTimer, inCycle: snapshot.inCycle, ancillaryCharges: snapshot.ancillaryCharges, reloading: snapshot.reloading,
    reloadTimer: snapshot.reloadTimer, active: snapshot.active, overloaded: snapshot.overloaded, hpThisCycle: snapshot.hpThisCycle, starved: false,
    heatHp: snapshot.heatHp, burned: snapshot.burned,
  };
}

function snapshotRahState(state: RahState): RahStateSnapshot {
  return {
    resists: { ...state.resists }, cycleTimer: state.cycleTimer, inCycle: state.inCycle,
    active: state.active, overloaded: state.overloaded, armorDamageAccumulator: { ...state.armorDamageAccumulator },
  };
}

function materializeRahState(snapshot: RahStateSnapshot): RahState {
  return {
    resists: { ...snapshot.resists }, cycleTimer: snapshot.cycleTimer, inCycle: snapshot.inCycle,
    active: snapshot.active, overloaded: snapshot.overloaded, starved: false, armorDamageAccumulator: { ...snapshot.armorDamageAccumulator },
  };
}

export { shiftRahResists as _shiftRahResists };
