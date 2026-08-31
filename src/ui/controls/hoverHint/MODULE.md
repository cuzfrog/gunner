---
no-new-exports:
  - hoverHintController.ts
  - hoverHintControllerContract.ts
  - hintContentProvider.ts
  - module.ts
  - hoverHintController.test.ts
  - index.ts
---


# hoverHint

Singleton hover-hint controller. One `#hover-hint` element (declared in `elementContract.ts`, rendered inline in `src/layouts/Layout.astro`) is reused for every hint. The controller delegates `pointerover`/`pointerout`/`focusin`/`focusout` on `document` via an `AbortController`, toggles a `.hover-hint-anchor` class on the active anchor (which sets `anchor-name: --hover-hint-anchor`), fills the singleton, and shows it. Positioning is CSS Anchor Positioning (`position-anchor` + `@position-try` fallbacks); a feature-detected `position: fixed` + `getBoundingClientRect` branch covers engines without anchor positioning. Show is delayed (`showDelayMs`, default 400ms) on hover and immediate on focus. `aria-describedby` is wired from the anchor to the singleton (`role="tooltip"`) while shown, and the prior value is saved and restored on hide.

Content is rendered via composition. Anchors carry either `data-hint` (plain string, written to `textContent`) or `data-hint-content` (a key identifying a registered `HintContentProvider`). Providers are registered via `registerContentProvider(key, provider)`; the controller clears the hint element and delegates `render(anchor, container)` to the matching provider. On hide, the controller calls the provider's optional `hide?(anchor, container)` hook before clearing content, so providers can release subscriptions or node references. The structured content model belongs to each provider, not the controller.

Provider modules must register after `registerHoverHintModule` in `controls/module.ts`, since `registerContentProvider` requires the controller singleton to be resolvable.

i18n for static markup uses `data-i18n-hint` (resolved by `i18nImpl` into `data-hint`); dynamic controllers set `data-hint` directly and update it in their surgical update paths.
