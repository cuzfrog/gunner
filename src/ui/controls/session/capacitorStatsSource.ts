import { type CapacitorDrainSources, type CapacitorStats, type FittingImport, type ImportedFitting } from "../../../fitting";
import { type BoostLoadout, type EwarLoadout, type MissileBoosterLoadout, type SensorBoostLoadout } from "../../../sim";
import type { SidePanelState } from "../sidePanel";
import type { Side } from "../side";
import type { UiEvents } from "../../events";
import type { StatConditions } from "../../../ships";

/**
 * Live capacitor preview stats: re-derives CapacitorStats from the imported fitting skeleton
 * plus the current user selections (propulsion module, ewar/booster loadouts, skills), so the
 * capacitor popup always matches what the runtime simulation would drain.
 */
export interface CapacitorStatsSource {
  stats(side: Side): CapacitorStats | undefined;
  /** Feeds the fitting skeleton for a side; used by the import event and the session-restore boundary. */
  register(side: Side, imported: ImportedFitting): void;
}

interface CapacitorStatsSourceDeps {
  readonly events: UiEvents;
  readonly fittingImport: FittingImport;
  readonly sides: Record<Side, PanelConfigSource>;
  readonly ewarController: EwarProjectionSource;
  readonly boosterController: BoostProjectionSource;
  readonly missileBoosterController: MissileBoostProjectionSource;
  readonly sensorBoosterController: SensorBoostProjectionSource;
}

interface PanelConfigSource {
  capture(): SidePanelState;
  skillConditions(): StatConditions;
}

interface EwarProjectionSource {
  projection(side: Side): { readonly loadout: EwarLoadout } | undefined;
}

interface BoostProjectionSource {
  projection(side: Side): { readonly loadout: BoostLoadout } | undefined;
}

interface MissileBoostProjectionSource {
  projection(side: Side): { readonly loadout: MissileBoosterLoadout } | undefined;
}

interface SensorBoostProjectionSource {
  projection(side: Side): { readonly loadout: SensorBoostLoadout } | undefined;
}

export class CapacitorStatsSourceImpl implements CapacitorStatsSource {
  private readonly imported: Record<Side, ImportedFitting | undefined> = { shipA: undefined, shipB: undefined };
  private readonly deps: CapacitorStatsSourceDeps;

  constructor(deps: CapacitorStatsSourceDeps) {
    this.deps = deps;
    deps.events.onFittingImported((side, imported) => this.register(side, imported));
  }

  stats(side: Side): CapacitorStats | undefined {
    const imported = this.imported[side];
    if (!imported) return undefined;
    const panel = this.deps.sides[side];
    return this.deps.fittingImport.resolveCapacitorStats(imported, panel.skillConditions(), this.drainSources(side, imported, panel.capture()));
  }

  register(side: Side, imported: ImportedFitting): void {
    this.imported[side] = imported;
  }

  private drainSources(side: Side, imported: ImportedFitting, state: SidePanelState): CapacitorDrainSources {
    return {
      defense: imported.defense,
      turrets: imported.turrets ?? [],
      ewar: this.deps.ewarController.projection(side)?.loadout ?? imported.ewar,
      boosts: this.deps.boosterController.projection(side)?.loadout ?? imported.boosts,
      missileBoosts: this.deps.missileBoosterController.projection(side)?.loadout ?? imported.missileBoosts,
      sensorBoosts: this.deps.sensorBoosterController.projection(side)?.loadout ?? imported.sensorBoosts,
      // The summary keeps propulsionModuleId after toggle-off as variant-selection memory; a drain requires an active module.
      propulsionModuleId: state.fittedHull?.propulsionId !== undefined ? state.fittedHull.propulsionModuleId : undefined,
    };
  }
}
