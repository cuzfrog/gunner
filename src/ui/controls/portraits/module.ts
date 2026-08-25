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
      i18n,
      shipASide,
      shipBSide,
    }) => new PortraitsControllerImpl({
      els: collectPortraitsEls(els),
      imageCatalog,
      ewarController,
      ewarResolver,
      combatantProfiles: { profile: (side: Side) => (side === "shipA" ? shipASide.profile : shipBSide.profile) },
      events: uiEvents,
      i18n,
    })).singleton(),
  });
}

function collectPortraitsEls(els: ControlsElements): PortraitsEls {
  const shipAImage = els.shipAPortrait.querySelector(".portrait-image");
  if (!shipAImage || !isHtmlImageElement(shipAImage)) {
    throw new Error("Missing .portrait-image in #ship-a-portrait");
  }
  const shipBImage = els.shipBPortrait.querySelector(".portrait-image");
  if (!shipBImage || !isHtmlImageElement(shipBImage)) throw new Error("Missing .portrait-image in #ship-b-portrait");
  const shipAEffects = els.shipAPortrait.querySelector<HTMLElement>(".portrait-effects");
  if (!shipAEffects) throw new Error("Missing .portrait-effects in #ship-a-portrait");
  const shipBEffects = els.shipBPortrait.querySelector<HTMLElement>(".portrait-effects");
  if (!shipBEffects) throw new Error("Missing .portrait-effects in #ship-b-portrait");
  return {
    shipA: els.shipAPortrait,
    shipB: els.shipBPortrait,
    shipAImage,
    shipBImage,
    shipAEffects,
    shipBEffects,
  };
}
