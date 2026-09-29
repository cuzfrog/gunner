import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import type { SidePanel } from "../sidePanel";
import { TargetingControllerImpl } from "./targetingController";
import type { TargetingEls } from "./targetingControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;
type SigRadiusSource = { sigRadius(side: Side): number | undefined };

export function registerTargetingModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    targetingController: asFunction(({ els, popupGroup, i18n, uiEvents, sensorBoosterController, sensorBoosterResolver, shipASide, shipBSide }) => new TargetingControllerImpl({
      els: targetingEls(els), popupGroup, i18n, events: uiEvents, sensorBoosterController, resolver: sensorBoosterResolver, sigSource: sigRadiusSource(shipASide, shipBSide),
    })).singleton(),
  });
}

function targetingEls(els: ControlsElements): TargetingEls {
  return {
    shipA: els.shipA.targeting,
    shipB: els.shipB.targeting,
  };
}

function sigRadiusSource(shipASide: SidePanel, shipBSide: SidePanel): SigRadiusSource {
  return {
    sigRadius: (side) => {
      const sig = (side === "shipA" ? shipASide : shipBSide).capture().sig;
      return sig !== undefined && Number.isFinite(sig) && sig > 0 ? sig : undefined;
    },
  };
}
