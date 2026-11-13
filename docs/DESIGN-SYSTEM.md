# Design system — "Industrial precision"

One page of art direction, then the tokens and rules that enforce it. Tokens live in
`src/styles/tokens.css`; components in `src/components/`; every token and component is on show at
`#/styleguide` (linked from About). `tests/unit/tokens.test.ts` fails the build when a rule here is broken.

## Art direction

**The idea.** Controls Academy should feel like a well-built control panel: a dark powder-coated
enclosure, machined edges, engraved legends, and pilot lights whose color always means something.
Nothing decorative that a panel builder wouldn't put on a door. The brand thread is the Caylor Made
"CM" circuit monogram: thin traces that turn 45°, ending in a round pad.

**Dark is the hero.** The dark theme is the one we design first and photograph. It is the panel with
the door closed in a dim plant: graphite surfaces, one blue signal color, state lights that glow.
Light theme is the same panel in daylight: same layout, same meanings, colors re-tuned for contrast.

**Five rules**
1. **Color is a signal, never decoration.** Green means energized or true. Amber means a warning or a
   force. Red means a fault. Safety yellow is only for safety notes. Blue is the brand and "selected".
   If a thing is not in one of those states, it is graphite, white or grey.
2. **Engraved, not printed.** Section labels are small, uppercase, widely spaced (like a legend plate).
   Numbers that are readings use tabular figures so they don't jiggle.
3. **Machined edges.** Hairline borders, small consistent radii, and depth from layered shadow plus a
   one-pixel top highlight. No heavy drop shadows, no glassy blur behind content.
4. **Traces, not ornaments.** The only flourish is the circuit trace: 45° turns, round pads, 2 px
   stroke, fading from blue to cyan. It appears in headers, empty states and the tab indicator.
5. **Motion lands like a contactor.** Fast in, a small settle, done. Things move because state changed.

## Palette

| Role | Token | Dark | Light |
|---|---|---|---|
| Page | `--bg` | `#0b0f14` | `#f4f7fb` |
| Page, deeper | `--bg-2` | `#080b10` | `#eaf0f7` |
| Card | `--surface` | `#121821` | `#ffffff` |
| Raised control | `--surface-raised` | `#1a2230` | `#eef3fa` |
| Well / readout | `--surface-sunk` | `#0e131a` | `#e8eef6` |
| Hairline | `--border` | `#253043` | `#d5deea` |
| Strong hairline | `--border-strong` | `#34425a` | `#b7c4d6` |
| Brand / selected | `--blue-glow` | `#3d8bff` | `#1958cc` |
| Brand fill (buttons) | `--blue-button` | `#1b63eb` | `#1b63eb` |
| Brand accent | `--cyan` | `#22d3ee` | `#0e7490` |
| Heading text | `--text-heading` | `#ffffff` | `#0b1220` |
| Body text | `--text-body` | `#c9d3e0` | `#26323f` |
| Muted text | `--text-muted` | `#9aa7b8` | `#556274` |
| **Live** (energized, true, done) | `--live` | `#3ddc97` | `#086a48` |
| **Warn** (forces, caution) | `--warn` | `#ffb547` | `#8a4b00` |
| **Fault** (alarms, wrong) | `--alarm` | `#ff6b6b` | `#bd2323` |
| **Safety** (safety notes only) | `--safety` | `#ffd60a` | `#7a5c00` |
| Dead (de-energized, false) | `--dead` | `#5b6a80` | `#8794a8` |

Each state color has a `-soft` tint for backgrounds; tinted chips and callouts sit on the page or on a card, never on a raised control (the contrast test checks those two). Text on every surface meets WCAG AA (4.5:1; 3:1
for large headings and for state colors used as non-text indicators). The token test checks the pairs.

## Type

Two families, both variable, self-hosted, subset to the characters we use (`assets-src/subset-fonts.sh`):

- **Montserrat** (headings, legends, the wordmark): geometric, a little wide, reads like an engraved
  nameplate in uppercase. Weights 700–800.
- **Inter** (everything else): built for small sizes on screens; tabular figures for readings.
- Code, tags and addresses use the device's monospace (`--font-mono`), so `Motor_Run` looks like code.

| Token | Size | Use |
|---|---|---|
| `--text-2xs` | 0.6875rem | legend plates, HUD captions |
| `--text-xs` | 0.75rem | captions, chips |
| `--text-sm` | 0.875rem | secondary text |
| `--text-base` | 1rem | body |
| `--text-lg` | 1.125rem | card titles |
| `--text-xl` | 1.375rem | section titles |
| `--text-2xl` | 1.625rem | page title (phone) |
| `--text-3xl` | 2rem | page title (tablet up) |

Body line height 1.55; headings 1.2. Never below 0.6875rem. The user's text-size setting scales the root.

## Icons

One style: 24 px grid, 1.75 px stroke, round caps and joins, no fills (except the play triangle).
All icons are hand-written SVG paths in `src/components/Icon.tsx`: no icon font, no downloaded set.
New icons follow the same grid and stroke; an icon is always paired with a text label or an `aria-label`.

## Shape and spacing

- **Spacing** is a 4 px grid: `--space-1` (4) … `--space-12` (48). Card padding 16 (phone) / 20 (wider).
- **Radii**: `--radius-xs` 6 (inner details), `--radius-sm` 10 (buttons, inputs), `--radius` 16 (cards),
  `--radius-lg` 22 (sheets), `--radius-pill`.
- **Touch targets** are at least 44 × 44 px (`--tap`).
- **Hairlines** are 1 px; focus rings are 3 px `--blue-glow` with a 2 px offset, on everything focusable.

## Depth

Four levels, used consistently. In dark mode depth comes mostly from a lighter surface and a top
highlight; shadows stay soft. In light mode shadows carry it.

| Level | Token | Used for |
|---|---|---|
| Sunk | `--elev-sunk` | readouts, meter display, input wells (inset shadow) |
| Flat | `--elev-0` | list rows inside a card (hairline only) |
| Raised | `--elev-1` | cards (contact shadow + ambient shadow + 1 px top highlight) |
| Floating | `--elev-2` | sticky bars, HUD chips, the recommended card (adds a brand glow) |
| Overlay | `--elev-3` | sheets, dialogs, toasts (over a `--scrim`) |

## Motion

One set of curves and times (tokens), used everywhere. Only `transform` and `opacity` animate.

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120 ms | press feedback, hover |
| `--dur` | 200 ms | fades, small moves |
| `--dur-slow` | 420 ms | sheets, crossfades, enter animations |
| `--dur-move` | 480 ms | the tab indicator, shared-element glides |
| `--ease` | ease-out curve | fades and exits |
| `--ease-spring` | sampled spring, slight overshoot | things that land: sheets, pills, pops |
| `--ease-bounce` | sampled spring, more overshoot | small celebrations only |

- Screen changes use the browser's View Transitions: the screen crossfades and a tapped card grows into
  the page it opens. Browsers without it get a short direction-aware fade.
- `prefers-reduced-motion` replaces all of it with instant changes. Nothing is conveyed by motion alone.
- 3D views open on a flat poster still and fade the live canvas in; they stop drawing when idle.

## Components

One way to do each thing, all in `src/components/`:
Button · Chip · Card · Sheet · Tabs/Segmented · Toast · ProgressRing · Skeleton · EmptyState ·
ErrorState · Stat · ListRow · Callout (tip / safety / gotcha).
Every one: 44 px minimum target, visible focus, keyboard operable, labelled for screen readers,
both themes. Feature code composes these; it does not restyle them with one-off values.

## What the tests enforce

- No raw hex or `rgb()` colors outside `tokens.css` (3D material colors live in the 3D material library,
  which is the one other allowed place).
- No raw pixel sizes in `app.css` and `motion.css` other than hairlines (0–3 px) and media-query
  breakpoints: sizes come from tokens.
- Every text/background token pair listed in the test meets AA in both themes.
- Posters, headings and routes stay in sync with the app (see `tests/unit/routes.test.ts`, `poster.test.ts`).

## Originality

All artwork is ours and procedural: icons, traces, schematics, 3D models and textures are code in this
repo. No vendor logos, no copied UI, no downloaded icon or 3D assets. Fonts are OFL-licensed (license
files ship in `public/fonts/`). See `docs/ASSETS.md`.
