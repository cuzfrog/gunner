import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../controls";
import type { GunFamilies, LauncherClass, LauncherClasses } from "../../fitting";
import { SelectionSessionImpl } from "./selectionSession";
import type { SelectionSession } from "./selectionSession";
import { DimensionedSelectionImpl } from "./dimensionedSelection";
import { TurretDimensionKeyerImpl } from "./turretDimensionKeyer";
import { LauncherDimensionKeyerImpl } from "./launcherDimensionKeyer";
import { PropulsionDimensionKeyerImpl } from "./propulsionDimensionKeyer";
import type { DimensionedSelection } from "./dimensionedSelection";
import type { TurretDimension } from "./turretDimensionKeyer";
import type { PropulsionDimension } from "./propulsionDimensionKeyer";

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

export function createSelectionSession(): SelectionSession {
  return new SelectionSessionImpl();
}

export function createTurretSelection(session: SelectionSession, gunFamilies: GunFamilies): DimensionedSelection<TurretDimension> {
  return new DimensionedSelectionImpl(session, new TurretDimensionKeyerImpl(gunFamilies));
}

export function createLauncherSelection(session: SelectionSession, launcherClasses: LauncherClasses): DimensionedSelection<LauncherClass> {
  return new DimensionedSelectionImpl(session, new LauncherDimensionKeyerImpl(launcherClasses));
}

export function createPropulsionSelection(session: SelectionSession): DimensionedSelection<PropulsionDimension> {
  return new DimensionedSelectionImpl(session, new PropulsionDimensionKeyerImpl());
}
