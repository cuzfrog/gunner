---
no-new-exports:
  - defenseController.ts
  - defenseController.test.ts
  - defenseControllerContract.ts
  - module.ts
  - index.ts
---


# defense

Defense field popup controller and effective-sig suffix UI.

`DefenseController` is the public abstraction and `registerDefenseModule` is exported for DI registration. The module owns its DOM collection through a private `collectDefenseEls` and subscribes to the shared `UiEvents.onFittingImported` channel to refresh the defense spec when a fitting is imported.
