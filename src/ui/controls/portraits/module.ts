import { asFunction, type AwilixContainer } from "awilix";
import { isHtmlImageElement } from "../controlsDom";
import type { createControlsEls } from "../elements";
import type { ControlsCradle } from "../cradle";
import type { Side } from "../side";
import { PortraitsControllerImpl } from "./portraitsController";
import type { PortraitsEls } from "./portraitsControllerContract";

type ControlsElements = ReturnType<typeof createControlsEls>;

export function registerPortraitsModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    portraitsController: asFunction(({
      els,
      imageCatalog,
      ewarController,
      ewarResolver,
      uiEvents,
      attackerSide,
      targetSide,
    }) => new PortraitsControllerImpl({
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
  const attackerImage = els.attackerPortrait.querySelector(".portrait-image");
  if (!attackerImage || !isHtmlImageElement(attackerImage)) {
    throw new Error("Missing .portrait-image in #attacker-portrait");
  }
  const targetImage = els.targetPortrait.querySelector(".portrait-image");
  if (!targetImage || !isHtmlImageElement(targetImage)) throw new Error("Missing .portrait-image in #target-portrait");
  const attackerEffects = els.attackerPortrait.querySelector(".portrait-effects");
  if (!attackerEffects) throw new Error("Missing .portrait-effects in #attacker-portrait");
  const targetEffects = els.targetPortrait.querySelector(".portrait-effects");
  if (!targetEffects) throw new Error("Missing .portrait-effects in #target-portrait");
  return {
    attacker: els.attackerPortrait,
    target: els.targetPortrait,
    attackerImage,
    targetImage,
    attackerEffects,
    targetEffects,
  };
}
