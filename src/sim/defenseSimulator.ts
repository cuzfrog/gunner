import { type DamageEvent, type DamageProjection, type DamageResists, type DamageType, type DamageVector, type DefenseLayer, type DefenseSpec, type RahSpec, type RepairerSpec, type Side, DAMAGE_TYPES, ZERO_RESISTS, damageVectorScale } from "./types";

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
}

export interface RahViewState {
  readonly resists: DamageResists;
  readonly cycling: boolean;
  readonly cycleProgress: number;
  readonly active: boolean;
  readonly overloaded: boolean;
}

export interface DefenseView {
  readonly pools: Record<Side, DefensePoolState>;
  readonly poolPercentages: Record<Side, Readonly<Record<DefenseLayer, number>>>;
  readonly dead: Record<Side, boolean>;
  readonly deadAt: Record<Side, number | undefined>;
  readonly damageEnabled: Record<Side, boolean>;
  readonly shieldRegenPerSecond: Record<Side, number>;
  readonly repairers: Record<Side, readonly RepairerViewState[]>;
  readonly repairMode: Record<Side, RepairMode>;
  readonly rah: Record<Side, RahViewState | undefined>;
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
}

export interface DefenseSimulator {
  reset(config: DefenseSimConfig): void;
  update(config: DefenseSimConfig): void;
  step(dt: number, events: readonly DamageEvent[]): void;
  view(): DefenseView;
  setDamageEnabled(side: Side, enabled: boolean): void;
  setRepairMode(side: Side, mode: RepairMode): void;
  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void;
  setRahActivation(side: Side, active: boolean, overloaded: boolean): void;
  project(incomingByTarget: Record<Side, DamageVector>, horizonSeconds: number): Record<Side, DamageProjection>;
}

const RAH_TOTAL_BUDGET = 0.6;

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
}

interface RahState {
  resists: MutableDamageResists;
  cycleTimer: number;
  inCycle: boolean;
  active: boolean;
  overloaded: boolean;
  armorDamageAccumulator: MutableDamageVector;
}

interface SidePools {
  shield: number;
  armor: number;
  hull: number;
  shieldMax: number;
  armorMax: number;
  hullMax: number;
  shieldRechargeTime: number;
  shieldUniformity: number;
  baseArmorResists: DamageResists;
  resists: Readonly<Record<DefenseLayer, Readonly<Record<DamageType, number>>>>;
  dead: boolean;
  deadAt: number | undefined;
  damageEnabled: boolean;
  repairers: readonly RepairerSpec[];
  repairerStates: RepairerState[];
  repairMode: RepairMode;
  rahSpec: RahSpec | undefined;
  rahState: RahState | undefined;
}

export class DefenseSimulatorImpl implements DefenseSimulator {
  private sides: Record<Side, SidePools> = { shipA: emptyPools(), shipB: emptyPools() };
  private time: number;
  private eventBuffer: DamageEvent[];
  private nextTickBoundary: number;

  constructor() {
    this.time = 0;
    this.eventBuffer = [];
    this.nextTickBoundary = 1;
  }

  reset(config: DefenseSimConfig): void {
    this.sides = {
      shipA: poolsFromSpec(config.shipA, config.damageEnabled.shipA, config.repairMode.shipA, config.repairerActivation.shipA, config.rahActivation.shipA),
      shipB: poolsFromSpec(config.shipB, config.damageEnabled.shipB, config.repairMode.shipB, config.repairerActivation.shipB, config.rahActivation.shipB),
    };
    this.time = 0;
    this.eventBuffer = [];
    this.nextTickBoundary = 1;
  }

  update(config: DefenseSimConfig): void {
    this.sides = {
      shipA: mergePools(this.sides.shipA, config.shipA, config.damageEnabled.shipA, config.repairMode.shipA, config.repairerActivation.shipA, config.rahActivation.shipA),
      shipB: mergePools(this.sides.shipB, config.shipB, config.damageEnabled.shipB, config.repairMode.shipB, config.repairerActivation.shipB, config.rahActivation.shipB),
    };
  }

  step(dt: number, events: readonly DamageEvent[]): void {
    this.time += dt;
    for (const event of events) {
      this.eventBuffer.push(event);
    }
    const released = this.collectReleasedEvents();
    this.stepSide("shipA", dt, released.shipA);
    this.stepSide("shipB", dt, released.shipB);
  }

  view(): DefenseView {
    return {
      pools: {
        shipA: { shield: this.sides.shipA.shield, armor: this.sides.shipA.armor, hull: this.sides.shipA.hull },
        shipB: { shield: this.sides.shipB.shield, armor: this.sides.shipB.armor, hull: this.sides.shipB.hull },
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
    };
  }

  setDamageEnabled(side: Side, enabled: boolean): void {
    this.sides[side].damageEnabled = enabled;
  }

  setRepairMode(side: Side, mode: RepairMode): void {
    this.sides[side].repairMode = mode;
  }

  setRepairerActivation(side: Side, index: number, active: boolean, overloaded: boolean): void {
    const state = this.sides[side].repairerStates[index];
    if (!state) return;
    state.active = active;
    state.overloaded = overloaded;
  }

  setRahActivation(side: Side, active: boolean, overloaded: boolean): void {
    const rah = this.sides[side].rahState;
    const rahSpec = this.sides[side].rahSpec;
    if (!rah) return;
    if (!rah.active && active && rahSpec) {
      rah.resists = { ...rahSpec.baseResists };
      rah.armorDamageAccumulator = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
      rah.cycleTimer = 0;
      rah.inCycle = false;
    }
    rah.active = active;
    rah.overloaded = overloaded;
  }

  project(incomingByTarget: Record<Side, DamageVector>, horizonSeconds: number): Record<Side, DamageProjection> {
    const cloneA = clonePools(this.sides.shipA);
    const cloneB = clonePools(this.sides.shipB);
    const events: DamageEvent[] = [];
    const incomingA = incomingByTarget.shipA;
    if (incomingA.em > 0 || incomingA.thermal > 0 || incomingA.kinetic > 0 || incomingA.explosive > 0) {
      events.push({ target: "shipA", source: "shipB", weaponIndex: 0, kind: "turret", rawByType: damageVectorScale(incomingA, horizonSeconds) });
    }
    const incomingB = incomingByTarget.shipB;
    if (incomingB.em > 0 || incomingB.thermal > 0 || incomingB.kinetic > 0 || incomingB.explosive > 0) {
      events.push({ target: "shipB", source: "shipA", weaponIndex: 0, kind: "turret", rawByType: damageVectorScale(incomingB, horizonSeconds) });
    }
    const projectionSides: Record<Side, SidePools> = { shipA: cloneA, shipB: cloneB };
    const inflicted = stepProjection(projectionSides, horizonSeconds, events, this.time);
    return { shipA: inflicted.shipA, shipB: inflicted.shipB };
  }

  private collectReleasedEvents(): Record<Side, readonly DamageEvent[]> {
    const shipAEvents: DamageEvent[] = [];
    const shipBEvents: DamageEvent[] = [];
    if (this.time >= this.nextTickBoundary) {
      for (const event of this.eventBuffer) {
        if (event.target === "shipA") shipAEvents.push(event);
        else shipBEvents.push(event);
      }
      this.eventBuffer = [];
      while (this.time >= this.nextTickBoundary) {
        this.nextTickBoundary += 1;
      }
    }
    return { shipA: shipAEvents, shipB: shipBEvents };
  }

  private stepSide(side: Side, dt: number, events: readonly DamageEvent[]): void {
    stepSidePools(this.sides[side], dt, events, this.time, emptyLayerDamage());
  }
}

function stepProjection(sides: Record<Side, SidePools>, dt: number, events: readonly DamageEvent[], time: number): Record<Side, DamageProjection> {
  const shipAEvents = events.filter((e) => e.target === "shipA");
  const shipBEvents = events.filter((e) => e.target === "shipB");
  const inflictedA = emptyLayerDamage();
  const inflictedB = emptyLayerDamage();
  stepSidePools(sides.shipA, dt, shipAEvents, time, inflictedA);
  stepSidePools(sides.shipB, dt, shipBEvents, time, inflictedB);
  return { shipA: projectionFromInflicted(inflictedA), shipB: projectionFromInflicted(inflictedB) };
}

function emptyLayerDamage(): MutableLayerDamage { return { shield: 0, armor: 0, hull: 0 }; }

function projectionFromInflicted(byLayer: MutableLayerDamage): DamageProjection {
  return { totalInflicted: byLayer.shield + byLayer.armor + byLayer.hull, byLayer: { shield: byLayer.shield, armor: byLayer.armor, hull: byLayer.hull } };
}

function stepSidePools(pools: SidePools, dt: number, events: readonly DamageEvent[], time: number, inflicted: MutableLayerDamage): void {
  if (pools.dead) return;
  if (!pools.damageEnabled) {
    pools.shield = pools.shieldMax;
    pools.armor = pools.armorMax;
    pools.hull = pools.hullMax;
    return;
  }
  updateRahResists(pools);
  applyShieldRegen(pools, dt);
  const armorDamageByType = applyEvents(pools, events, inflicted);
  stepRepairers(pools, dt);
  stepRah(pools, dt, armorDamageByType);
  if (pools.hullMax > 0 && pools.hull <= 0) {
    pools.hull = 0;
    pools.dead = true;
    pools.deadAt = time;
  }
}

function clonePools(pools: SidePools): SidePools {
  return {
    shield: pools.shield,
    armor: pools.armor,
    hull: pools.hull,
    shieldMax: pools.shieldMax,
    armorMax: pools.armorMax,
    hullMax: pools.hullMax,
    shieldRechargeTime: pools.shieldRechargeTime,
    shieldUniformity: pools.shieldUniformity,
    baseArmorResists: pools.baseArmorResists,
    resists: { shield: pools.resists.shield, armor: pools.resists.armor, hull: pools.resists.hull },
    dead: pools.dead,
    deadAt: pools.deadAt,
    damageEnabled: pools.damageEnabled,
    repairers: pools.repairers,
    repairerStates: pools.repairerStates.map((s) => ({ ...s })),
    repairMode: pools.repairMode,
    rahSpec: pools.rahSpec,
    rahState: pools.rahState ? { ...pools.rahState, resists: { ...pools.rahState.resists }, armorDamageAccumulator: { ...pools.rahState.armorDamageAccumulator } } : undefined,
  };
}

function emptyPools(): SidePools {
  return {
    shield: 0, armor: 0, hull: 0,
    shieldMax: 0, armorMax: 0, hullMax: 0,
    shieldRechargeTime: 0,
    shieldUniformity: 0,
    baseArmorResists: ZERO_RESISTS,
    resists: { shield: ZERO_RESISTS, armor: ZERO_RESISTS, hull: ZERO_RESISTS },
    dead: false, deadAt: undefined, damageEnabled: true,
    repairers: [], repairerStates: [],
    repairMode: "auto",
    rahSpec: undefined, rahState: undefined,
  };
}

function poolsFromSpec(spec: DefenseSpec, damageEnabled: boolean, repairMode: RepairMode, repairerActivation: readonly RepairerActivationEntry[], rahActivation: RahActivationEntry | undefined): SidePools {
  const armorResists = spec.layers.armor.resists;
  const rahSpec = spec.rah;
  const baseArmorResists = rahSpec ? rahSpec.armorResistsWithoutRah : armorResists;
  const rahState = rahSpec ? createRahState(rahSpec, rahActivation) : undefined;
  const liveArmorResists = rahState && rahState.active ? computeLiveArmorResists(baseArmorResists, rahState.resists) : armorResists;
  return {
    shield: spec.layers.shield.hp,
    armor: spec.layers.armor.hp,
    hull: spec.layers.hull.hp,
    shieldMax: spec.layers.shield.hp,
    armorMax: spec.layers.armor.hp,
    hullMax: spec.layers.hull.hp,
    shieldRechargeTime: spec.shieldRechargeTime,
    shieldUniformity: spec.shieldUniformity,
    baseArmorResists,
    resists: { shield: spec.layers.shield.resists, armor: liveArmorResists, hull: spec.layers.hull.resists },
    dead: false, deadAt: undefined, damageEnabled,
    repairers: spec.repairers,
    repairerStates: createRepairerStates(spec.repairers, repairerActivation),
    repairMode,
    rahSpec,
    rahState,
  };
}

function mergePools(prev: SidePools, spec: DefenseSpec, damageEnabled: boolean, repairMode: RepairMode, repairerActivation: readonly RepairerActivationEntry[], rahActivation: RahActivationEntry | undefined): SidePools {
  const armorResists = spec.layers.armor.resists;
  const rahSpec = spec.rah;
  const baseArmorResists = rahSpec ? rahSpec.armorResistsWithoutRah : armorResists;
  const rahState = rahSpec ? mergeRahState(prev.rahState, rahSpec, rahActivation) : undefined;
  const liveArmorResists = rahState && rahState.active ? computeLiveArmorResists(baseArmorResists, rahState.resists) : armorResists;
  const shieldMax = spec.layers.shield.hp;
  const armorMax = spec.layers.armor.hp;
  const hullMax = spec.layers.hull.hp;
  return {
    shield: mergePool(prev.shield, prev.shieldMax, shieldMax),
    armor: mergePool(prev.armor, prev.armorMax, armorMax),
    hull: mergePool(prev.hull, prev.hullMax, hullMax),
    shieldMax,
    armorMax,
    hullMax,
    shieldRechargeTime: spec.shieldRechargeTime,
    shieldUniformity: spec.shieldUniformity,
    baseArmorResists,
    resists: { shield: spec.layers.shield.resists, armor: liveArmorResists, hull: spec.layers.hull.resists },
    dead: prev.dead,
    deadAt: prev.deadAt,
    damageEnabled,
    repairers: spec.repairers,
    repairerStates: mergeRepairerStates(prev.repairerStates, spec.repairers, repairerActivation),
    repairMode,
    rahSpec,
    rahState,
  };
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
    armorDamageAccumulator: { em: 0, thermal: 0, kinetic: 0, explosive: 0 },
  };
}

function mergeRahState(prev: RahState | undefined, rahSpec: RahSpec, activation: RahActivationEntry | undefined): RahState {
  if (!prev) return createRahState(rahSpec, activation);
  return {
    resists: { ...prev.resists },
    cycleTimer: prev.cycleTimer,
    inCycle: prev.inCycle,
    active: activation?.active ?? prev.active,
    overloaded: activation?.overloaded ?? prev.overloaded,
    armorDamageAccumulator: { ...prev.armorDamageAccumulator },
  };
}

function mergeRepairerStates(prev: RepairerState[], specs: readonly RepairerSpec[], activation: readonly RepairerActivationEntry[]): RepairerState[] {
  return specs.map((spec, i) => {
    const existing = prev[i];
    if (existing) return { ...existing };
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
    };
  });
}

function clampPool(current: number, max: number): number {
  if (current > max) return max;
  if (current < 0) return 0;
  return current;
}

function updateRahResists(pools: SidePools): void {
  if (!pools.rahState || !pools.rahSpec) return;
  pools.resists = {
    ...pools.resists,
    armor: pools.rahState.active ? computeLiveArmorResists(pools.baseArmorResists, pools.rahState.resists) : pools.baseArmorResists,
  };
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
  if (pools.shield >= pools.shieldMax) return;
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

function applyEvents(pools: SidePools, events: readonly DamageEvent[], inflicted: MutableLayerDamage): MutableDamageVector {
  const armorDamageByType: MutableDamageVector = { em: 0, thermal: 0, kinetic: 0, explosive: 0 };
  for (const event of events) {
    for (const type of DAMAGE_TYPES) {
      const rawDamage = event.rawByType[type];
      if (rawDamage <= 0) continue;
      armorDamageByType[type] += applyDamageType(pools, type, rawDamage, inflicted);
    }
  }
  return armorDamageByType;
}

function applyDamageType(pools: SidePools, type: DamageType, rawDamage: number, inflicted: MutableLayerDamage): number {
  let remaining = rawDamage;
  if (pools.shield > 0) {
    const bleedFraction = shieldBleedFraction(pools);
    const bleedDamage = remaining * bleedFraction;
    const towardShield = remaining - bleedDamage;
    const shieldDamage = towardShield * (1 - pools.resists.shield[type]);
    const shieldAbsorbed = Math.min(pools.shield, shieldDamage);
    pools.shield -= shieldAbsorbed;
    accumulateInflicted(inflicted, "shield", shieldAbsorbed);
    remaining = bleedDamage + (shieldDamage - shieldAbsorbed);
  }
  if (remaining <= 0) return 0;
  let armorDamage = 0;
  if (pools.armor > 0) {
    armorDamage = remaining * (1 - pools.resists.armor[type]);
    const armorAbsorbed = Math.min(pools.armor, armorDamage);
    pools.armor -= armorAbsorbed;
    accumulateInflicted(inflicted, "armor", armorAbsorbed);
    const armorOverflow = armorDamage - armorAbsorbed;
    if (armorOverflow <= 0) return armorDamage;
    remaining = armorOverflow;
  }
  const hullDamage = remaining * (1 - pools.resists.hull[type]);
  pools.hull -= hullDamage;
  accumulateInflicted(inflicted, "hull", hullDamage);
  return armorDamage;
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

function stepRepairers(pools: SidePools, dt: number): void {
  for (let i = 0; i < pools.repairers.length; i++) {
    stepRepairer(pools, pools.repairers[i], pools.repairerStates[i], dt);
  }
}

function stepRepairer(pools: SidePools, spec: RepairerSpec, state: RepairerState, dt: number): void {
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
    startCycle(pools, spec, state);
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

function startCycle(pools: SidePools, spec: RepairerSpec, state: RepairerState): void {
  state.inCycle = true;
  state.cycleTimer = effectiveCycleTime(spec, state);
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

function stepRah(pools: SidePools, dt: number, armorDamageByType: MutableDamageVector): void {
  const rah = pools.rahState;
  const rahSpec = pools.rahSpec;
  if (!rah || !rahSpec) return;
  for (const type of DAMAGE_TYPES) {
    rah.armorDamageAccumulator[type] += armorDamageByType[type];
  }
  if (!rah.active) return;
  if (!rah.inCycle) {
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

function shiftRahResists(rah: RahState, rahSpec: RahSpec): void {
  const totalDamage = rah.armorDamageAccumulator.em + rah.armorDamageAccumulator.thermal + rah.armorDamageAccumulator.kinetic + rah.armorDamageAccumulator.explosive;
  if (totalDamage <= 0) return;
  const shift = rahSpec.shiftAmount;
  const current: Record<DamageType, number> = { em: rah.resists.em, thermal: rah.resists.thermal, kinetic: rah.resists.kinetic, explosive: rah.resists.explosive };
  const damageTypes: DamageType[] = [];
  for (const type of DAMAGE_TYPES) {
    if (rah.armorDamageAccumulator[type] > 0) damageTypes.push(type);
  }
  if (damageTypes.length === 0) return;
  const shiftPerType = shift / damageTypes.length;
  const nonDamageCount = DAMAGE_TYPES.length - damageTypes.length;
  for (const type of DAMAGE_TYPES) {
    if (rah.armorDamageAccumulator[type] > 0) {
      current[type] = Math.min(current[type] + shiftPerType, RAH_TOTAL_BUDGET);
    } else if (nonDamageCount > 0) {
      const decrease = shiftPerType / nonDamageCount;
      current[type] = Math.max(current[type] - decrease, 0);
    }
  }
  const sum = current.em + current.thermal + current.kinetic + current.explosive;
  if (sum > RAH_TOTAL_BUDGET) {
    const scale = RAH_TOTAL_BUDGET / sum;
    for (const type of DAMAGE_TYPES) current[type] *= scale;
  }
  rah.resists = { em: current.em, thermal: current.thermal, kinetic: current.kinetic, explosive: current.explosive };
}

function repairerViews(pools: SidePools): readonly RepairerViewState[] {
  return pools.repairers.map((spec, i) => {
    const state = pools.repairerStates[i];
    const cycleTime = effectiveCycleTime(spec, state);
    const amount = effectiveAmount(spec, state);
    const isCharged = spec.ancillary !== undefined && state.ancillaryCharges > 0;
    const effectiveHp = isCharged ? amount * spec.ancillary.chargeMultiplier : amount;
    const hpPerSecond = state.active && !state.reloading ? effectiveHp / cycleTime : 0;
    return {
      layer: spec.layer,
      cycling: state.inCycle,
      cycleProgress: state.inCycle ? 1 - state.cycleTimer / cycleTime : 0,
      ancillaryCharges: spec.ancillary ? state.ancillaryCharges : undefined,
      reloading: state.reloading,
      active: state.active,
      overloaded: state.overloaded,
      hpPerSecond,
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
