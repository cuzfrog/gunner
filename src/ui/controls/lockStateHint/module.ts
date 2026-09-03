import { asClass, asFunction, type AwilixContainer } from "awilix";
import type { ControlsCradle } from "../cradle";
import { LockStateHintProviderImpl } from "./lockStateHintProvider";
import { LockStateHintRendererImpl } from "./lockStateHintRenderer";

export function registerLockStateHintModule<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  cradle.register({
    lockStateHintRenderer: asFunction(({ i18n }) => new LockStateHintRendererImpl({ t: (key) => i18n.t(key) })).singleton(),
    lockStateHintProvider: asClass(LockStateHintProviderImpl).singleton(),
  });
}

export function wireLockStateHintProvider<T extends ControlsCradle>(cradle: AwilixContainer<T>): void {
  const c = cradle.cradle;
  c.hoverHintController.registerContentProvider("lockState", c.lockStateHintProvider);
}
