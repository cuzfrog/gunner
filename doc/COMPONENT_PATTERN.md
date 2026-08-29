# Component Pattern

How to add UI to Gunner. Static markup lives in Astro components; dynamic DOM uses shared renderers; controllers subscribe-and-render.

## Decision table

| Adding | Component/renderer | Files to touch |
|---|---|---|
| Static UI (label, field, panel section) | `.astro` component under `src/components/<component>/` | Component file + `src/pages/index.astro` or parent component |
| Dynamic list (selectable items) | `SelectableListImpl` from `src/ui/controls/shared/` | Controller + element contract |
| Segmented control / choice group | `ChoiceGroupImpl` from `src/ui/controls/shared/` | Controller + element contract |
| Icon button (delete, details, close) | `IconActionImpl` from `src/ui/controls/shared/` | Controller; pass lazy `() => i18n.t(...)` for title/aria |
| Summary chip (icon + text) | `SummaryChipImpl` from `src/ui/controls/shared/` | Controller |
| Section block (heading + rows) | `SectionBlockImpl` from `src/ui/controls/shared/` | Controller |
| Popup | `createPopup` from `src/ui/controls/shared/` | Controller + popup group registration |
| Sprite icon | `spriteIcon` / `spriteIconStroked` from `src/ui/controls/shared/` | Controller |

## Astro component contract

- Props are pure data (strings, numbers, booleans); no callbacks or DOM elements.
- Element IDs must be declared in `src/ui/controls/elements/elementContract.ts`.
- i18n via `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, `data-i18n-title` attributes.
- CSS classes follow `doc/CSS_RULES.md` ownership rules.
- The parity test (`src/ui/controls/elements/parity.test.ts`) must stay green.

## Controller skeleton

```typescript
export class FooControllerImpl implements FooController {
  private readonly i18n: I18n;
  private readonly events: UiEvents;

  constructor(deps: { i18n: I18n; events: UiEvents; /* ... */ }) {
    this.i18n = deps.i18n;
    this.events = deps.events;
    this.events.onLanguageChanged(() => this.render());
  }

  render(): void {
    // synchronous render using this.i18n.t() and shared renderers
  }
}
```

- Controllers self-subscribe to `onLanguageChanged` and re-render.
- Render methods are synchronous; for lazy-loaded data, use placeholder-then-rerender (see `LazyItemNameCatalog`).
- Register in the module's `module.ts` via `asFunction(...).singleton()`.
- Implementation types are visible only to unit tests and `module.ts`.

## Lazy-loaded game data

Game data that is not needed at boot (non-English item-name packs) is dynamically imported on first access. The pattern:

1. Service owns a per-language cache (`Map<ShipNameLanguage, Pack>`).
2. Synchronous lookup returns a placeholder (id or empty array) on cache miss.
3. `ensureLoaded(language)` triggers a fire-and-forget dynamic import; `load(language)` returns a promise.
4. On load completion, the service fires `onItemNamesLoaded` (wired to `emitLanguageChanged`) so controllers rerender.
5. Tests inject a mock pack loader; never hit real dynamic imports.
