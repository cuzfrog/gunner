---
no-new-exports:
  - fakeDocument.ts
  - fakeElement.ts
  - mockFittings.ts
  - index.ts
---


# testing

Test-only fake DOM, mock domain services, and shared fixture data consumed by `*.test.ts` and `*.testSupport.ts` files. The public surface is `index.ts`; internal helpers are reached only through it. `mockTurretCatalog` provides a no-op `TurretCatalog` mock for controller tests. `mockLauncherCatalog` and `mockLauncherClasses` provide no-op mocks for the launcher class switching feature.
