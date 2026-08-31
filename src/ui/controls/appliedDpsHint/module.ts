import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { AppliedDpsHintProviderImpl } from "./appliedDpsHintProvider";
import { AppliedDpsHintRendererImpl } from "./appliedDpsHintRenderer";

export function registerAppliedDpsHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    appliedDpsHintRenderer: asFunction(({ i18n }) => new AppliedDpsHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    appliedDpsHintProvider: asClass(AppliedDpsHintProviderImpl).singleton(),
  });
}

export function wireAppliedDpsHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("appliedDps", c.appliedDpsHintProvider);
}
