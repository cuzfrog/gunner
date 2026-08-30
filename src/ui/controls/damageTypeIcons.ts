import type { DamageType } from "../../fitting";

export const DAMAGE_TYPE_ORDER: readonly DamageType[] = ["em", "thermal", "kinetic", "explosive"];

export const DAMAGE_ICON_URLS: Readonly<Record<DamageType, string>> = {
  em: "images/icons/damage-em.png",
  thermal: "images/icons/damage-thermal.png",
  kinetic: "images/icons/damage-kinetic.png",
  explosive: "images/icons/damage-explosive.png",
};
