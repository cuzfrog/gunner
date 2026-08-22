# UI Style Guide

This guide defines the visual language of Gunner's web UI. Follow it when adding or changing any HTML/CSS/canvas rendering so styles stay consistent.

Sources of truth:

- `public/styles.css` — all DOM styling (single stylesheet, no inline styles except the slider `--fill` custom property)
- `public/index.html` — markup structure and class naming
- `src/ui/renderer.ts` `COLORS` — canvas palette (mirrors CSS tokens)

## Design identity

Gunner is an EVE Online tactical tool. The UI mimics EVE's cockpit/neocom aesthetic: dark "glass" panels floating over a black void, pale telemetry-like text, and restrained cold-cyan highlights that mark active/focused states. Light is feedback, not decoration: inactive content is muted, accent color is spent only on what matters.

Key principles inherited from EVE's design language:

- Dark, calm, dense-but-organized. Hierarchy comes from brightness, size, grouping, and placement — not expressive display type.
- Accents are concentrated signals (selected row, active control), never ambient glow.
- Sharp, instrument-like corners and thin 1px borders. No heavy shadows, no glossy effects.
- Numbers read as telemetry: monospace font, uppercase micro-labels.

## Design tokens

All colors are CSS custom properties on `:root`. Never hardcode hex/rgba values in CSS; always use `var(--token)`.

### Colors

| Token | Value | Role |
|---|---|---|
| `--bg-deep` | `#05080c` | Page background, canvas void |
| `--bg-panel` | `#101418` | Panels, popups, elevated surfaces |
| `--bg-inset` | `#0a0f14` | Inputs, buttons wells, hover rows |
| `--border-dim` | `rgba(92,203,203,.25)` | Default 1px borders everywhere |
| `--accent-teal` | `#5ccbcb` | Primary accent: focus, hover, attacker side, active values |
| `--accent-blue` | `#30b2e6` | Secondary accent: primary CTA button, hints, one footer column |
| `--accent-orange` | `#f67c0f` | Target side, toggled-on states (segmented/overload/tracking-unit), falloff ring |
| `--danger-red` | `#d81f27` | Errors, invalid input |
| `--optimal-green` | `#9cc954` | Optimal ring (canvas), hit chance >= 90% |
| `--warn-yellow` | `#fce447` | Warnings, unsaved profile state, transversal vector |
| `--text-primary` | `#e8eef0` | Body/values text |
| `--text-secondary` | `#9fb3b8` | Labels, subtitles, panel headings |
| `--text-dim` | `#5d7078` | Hints, placeholders, disabled text |

Semantic color mapping (used consistently across CSS and canvas):

- Attacker = teal, Target = orange.
- Good/optimal = green, caution = yellow, warning = orange, danger = red.
- Hit-chance color scale (see `hitChanceColor` in `controls.ts`): >=90% green, >=50% teal, >=25% yellow, >=5% orange, else red.

### Alpha variants of accents

Where a translucent accent is needed (glows, dim borders, scrollbar thumbs), hardcoding rgba is currently tolerated, e.g. `rgba(92, 203, 203, 0.35)`. Prefer adding a named token if the same alpha value appears more than twice.

### Typography

Three fonts, loaded once in `index.html`:

| Font | Use |
|---|---|
| `"Chakra Petch", sans-serif` | Headings (`h1`, panel `h2`, footer `h3`), buttons, toggle labels — militaristic display face |
| `"Saira", sans-serif` | Body base font, list item names, plain prose |
| `"Share Tech Mono", monospace` | All numeric/data values, inputs, telemetry, version text |

Type scale (do not invent sizes): 9–10px micro-labels/hints, 11px secondary labels, 12px small body/subtitle, 13px body/buttons, 14px base (`body`) and input values, 18px result values, 28px emphasized hit chance.

Label treatment pattern: uppercase + letter-spacing `0.05em` (labels) / `0.08em` (panel & footer headings) / `0.1em` (`h1`). Data values and hints reset this with `text-transform: none; letter-spacing: 0`.

### Geometry

- Border radius: `2px` everywhere (buttons, panels, inputs, sliders). Only avatars use `50%`.
- Borders: `1px solid var(--border-dim)` default. Side-accented panels use `border-left: 2px solid <side accent>`.
- Popup shadow: `0 4px 16px rgba(0,0,0,.45)`; upward-opening popups flip to `0 -4px 16px ...`.
- Z-index: popups overlay at `z-index: 30`; nothing else elevates.
- Panel padding `12px`; grid gaps `8px` (inner fields) / `10px` (results) / `14px` (main columns).

### Control heights

| Context | min-height |
|---|---|
| Compact toggles, triggers, gear/icon buttons | 22–24px |
| Panel inputs, selects | 28px |
| Profile bar controls | 30px |
| Main playback controls | 32px |

## Components

### Panels

`.panel` = flex column, `var(--bg-panel)` bg, 1px border, radius 2px, padding 12px. Side identity via `.attacker-panel` (teal left border) and `.target-panel` (orange left border); heading inherits the same accent. Headings are 12px uppercase Chakra Petch with bottom border.

### Buttons

Base recipe shared by all buttons: inset background, 1px dim border, radius 2px, Chakra Petch, pointer cursor.

Variants:

- Toggle group buttons (`.lang-toggle`, `.segmented-control`, `.skill-tuner`, `.tracking-unit-toggle`): 10–12px uppercase; active = accent border + accent text (teal in header, orange for sim-state toggles).
- Primary action (`.controls button.primary`): blue border/text.
- Icon-only buttons (`.fitting-trigger`, `.import-fitting-button`, `.propulsion-gear`): transparent bg, no border until contextual, dim icon that turns teal on hover, `line-height: 0` for svg alignment.
- Danger affordance (`.fitting-delete`): dim -> red on hover.

State rules: hover swaps border/text to teal unless the control uses an orange active state (then hover stays teal, active is orange). Disabled = `opacity` + `cursor: not-allowed` (or `pointer-events: none` for groups).

### Inputs

Panel inputs/selects: full width, inset bg, mono font 14px, centered text via `text-align-last` where appropriate. Number inputs hide spinners; unit suffixes use `.input-with-unit` + `.input-suffix` (absolute-positioned teal mono text). Selects replace native arrow with `--dropdown-arrow` SVG data-uri; disabled selects swap to `--dropdown-arrow-disabled`.

Validation: `.hull-invalid` / `.error` classes apply `--danger-red`.

### Popups

Anchored dropdowns (`.fitting-popup`, `.ammo-popup`, `.skill-popup`, `.paste-popup`, `.import-side-popup`): absolute positioned `top: calc(100% + 4px)` relative to a `position: relative` parent, panel bg, 1px border, popup shadow, radius 2px, padding 6px, `z-index: 30`. Visibility is controlled by the `hidden` attribute plus the global `[hidden] { display: none }` rule. Scrollable lists style scrollbars: thin, teal-tinted thumb (`scrollbar-width: thin; scrollbar-color: rgba(92,203,203,.35) transparent` + webkit equivalents).

List entries: transparent-bg buttons, hover fills `var(--bg-inset)`, selected entry gets `border-left: 2px solid var(--accent-teal)` + teal text. Group labels (`.fitting-group-label`) are 10px uppercase Chakra Petch.

### Sliders

Custom-styled `input[type=range]`: 4px track filled via `linear-gradient(90deg, var(--accent-teal) var(--fill, 0%), var(--bg-inset) ...)`; JS sets `--fill` percentage (see `controls.ts`). Thumb: 12x16px panel-colored box with teal border and subtle teal glow. Firefox uses `::-moz-range-progress`. Hover moves thumb border to blue. Disabled: dim track/thumb, no glow.

### Result cards

`.result-card`: panel surface, centered, 10px uppercase label + mono value. The emphasized card (`.hit-chance`) gets a teal border, larger value, and JS-driven semantic color.

## Interaction & accessibility conventions

- Focus: always visible, never removed. Inner controls use `outline: 1px solid var(--accent-teal); outline-offset: -1px`; standalone links/outer triggers use `outline-offset: 2px`. New interactive elements must be added to the matching `:focus-visible` selector group.
- ARIA: popups follow the trigger pattern (`aria-haspopup`, `aria-expanded`, `aria-controls`); selection uses `aria-selected` / `aria-current="true"` (styled with the teal left-border treatment); toggles use `aria-pressed`.
- All user-facing strings go through i18n (`data-i18n*` attributes), including `title` and `aria-label`.
- Icons are inline `<svg><use href="icons.svg#...">` sprites with `fill="currentColor"` so they inherit text color; `display: block` inside buttons.

## Dynamic styling from TypeScript

Keep JS-side styling minimal and token-aligned:

- Class toggling only (`active`, `unsaved`, `invalid`, `error`, `hidden`) — all visual states live in CSS.
- Allowed exceptions: setting the `--fill` custom property on sliders, hit-chance semantic color, and canvas drawing colors from the `COLORS` const which must mirror the CSS tokens above.

## Layout & responsive

- Page: `.container` max-width 1400px centered. Main layout is a 3-column grid (attacker panel / canvas / target panel).
- Breakpoints: `1100px` (narrower columns), `900px` (single column, results become horizontal scroller), `480px` (single-column field rows and controls, footer stacks).
- Footer: 5-column info grid collapsing progressively across breakpoints.

## Checklist for new UI work

1. Reuse existing class names and component recipes before writing new CSS.
2. Colors only via tokens; fonts/sizes/radii/spacings from the scales above.
3. Accent discipline: teal for interaction/focus, orange for target/toggled-on, blue for primary CTA/hints, green/yellow/red strictly semantic.
4. Every interactive element: hover, focus-visible, disabled, and (if toggleable) active state styled.
5. Popups: hidden attribute, anchored positioning, shadow, z-index 30, ARIA wiring.
6. No inline styles in markup; dynamic state via classes or custom properties only.
7. Verify all three breakpoints after layout changes.
