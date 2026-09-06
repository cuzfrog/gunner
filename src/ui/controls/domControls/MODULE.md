---
no-new-exports:
  - domControls.ts
  - domControlsContract.ts
  - readoutPresenter.ts
  - module.ts
---

# domControls

The top-level controls facade and the readout presenter.

`DomControls` owns config orchestration: it wires side panels, controllers, and the `SimConfigSource`, and delegates per-frame readout rendering to `ReadoutPresenter`.

`ReadoutPresenter` owns per-frame readout rendering. Its constructor deps contain only view-only types: `ViewStream`, `EngagementReadout`, `EffectiveReadout`, `DefenseReadout` (a narrow interface without `spec` or `signaturePenalty`), `I18n`, and `now`. No config-capable types are injectable.

## Import gates

`readoutPresenter.ts` must not import any config-capable type:
- `SidePanel` or `SidePanelConfigSource` from `../sidePanel`
- `SimConfigSource` from `../session`
- `DefenseController` from `../defense` (use `DefenseReadout` instead)
- `Controls` or `ControlsCallbacks` from `../controlsContract`

These types are config-assembly scope only. A presenter that imports them can bypass the runtime/config invariant by reading config in a per-frame path.
