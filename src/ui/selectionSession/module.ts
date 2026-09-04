import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle, Side } from "../controls";
import type { LauncherClass } from "../../fitting";
import { SelectionSessionImpl } from "./selectionSession";
import { DimensionedSelectionImpl } from "./dimensionedSelection";
import { TurretDimensionKeyerImpl } from "./turretDimensionKeyer";
import { LauncherDimensionKeyerImpl } from "./launcherDimensionKeyer";
import { PropulsionDimensionKeyerImpl } from "./propulsionDimensionKeyer";
import type { DimensionedSelection } from "./dimensionedSelection";
import type { TurretDimension } from "./turretDimensionKeyer";
import type { PropulsionDimension } from "./propulsionDimensionKeyer";

type SelectionSessionDeps = Pick<ControlsCradle, "gunFamilies" | "launcherClasses">;

export function registerSelectionSessionModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    shipASelectionSession: asClass(SelectionSessionImpl).singleton(),
    shipBSelectionSession: asClass(SelectionSessionImpl).singleton(),
    selectionSessionBySide: asFunction(({ shipASelectionSession, shipBSelectionSession }) => ({
      shipA: shipASelectionSession,
      shipB: shipBSelectionSession,
    })).singleton(),
  });
}

export function createTurretSelection(session: SelectionSessionImpl, deps: SelectionSessionDeps): DimensionedSelection<TurretDimension> {
  return new DimensionedSelectionImpl(session, new TurretDimensionKeyerImpl(deps.gunFamilies));
}

export function createLauncherSelection(session: SelectionSessionImpl, deps: SelectionSessionDeps): DimensionedSelection<LauncherClass> {
  return new DimensionedSelectionImpl(session, new LauncherDimensionKeyerImpl(deps.launcherClasses));
}

export function createPropulsionSelection(session: SelectionSessionImpl): DimensionedSelection<PropulsionDimension> {
  return new DimensionedSelectionImpl(session, new PropulsionDimensionKeyerImpl());
}
