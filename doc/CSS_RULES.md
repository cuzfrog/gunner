# CSS Rules

Rules for writing and changing DOM styling in Gunner. Derived from jareware/css-architecture, adapted to this repo: plain CSS (native nesting allowed, no preprocessor), stylesheets split under `public/styles/` and concatenated at build time, markup in `public/index.html` and TS-built DOM in `src/ui/controls/`.

Goals: component-oriented, sandboxed (local by default, global only by exception), convenient, safe.

## 1. Classes only

Never target IDs (e.g. `#legend`) in selectors; there is no case where an ID beats a class. Never target bare elements (`canvas`, `.footer h3`) except the global reset (`body`, `[hidden]`, `*`), the Layer 1 focus policy for `a, button, input, select`, and pseudo-elements of already-namespaced selectors. If you need to reach an element, give it a class.

Exception: `label[for=...]` associations and `input[type="range"]` pseudo-elements are fine when scoped under a namespaced class.

## 2. Every class is owned by a component

CSS has one global namespace. Every class name must start with its owning component's name, in kebab-case: `ammo-popup`, `ammo-item`, `ammo-item-name`. The component name maps strictly to its source location:

- Page shell regions (header, main grid, footer): `app-header`, `app-main`, `app-footer`, ...
- Controls: the directory under `src/ui/controls/<component>/` that builds them, e.g. `fitting-preview` belongs to `src/ui/controls/popup/`.

Just by reading a class in DevTools you must know which source owns it. A class with no obvious owner is a bug.

## 3. One component, its styles stay in its file

All rules for a component live in one file `public/styles/components/<component>.css`; shared base classes live in `public/styles/primitives.css`. File order matches DOM order in `index.html`. Do not scatter a component's rules across files, and do not sneak another component's styles into a file. If something deserves its own name (`ammo-item` inside the ammo popup), it is part of the `ammo` component's namespace, styled in that component's file.

## 4. States: ARIA first, then `is-` classes

Prefer semantic attributes for state styling: `[aria-expanded="true"]`, `[aria-pressed="true"]`, `[aria-current="true"]`, `:disabled`, `:focus-visible`. For purely visual state use a second class `is-<state>`, always combined with the namespaced class: `.slide-hints.is-exiting`. Never a bare `.active`, `.error`, `.disabled` — they collide globally.

## 5. Prevent leaking out of a component

A rule may only target selectors inside its own namespace. To position a child component from the parent (e.g. dock a popup), the parent may style the child's root class through a direct child combinator, and only with box-model properties: `display`, `position`, `margin`, `width`, `flex`, `z-index`, `gap`, alignment. Properties that cross the border (`padding`, `border`, `color`, `font`, `background`) belong to the child itself.

## 6. Prevent leaking into children

Do not rely on child internals: `.ammo-popup span` also hits markup added inside items later. Target classes, not elements; when you must target elements, use `>` so depth is bounded: `.ammo-item > img`. Deep chains (`> nav > p > a`) are acceptable inside one component because the sandbox bounds their blast radius — but prefer a class on the node instead.

## 7. Share patterns by composition, not selector groups

Repeated surfaces (popups, icon buttons, disclosure triggers, field labels) become shared base classes applied in markup next to the component class: `class="popup ammo-popup"`, `class="icon-button fitting-eye"`. Base classes carry the shared chrome; component classes carry specifics. Never bind shared styles through grouped selector lists like `.a button, .b button, .c button {}` — every new control would have to join every list.

Current base classes:

- `popup` (and `popup-below`, `popup-above`, `popup-left`, `popup-right`, `popup-scroll`)
- `menu-popup` (composition of `popup` for small `popup-item` lists)
- `popup-item`
- `trigger`
- `btn` (and `btn-panel`, `btn-primary-text`)
- `icon-button`
- `input-field`
- `field-label`
- `form-field`, `form-field-group`, `form-field-row`
- `form-slider`, `form-slider-field`, `form-slider-label-row`, `form-slider-value`
- `input-with-unit`, `input-suffix`
- `effective-value`
- `segmented-control`, `choice-selector`
- `overload-button`
- `mono`
- `truncate`
- `chevron`

## 8. Tokens only

All colors, z-index layers, shadows and fonts come from `:root` custom properties. Hex/rgba literals outside `:root` are forbidden (exceptions: `transparent`, `currentColor`). Alpha variants are tokens too (`--accent-teal-35`), do not re-inline them. Canvas palette lives in `src/ui/renderer.ts` `COLORS` and must mirror the tokens.

## 9. Inline styles are exceptions

The only sanctioned inline styles are: the slider `--fill` custom property (set from JS), and measured `left`/`top` positioning for the fitting preview popup. Animations, transforms, opacity, transitions belong in the stylesheet as `is-` state classes. If you write `el.style.<prop> = ...` for anything else, move it to CSS.

## 10. Specificity discipline

Keep selectors short: one or two classes, plus at most one state. Never use `!important` except the sanctioned `[hidden] { display: none !important }` utility. Never fight specificity with more specificity; if two rules compete, they violate sections 4-7 — fix the ownership instead.

## 11. Responsive: page concern first

Viewport breakpoints (1100px, 900px, 480px) belong to the page: their rules live in `public/styles/layout.css`, keeping the whole reflow map readable in one place. A rule describing how a component behaves when it itself runs out of room (hide its own label, floor its own slider width) belongs in that component's file instead — keyed off its container rather than the viewport where possible. Before adding any responsive rule, first attempt elimination with intrinsically adaptive CSS: flex wrapping and shrinking, grid `auto-fit`/`minmax()`, `clamp()`. Accept a responsive rule only when no fluid equivalent exists.

## Violations to watch for (agent checklist)

- `#id` selector or new bare element selector
- Class without a component prefix, or a prefix that maps to no source directory
- Bare state class (`.active`) or state class used without its namespace class
- Grouped selector list spanning multiple components
- Hex/rgba literal outside `:root`
- New inline style outside the sanctioned exceptions
- Rule placed outside its component's file
- Viewport media query outside `styles/layout.css` (component-owned constrained behavior excepted)
- A responsive rule with an existing fluid equivalent
