---
no-new-exports:
  - lockStateHintProvider.ts
  - lockStateHintRenderer.ts
  - module.ts
  - index.ts
  - lockStateHintRenderer.test.ts
  - lockStateHintProvider.test.ts
---


# lockStateHint

Hover hint content provider for the lock state readout. Implements
`HintContentProvider` with key `"lockState"`. Renders the current
lock status (idle, locking, locked), lock progress percentage,
remaining lock time, base targeting range, and max locked targets
from the current `EngagementView.locks` and `ShipState.sensorSpec`.
The `inRange` flag on `LockState` already reflects the effective
(boosted + dampened) targeting range, so the out-of-range indicator
is accurate even when the displayed range is the base value.

The provider reads the current `EngagementView` from `ViewStore`
(implemented by `DomControls`) to obtain per-side `LockState` data.

Registration must happen after `registerHoverHintModule` and
`registerDomControlsModule` because the provider depends on the
hover hint controller singleton and the `ViewStore`.
