import { type AwilixContainer } from "awilix";
import type { AppstateCradle } from "..";

export function registerProfileTextModule<T extends AppstateCradle>(_cradle: AwilixContainer<T>): void {
  // Pure functions (parseProfile, serializeProfile) are exported from index.ts; no DI wiring required.
}
