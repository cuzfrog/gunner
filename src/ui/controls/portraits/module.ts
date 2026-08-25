import { asFunction, type AwilixContainer } from "awilix";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import { PortraitsControllerImpl } from "./portraitsController";
import type { PortraitsEls } from "./portraitsControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPortraitsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    portraitsController: asFunction(({ els, imageCatalog, ewarController, ewarResolver, uiEvents, attackerSide, targetSide }) => new PortraitsControllerImpl({
      els: collectPortraitsEls(els),
      imageCatalog,
      ewarController,
      ewarResolver,
      combatantProfiles: { profile: (side: Side) => (side === "attacker" ? attackerSide.profile : targetSide.profile) },
      events: uiEvents,
    })).singleton(),
  });
}

function collectPortraitsEls(els: ControlsElements): PortraitsEls {
  return {
    attacker: els.attackerPortrait,
    target: els.targetPortrait,
    attackerImage: els.attackerPortrait.querySelector(".portrait-image") as HTMLImageElement,
    targetImage: els.targetPortrait.querySelector(".portrait-image") as HTMLImageElement,
    attackerEffects: els.attackerPortrait.querySelector(".portrait-effects") as HTMLElement,
    targetEffects: els.targetPortrait.querySelector(".portrait-effects") as HTMLElement,
  };
}
