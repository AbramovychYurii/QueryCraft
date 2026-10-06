# QueryCraft × coss ui — redesign handoff

Implementation brief for rebuilding the QueryCraft popup UI on [coss ui](https://coss.com/ui) (Base UI + Tailwind v4).
Written for Claude Code. Read this whole file before touching code, then work **one phase at a time** (§10).

- **Design canvas (source of truth for visuals):** https://claude.ai/code/artifact/6f586460-f2ba-49dd-a935-a47a810fbb3b — private; ask the owner for screenshots if you need to see it.
- **Mockup sources:** `docs/redesign/mockups/*.dc.html` — the canvas artboards as authored. They are **not runnable** (they need the canvas runtime) but every size, colour, copy string and state is written inline. Read them when this doc is ambiguous. `Main` = param list, `Overflow` = max-height states, `Settings`, `Saved`.
- **Branch:** work on `redesign/coss-ui` off `main`. The `DSL-beta` branch is out of scope.

---

## 1. Scope

| Area | Status | What to build |
|---|---|---|
| Param list (main view) | Designed | Full rebuild (§6.1) |
| Max-height behaviour, internal scroll, key Autocomplete | Designed | Full rebuild (§5, §6.2) |
| Settings sheet: accent + **theme preference (new)** | Designed | Full rebuild (§6.3) |
| Saved URLs sheet: list, row menu, save/edit form | Designed | Full rebuild (§6.4) |
| Command palette (⌘K) | Spec only, no mockup | Phase 6, §6.5 |
| Loading / unsupported / error states | Not designed | Interim: coss `Empty` with existing copy (§6.6) |
| JSON drill-down (`JsonStack/*`) | Not designed | Restyle with coss primitives only, keep behaviour (§6.6) |
| DSL filter builder, token/chip primitive | Not designed | **Out of scope** |

**Do not** add features beyond this doc. Where the doc proposes something new it is marked **(new)**; build only those.

## 2. Hard constraints

1. **Manifest V3 popup.** Width **380px**. Height = content height, **max 600px** (Chrome's cap). Height is set from JS by a `ResizeObserver` on the app container (§5.1).
2. **No remote resources.** No font CDNs, no inline `<script>` (MV3 CSP). Fonts are bundled (§3.3).
3. **Keep the domain layer.** `src/lib/*` (urlParser, paramTypes, structuredParam, storage, tabs, contrast, accents), `src/store/useAppStore.ts` and all hooks' public behaviour stay. Only the changes listed in §4.4, §4.5 and §8 touch them.
4. **WCAG 2.2 AA in both themes**: text 4.5:1, focus indicator and state indicators 3:1, targets ≥ 24×24, full keyboard paths, no hover-only controls.
5. **Header and action bar are flex items, never `position: sticky`.** Only the parameter list scrolls.
6. **Portaled popups** (Autocomplete, Combobox, Menu, Select, Tooltip, Command) must fit inside the popup viewport: collision-aware placement, capped height, internal scroll (§5.3).
7. `npm run build`, `npm run lint`, `npm test` must pass at the end of every phase.

## 3. Stack migration

### 3.1 Tailwind v4

```bash
npm i -D tailwindcss @tailwindcss/vite
```

Add `tailwindcss()` to `vite.config.ts` plugins (keep `react()` and `crx()`). Replace `src/styles/global.css` content with `@import "tailwindcss";` plus the coss and QueryCraft layers below. CSS Modules may live alongside Tailwind until each component is migrated; delete each `*.module.css` as its component moves over.

### 3.2 coss ui

`tsconfig.json` already has the `@/*` alias. Then:

```bash
npx shadcn@latest init               # Vite + React, Tailwind v4, css: src/styles/global.css, alias @/components
npx shadcn@latest add @coss/colors-neutral
npx shadcn@latest add @coss/button @coss/input @coss/input-group @coss/textarea @coss/group @coss/separator \
  @coss/badge @coss/kbd @coss/switch @coss/scroll-area @coss/autocomplete @coss/combobox @coss/menu \
  @coss/context-menu @coss/sheet @coss/field @coss/radio-group @coss/segmented-control @coss/collapsible \
  @coss/toast @coss/tooltip @coss/command @coss/dialog @coss/empty @coss/frame @coss/spinner
```

If a registry name fails, check it with `npx shadcn@latest view @coss/<name>` or the docs URL `https://coss.com/ui/docs/components/<name>`. Do **not** use `@coss/style`'s font setup: it targets Next.js (§3.3).

Components land in `src/components/ui/*`. That is now our code, and we edit it where §4.3 says so. Put `isolation: isolate` on `#root` (coss requirement for portals).

### 3.3 Fonts (bundled)

```bash
npm i @fontsource-variable/inter @fontsource/geist-mono
```

Import both in `src/popup/main.tsx`. Set `--font-sans: "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;` and `--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;`.

## 4. Theme layer

### 4.1 Density re-key (important)

coss switches to its compact desktop sizes at the `sm` breakpoint (≥ 640px). A 380px popup would otherwise get the touch sizes (36px buttons, 16px text). We always want desktop density inside the popup:

```css
@theme { --breakpoint-sm: 0rem; }
```

Touch hit-area expansion in coss is keyed on `pointer-coarse:`, so it is unaffected.

**Gotcha:** coss sets sizes under `sm:` (`sm:h-7`, `sm:text-sm`). When overriding a size on a coss component, prefix the override with `sm:` too (`sm:text-code`), or it loses to the component's own class.

### 4.2 QueryCraft overrides on top of coss tokens

Create `src/styles/theme.css` and import it after the coss tokens:

```css
@theme {
  --breakpoint-sm: 0rem;
  --text-code: 0.8125rem;              /* 13px — every monospace value/key/URL */
  --text-code--line-height: 1.25rem;   /* 20px */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
@theme inline {
  --color-key-foreground: var(--key-foreground);
  --color-segment-checked: var(--segment-checked);
}

/* AA patch layer — every value below exists because the coss default fails WCAG 2.2 AA */
:root {
  --ring: var(--color-neutral-500);        /* coss neutral-400 = 2.6:1 on white → 4.7:1 */
  --key-foreground: var(--foreground);     /* URL keys; overridden by the accent pipeline */
  --segment-checked: var(--background);
}
.dark {
  --ring: var(--color-neutral-400);        /* coss neutral-500: focused vs resting border only 3.1:1 → 5.7:1 */
  --muted-foreground: color-mix(in srgb, var(--color-neutral-500) 80%, var(--color-white));
                                           /* coss 90% mix (#818181) = 4.2–4.4:1 on muted/popover → #8f8f8f ≥ 4.8:1 */
  --segment-checked: --alpha(var(--color-white) / 8%);
}
```

Resulting values, for reference: light background `#ffffff`, foreground `#262626`, muted-foreground `#686868`. Dark background `#161616`, popover `#1b1b1b`, foreground `#f5f5f5`, muted-foreground `#8f8f8f`.

**Naming trap:** coss's `--accent` is the subtle *hover surface* (4% tint). It is **not** the user's "accent colour" setting. The user's accent maps onto `--primary` (§4.4). Keep the two apart in names and comments.

### 4.3 Edits to copied coss components (AA)

| File | Change | Why |
|---|---|---|
| `ui/input.tsx`, `ui/textarea.tsx` | `placeholder:text-muted-foreground/72` → `placeholder:text-muted-foreground` | /72 = 3.1:1 light, 2.9:1 dark |
| `ui/menu.tsx` (`MenuShortcut`), `ui/segmented-control` (unchecked item) | drop `/72` on `text-muted-foreground` | same failure |
| Highlightable items in `autocomplete`, `combobox`, `menu`, `context-menu`, `command` | add `data-highlighted:inset-ring data-highlighted:inset-ring-ring` next to `data-highlighted:bg-accent` | 4% tint alone = 1.1:1. Rule: *virtual focus looks like real focus* |
| `ui/segmented-control` checked state | add an inset 1px ring in `foreground/60` | checked fill alone = 1.1:1. Rule: *selected = foreground-tone outline, focused = `--ring`* |
| `ui/autocomplete.tsx` `AutocompletePopup` | replace the hard-coded `23rem` in `max-h-[min(var(--available-height),23rem)]` with `var(--popup-max-h,23rem)` | lets the popup cap itself at 12rem without forking |
| `ui/sheet.tsx` | add `density?: "default" \| "compact"`. Compact: header `px-4 py-3` with title `text-base`, panel `px-4 pt-1 pb-4`, footer `px-4 py-3` | coss sheets are sized for pages (p-6, text-xl) |

Each edit gets a one-line comment `// QueryCraft AA:` or `// QueryCraft density:`. These are upstream-PR candidates.

### 4.4 Accent pipeline (rewrite `useAccent`)

The accent setting overrides exactly three variables on `document.documentElement`:

| Variable | Value |
|---|---|
| `--primary` | exact swatch hex (button and switch match the swatch the user picked) |
| `--primary-foreground` | `readableOn(hex)`. All 10 current swatches resolve to `#0a0a0a` |
| `--key-foreground` | `adjustForContrast(hex, background)` ≥ 4.5:1, where background is `#ffffff` light / `#161616` dark |

- Mono (`null`) removes all three.
- `--ring` never follows the accent: focus must stay predictable and ≥ 3:1.
- Update `PANEL_BG` in `useAccent` (dark is now `#161616`, not `#262626`).
- The old `--color-accent*` variables go away with `tokens.css`.

Known limit: some accents as a filled *Switch track* in light theme are under 3:1 (Lime 2.3:1). Acceptable because the literal value (`true`) always sits beside the switch. Do not "fix" it by darkening the swatch.

### 4.5 Theme preference (new)

- **Type:** `type ThemePreference = 'system' | 'light' | 'dark'` (`src/types`). Default `'system'`.
- **Storage:**
  - Source of truth: `storage.getThemePreference/setThemePreference` in `src/lib/storage.ts`, key `themePreference`, with tests.
  - Mirror: `localStorage` keys `qc-theme` and `qc-accent`. The mirror exists only for the boot script.
- **Applying:**
  - `useTheme` returns `{ preference, resolved, setPreference }`.
  - It applies `class="dark"` on `<html>` (coss's dark variant), plus `style.colorScheme`.
  - It listens to `matchMedia` **only** while the preference is `'system'`.
  - Keep the existing `data-theme-switching` transition suppression.
- **No flash on open:** `chrome.storage` is async, so add `public/theme-boot.js`.
  - It reads the `localStorage` mirror synchronously.
  - It sets the `dark` class, `color-scheme` and the three accent variables before first paint.
  - Load it from `src/popup/index.html` `<head>` with `<script src="/theme-boot.js"></script>`, before the module script.
  - Wrap it in `try/catch`.

## 5. Layout, sizing, scrolling

### 5.1 Popup height

- `html` and `body`: width 380px, height auto.
- The app container is `flex flex-col max-h-[600px]` with natural height.
- In `main.tsx`, observe the app container. On each entry set `document.documentElement.style.height = document.body.style.height = Math.min(600, Math.ceil(entry.borderBoxSize[0].blockSize)) + 'px'`.
- **While a Sheet is open**, set the app container's `min-height` to the sheet content's natural height (capped at 600). Otherwise a sheet opened over a short view, e.g. an empty list, gets clipped. Measure the sheet popup with its own `ResizeObserver`.

### 5.2 Scroll model

```
header (flex-none)
main (flex-1 min-h-0, flex-col gap-3, px-4 py-3)
  URL editor (flex-none, max 4 lines, own internal scroll)
  filter (flex-none)
  section "Parameters" (flex-1 min-h-0, flex-col gap-2)
    section header (flex-none)
    ScrollArea scrollFade (flex-1 min-h-0)   ← the ONLY scrolling list
    Separator
    add row (flex-none, pinned)
footer action bar (flex-none)
```

- At 600px max the list viewport is ~241px (~7 rows).
- **Focus never hidden.** On the ScrollArea viewport set `scroll-padding-block: 1.5rem`, the same as coss's `--fade-size`. A row focused by Tab then always lands fully above or below the scroll fade.
- **Full-bleed viewport.** Give the ScrollArea `-mx-4` and its content `px-4`. Then `overflow` does not clip the 3px focus rings of the edge inputs.
- The URL editor shows a bottom fade (`mask-b-from-[calc(100%-1.5rem)]`) **only** when it overflows. Set a `data-overflowing` attribute from `scrollHeight > clientHeight`.

### 5.3 Portaled popups

Default positioner props everywhere: `collisionPadding={8}`, `sideOffset={4}`. Cap heights with `--available-height`.

- **Key Autocomplete (add row):**
  - Anchor to the whole add-row Group (`anchor={groupRef}`), so the popup is the row's width (320px), not the 128px key cell's.
  - `side="bottom"` with flip. In practice it opens **up**, because the add row sits near the bottom.
  - `[--popup-max-h:12rem]`; the list scrolls inside with the coss scroll fade.
- **Saved URLs row Menu:** `align="end"`, below its ⋯ trigger.
- Toasts render bottom-centre, 8px above the action bar, max width 348px.

## 6. Screens

All copy below is final. Sizes are px with the Tailwind class in brackets; at our density, `sm:` classes are the active ones.

### 6.1 Param list (`Main` artboard)

Content height ~557px with 6 params.

**Header** `[flex items-center justify-between border-b py-3 ps-4 pe-3]`
- **Left:**
  - Logo tile 24px `[size-6 rounded-sm bg-primary text-primary-foreground]` with lucide `Search` 14px, `aria-hidden`.
  - `<h1>` "QueryCraft" `[text-sm font-semibold]`.
- **Right** `[flex gap-0.5]`:
  - Command palette trigger: `Button variant="ghost"` `[h-7 px-1 gap-1]` containing `KbdGroup` `⌘` `K`, `aria-label="Command palette"`, `aria-keyshortcuts="Meta+K"`.
  - Saved URLs: `Button variant="ghost" size="icon-sm"` with `Bookmark`, `aria-keyshortcuts="Meta+S"`.
  - Settings: `Button variant="ghost" size="icon-sm"` with `Settings`.
  - Icon-only buttons get a `Tooltip`: label + Kbd.

**URL editor** — InputGroup shell + `InputGroupTextarea`.
- Text: `font-mono sm:text-code leading-5`, 5px vertical padding, 11px horizontal.
- Max 4 lines (80px), then internal scroll.
- Keep the existing highlight-overlay technique: an `aria-hidden` mirror div under a transparent-text textarea. Sync scroll.
- Colours:
  - Base URL and the `? & =` separators: `text-muted-foreground`.
  - Keys: `text-key-foreground font-medium`.
  - Values: `text-foreground`.
- `aria-label="Current URL"`. Enter commits, as today.

**Filter** — `InputGroup` (32px):
- `InputGroupAddon` with `Search` icon (muted).
- `InputGroupInput type="search" placeholder="Filter parameters"`, `aria-label="Filter parameters by key"`, `aria-keyshortcuts="/"`.
- `InputGroupAddon align="inline-end"` containing `<Kbd>/</Kbd>`.

**Section header** `[flex h-6 items-center justify-between]`
- **Left** `[flex items-center gap-1.5]`:
  - `<h2>` "Parameters" `[text-xs font-medium text-muted-foreground]`.
  - `Badge variant="secondary"` with the visible count, `aria-label="{n} parameters"`.
- **Right:** `Button variant="ghost" size="icon-xs"` with `Ellipsis`, `aria-label="Parameter actions"`. It opens a `Menu` **(new)** with:
  - Copy as query string
  - Copy as JSON
  - Sort keys A→Z
  - separator
  - Remove all parameters (destructive variant; undoable, see §7)

**Row** — `<li class="flex items-center gap-1">` containing:

```tsx
<Group aria-label={`Parameter ${key}`} className="min-w-0 flex-1">
  <Input size="sm" aria-label="Key" className="basis-2/5 shrink-0 font-mono sm:text-code font-medium" />
  <GroupSeparator />
  {valueControl}
</Group>
<Button variant="ghost" size="icon-xs" aria-label={`Remove ${key}`} className="text-muted-foreground"><XIcon/></Button>
```

| Value type | Control |
|---|---|
| string / number | `Input size="sm"` `[flex-1 min-w-0 font-mono sm:text-code]`, `aria-label="Value"`. Inputs truncate with `text-ellipsis` at rest. |
| boolean | InputGroup shell (28px): `Switch` (`aria-label="Value"`) + `InputGroupText` with the literal value in mono, casing preserved. State is never carried by the switch alone. |
| structured JSON | `Button variant="outline" size="sm"` `[flex-1 min-w-0 justify-between font-mono font-normal sm:text-code text-muted-foreground]`: truncated preview + `ChevronRight`. `aria-label="Edit {key}, JSON array, {n} items"`. Opens the existing JSON stack. |
| DSL (later, DSL-beta) | Same button, sans text: `ListFilter` icon + "{n} conditions" + `ChevronRight`. Accessible name includes the full humanised expression. Document only. |

Wrap each row in a `ContextMenu` **(new)**: Copy key, Copy value, Copy `key=value`, Duplicate, separator, Remove. It opens on right-click and on Shift+F10 / the Menu key. This replaces the old hover-only copy buttons, which go away.

**Add row** — `role="group" aria-label="Add parameter"`:

```tsx
<Group ref={groupRef} className="min-w-0 flex-1">
  <AutocompleteInput size="sm" startAddon={<PlusIcon/>} placeholder="key" aria-label="New parameter key" />  {/* basis-2/5 */}
  <GroupSeparator />
  <Input size="sm" placeholder="value" aria-label="New parameter value" />
</Group>
<Button variant="outline" size="icon-xs" aria-label="Add parameter" aria-keyshortcuts="Enter" disabled={!key.trim()}><CornerDownLeftIcon/></Button>
```

- Suggestions:
  - "From saved URLs on {host}": keys from saved URLs on the same host, shown first, only when non-empty.
  - "Common keys": `utm_source utm_medium utm_campaign utm_term utm_content utm_id utm_source_platform page limit sort q debug`.
- Item rendering: the typed prefix in `text-muted-foreground`, the completion in `font-medium`.

**Action bar** `[flex items-center gap-2 border-t px-4 py-3]`:
- `Button` "Apply" containing `<Kbd>⌘↵</Kbd>`. Kbd on primary: `bg-primary-foreground/12 text-primary-foreground`; this is a small gap in coss.
- `Button variant="ghost"` "Reset".
- `flex-1` spacer.
- `Button variant="outline"` "Copy". The label swaps to "Copied" for 1.6s.
- `Button variant="outline"` "Save". Opens the save form directly.

All footer buttons are the default height (32px), text-only.

### 6.2 Max-height states (`Overflow` artboard)

16 params, popup at 600px.

- **(a) Tab focus at the list edge.** The focused row (`env`) sits fully above the bottom fade because of `scroll-padding-block`. The ScrollArea thumb is visible while scrolling.
- **(b) Add-row key focused, `utm_` typed.**
  - The Autocomplete flips above the row, 320px wide, capped at 192px, with a fade at the bottom.
  - The highlighted item has `bg-accent` + inset `--ring`.
  - `AutocompleteStatus` announces "{n} suggestions".

### 6.3 Settings sheet (`Settings` artboard)

`Sheet side="right" density="compact"`: coss default width `calc(100% - 3rem)` = 332px. The left 48px shows the editor under `bg-black/32 backdrop-blur-sm`. Clicking it or pressing Esc closes the sheet.

- **Header** `[flex items-center gap-2 py-3 ps-4 pe-2]`:
  - `SheetTitle` "Settings" `[text-base font-semibold]`.
  - `SheetClose` as `Button variant="ghost" size="icon"` with `X`, `aria-label="Close settings"`. Use `showCloseButton={false}` and render the close button in the header row.
- **Panel** `[flex flex-col gap-4]`:
  1. **Accent color.**
     - Label row: "Accent color" `[text-sm font-medium]`, and the selected swatch's *name* right-aligned in muted. Colour is never the only cue.
     - `RadioGroup aria-label="Accent color"`, `grid grid-cols-6 gap-2`.
     - 11 options: **Mono** (fill `--foreground`) then Blue, Cyan, Teal, Green, Lime, Amber, Orange, Red, Pink, Violet. Hex values live in `src/lib/accents.ts`.
     - Each swatch: 32px high, `rounded-md`, inset 1px `black/10` (several swatches are < 3:1 on white).
     - Selected swatch: 2px offset outline in `--foreground` + `Check` icon in `readableOn(hex)`.
     - **Mono replaces the old "Reset to monochrome" link.**
     - `FieldDescription`: "Tints the primary button, switches and URL keys. Text on the accent is picked to keep 4.5:1."
     - The swatch is a gap in coss: compose `RadioGroup` + `Radio` with a custom render. Do not create a new package-level component yet.
  2. **Preview.**
     - Label "Preview" `[text-xs font-medium text-muted-foreground]`.
     - `Frame` > `FramePanel p-3`, `inert` + `aria-hidden`.
     - Contents: `?view=table&live=true` with keys in `text-key-foreground`, a checked Switch + mono "true", and a small primary "Apply ⌘↵". It shows exactly what the accent changes.
  3. `Separator`.
  4. **Theme (new).**
     - Label "Theme".
     - Segmented control with radio semantics, `aria-label="Theme"`, full width, three equal items, each a 16px icon plus label: `Monitor` System · `Sun` Light · `Moon` Dark.
     - Description text:
       - System: "Follows your OS appearance — {light|dark} right now."
       - Light or Dark: "Overrides your OS appearance for QueryCraft only."
- Changes apply instantly; there is no footer. Announce "Accent: Violet" / "Theme: Dark" through the hidden LiveRegion.
- On open, focus goes to the checked accent radio.

### 6.4 Saved URLs sheet (`Saved` artboard)

Same sheet chrome (compact, 332px).

**List mode**
- **Header:** "Saved URLs" + `Badge variant="secondary"` total count + close button (`aria-label="Close saved URLs"`).
- **Panel:**
  - **Filter (new):** `InputGroup` with search icon, placeholder "Filter saved URLs", trailing `<Kbd>/</Kbd>`. It matches label, URL and group name.
  - **Groups:** one `Collapsible` per group. The trigger is a full-width ghost row (28px) `[text-xs font-medium text-muted-foreground]`: `ChevronDown` (rotates −90° when closed) + group name + `Badge variant="secondary"` count, with `aria-expanded`. Groups start expanded; empty groups are hidden.
  - **Rows:** inside `<ul class="rounded-xl border bg-popover divide-y overflow-hidden">`.
    - Main `<button>` `[flex-1 min-w-0 flex-col items-stretch py-2 ps-3 pe-1 text-start]`.
      - With a label: label `[truncate text-sm font-medium]` over the URL `[truncate font-mono text-xs text-muted-foreground]`. The URL is shown **without** its protocol.
      - Without a label: the URL alone `[truncate font-mono sm:text-code text-foreground]`.
    - Click / Enter on the main button = **Load into editor** (current behaviour).
    - Trailing `Button variant="ghost" size="icon-xs"` ⋯, `aria-label="Actions for {name}"`, opens a `Menu`:
      - Load into editor ↵
      - Copy URL
      - Edit…
      - separator
      - Delete ⌫ (destructive variant)
    - This replaces the three always-visible icon buttons.
    - Backspace/Delete on a focused row deletes it, with Undo (§7).
- **Footer** (`SheetFooter`, muted, right-aligned): primary `Button` "Save current URL", disabled when there is no current URL.

**Form mode** (save or edit; same sheet, content swaps)
- **Header:** `Button variant="ghost" size="icon"` `ChevronLeft` (`aria-label="Back to saved URLs"`), title "Save current URL" / "Edit saved URL", close button.
- **Fields** (coss `Field` / `FieldLabel` / `FieldDescription`):
  - **Name (optional).**
    - `Input`, placeholder "e.g. Staging with debug flag", maxLength 80, autofocus on open.
    - Description: "Shown instead of the URL in the list."
    - "(optional)" is in muted, normal weight.
  - **Group.**
    - **Creatable `Combobox`** (replaces `GroupSelector`'s native select + "Create new group…" swap). Typing filters groups.
    - When nothing matches exactly, the last item is "Create “{query}”". Enter on it creates the group, reusing the existing de-duplication in `handleCreateNewGroup`.
    - Description: "Type to find a group, or create a new one."
  - **URL.**
    - Read-only `Textarea`, `aria-readonly`, `bg-muted`. coss has no read-only style, so this is a gap. Same mono highlighting as the main URL editor, max 4 lines.
    - Description: "Read-only — edit parameters in the main view before saving."
- **Footer:** `Button variant="ghost"` "Cancel" + primary "Save" / "Update" with `<Kbd>⌘↵</Kbd>`. Rule: **⌘↵ is the primary action in every view.**

### 6.5 Command palette (spec only, Phase 6)

Built as `Dialog` + `Command`, positioned 48px from the top, 16px side margins, max height `min(var(--available-height), 24rem)`.

- Input placeholder "Search parameters and actions…".
- **Groups:**
  - **Parameters:** key in mono + truncated value in muted. Enter closes the palette and focuses that row's value input, scrolling it into view.
  - **Actions:** Apply ⌘↵, Copy URL, Save URL ⌘S, Reset, Add parameter (focuses the add-row key).
  - **Go to:** Saved URLs, Settings.
- Shortcuts appear as right-aligned `Kbd`.
- Keep it visually identical to the Autocomplete popup (item height, highlight, inset ring).

### 6.6 Interim (not designed)

- **Loading / unsupported / error:** coss `Empty` with the existing titles and messages. Loading uses `Spinner`.
- **JSON stack:** keep the behaviour.
  - Frames → coss `Breadcrumb`.
  - Structured/Raw switch → segmented control.
  - Raw editor → `Textarea` (`font-mono sm:text-code`).
  - Leaf inputs → `Input size="sm"`.
  - Nothing new visually beyond tokens.

## 7. Behaviour

### 7.1 Keyboard map

| Where | Key | Action |
|---|---|---|
| Global | ⌘/Ctrl+↵ | Apply (main), Save/Update (form) |
| Global | ⌘/Ctrl+K | Command palette |
| Global (not typing) | `/` | Focus the filter of the current view |
| Global | ⌘/Ctrl+S | Saved URLs sheet |
| Global (not typing) | ⌘/Ctrl+Z **(new)** | Undo last removal / reset / saved-URL delete while its toast is alive |
| Global | Esc | Close the topmost popup → sheet (Base UI); then the existing JSON-stack pop |
| Row key input | ↵ | Move to the value input |
| Row value input | ↵ | Move to the next row's key; after the last row, the add-row key |
| Row | Shift+F10 / Menu key | Row context menu |
| Add row | ↵ | Commit, clear, focus returns to the add-row key (as today) |
| Autocomplete | ↑ ↓ / ↵ / Esc / Tab | Move / accept / close / close without accepting and move to value |
| Saved row | ↵ / Backspace, Delete | Load / delete with undo |

**Tab order (main):**
1. Header: ⌘K, Saved URLs, Settings
2. URL
3. Filter
4. Parameter actions
5. Each row: key → value → remove
6. Add row: key → value → add
7. Action bar: Apply → Reset → Copy → Save

### 7.2 Focus management

| Event | Focus goes to |
|---|---|
| Row removed | The **remove button of the row that took its place**. If none, the previous row's remove button. If the list is empty, the add-row key. Moves immediately, before the exit animation. |
| Row added from the add row | Stays on the add-row key (rapid entry). The new row is announced. |
| Undo restores a row | The restored row's key input |
| Sheet opens | Settings: checked accent radio. Saved list: filter input. Form: Name. |
| Sheet closes | The trigger that opened it (Base UI restores it). Delete `useFocusTrap` for sheets. |
| Saved URL loaded | Sheet closes; focus goes to the URL editor |
| Palette selects a parameter | That row's value input |

### 7.3 Announcements: exactly once each

Base UI's `Toast` viewport is already a polite live region. Visible feedback goes **only** through Toast. Events without a toast go through a single visually-hidden `LiveRegion` (port `LiveRegion` from DSL-beta). Never both.

| Event | Visible | Announced via |
|---|---|---|
| URL applied | Toast "Applied to the tab" | Toast |
| URL copied | Toast "URL copied" + button label "Copied" | Toast |
| Param removed | Toast "Removed {key}" with Undo action, hint "⌘Z" | Toast |
| Reset | Toast "Reset to the original URL" with Undo | Toast |
| Remove all | Toast "Removed {n} parameters" with Undo | Toast |
| Saved / updated / deleted URL | Toast; delete has Undo | Toast |
| Param added | Row appears | LiveRegion "Added {key}" |
| Filter typed | Count badge updates | LiveRegion "{n} of {m} parameters" (debounce 500ms) |
| Accent / theme changed | Instant restyle | LiveRegion "Accent: {name}" / "Theme: {name}" |
| Autocomplete results | — | `AutocompleteStatus` |

- Undo toasts last 6s; others 3s.
- Hover or focus pauses the toast.
- Undo keeps the removed item in memory, including saved-URL deletes, which are written to storage only when the toast expires or is replaced.
- **Alert Dialog** is reserved for irreversible actions. None exist in this scope; deleting a group would be the first, if group management is ever exposed.

## 8. Motion

| What | Enter | Exit | Notes |
|---|---|---|---|
| Param row added | 150ms `--ease-out`, opacity 0→1 + translateY(−4px→0) | — | CSS `@starting-style` (Chrome-only target), no JS animation lib |
| Param row removed | — | 150ms `--ease-in`, opacity →0 + height collapse (`grid-template-rows: 1fr→0fr`) | Row is `inert` while exiting; focus already moved |
| Portaled popups (Autocomplete, Menu, Combobox, Tooltip, Command) | 150ms `--ease-out`, opacity + scale .98→1 from `--transform-origin` | 100ms `--ease-in`, opacity | Base UI `data-starting-style` / `data-ending-style`; Tooltip open delay 600ms |
| Sheet | 200ms ease-in-out, translateX(2rem→0) + opacity (coss default) | same | Backdrop opacity 200ms |
| Toast | 200ms `--ease-out`, translateY(8px→0) + opacity | 150ms `--ease-in`, opacity | |
| Collapsible group | 150ms `--ease-out`, height via `--collapsible-panel-height`, chevron rotation | same | |
| Theme or accent change | none | none | Keep `data-theme-switching` suppression |

Anything not in this table does not animate. Under `prefers-reduced-motion: reduce`, drop all transforms and height animation, and keep only opacity at ≤ 100ms. The existing global reduced-motion rule (0.01ms) is acceptable.

## 9. Component inventory (current → new)

| Current | New |
|---|---|
| `Header` + `IconButton` | header markup + `Button` ghost `icon-sm` + `Tooltip`; ghost `Button` + `KbdGroup` for ⌘K |
| `Button` | `Button` (default / ghost / outline) |
| `IconButton` | `Button size="icon*"` |
| `UrlPreview` | InputGroup shell + `InputGroupTextarea` + highlight overlay |
| `SearchInput` | `InputGroup` + addons + `Kbd` |
| `ParamList` | section + `ScrollArea scrollFade` + `Menu` (bulk) |
| `ParamRow` + `ParamTextInput` | `Group` + `Input sm` + `GroupSeparator` + `Button` ghost icon-xs + `ContextMenu` |
| `CopyButton` (hover-only) | **removed**: ContextMenu, Command palette |
| `BooleanToggle` | `Switch` in an InputGroup shell + literal text |
| structured value | `Button` outline sm → JSON stack |
| `AddParamRow` | `Group` + `Autocomplete` + `Input` + `Button` outline icon-xs |
| `ActionBar` | footer + `Button` ×4 + `Kbd` |
| `Toast` | coss `Toast` (provider at root) + hidden `LiveRegion` |
| `EmptyState` | `Empty` (+ `Spinner`) |
| `SlidePanel` + `useFocusTrap` | `Sheet` (compact density); focus handled by Base UI |
| `SettingsDrawer` | `Sheet` + `RadioGroup` swatches + `Frame` preview + segmented control (theme) |
| `SavedLinksDrawer` / `GroupedLinksList` | `Sheet` + `InputGroup` filter + `Collapsible` + list + `Menu` + `SheetFooter` |
| `SaveForm` | `Field` + `Input` + `Combobox` (creatable) + `Textarea` read-only |
| `GroupSelector` | creatable `Combobox` |
| `JsonStack/*` | restyle only (§6.6) |
| `src/styles/tokens.css` | deleted; coss tokens + `theme.css` (§4.2) |

## 10. Phases

Each phase ends with `npm run build && npm run lint && npm test` green and a short summary of what changed.

0. **Foundation.**
   - Branch, Tailwind v4, coss init and components, fonts, `theme.css`, density re-key, `.dark` strategy, `isolation: isolate`.
   - Apply the §4.3 component edits.
   - No visual migration yet; the app must still look like today.
1. **Shell and sizing.**
   - `ResizeObserver` height, app layout (§5.2), header, action bar, Toast provider + LiveRegion.
   - Remove the fixed 600px html/body height.
2. **Param list.**
   - Rows by type, filter, section header + bulk Menu, ContextMenu.
   - ScrollArea with `scroll-padding`.
   - Focus management (§7.2), row motion (§8).
3. **Add row + Autocomplete.** Anchor, flip, 12rem cap, suggestions sources, Enter flow.
4. **Undo and announcements.** §7.3 table, ⌘Z.
5. **Sheets.**
   - Settings: accent pipeline rewrite §4.4, theme preference §4.5 + `theme-boot.js`.
   - Saved URLs list + form (creatable Combobox). Delete `SlidePanel`, `useFocusTrap` usage, `GroupSelector`.
6. **Command palette** (§6.5).
7. **Cleanup and docs.**
   - Delete unused CSS Modules, `tokens.css`, dead components.
   - Update the README "Design system", "Keyboard shortcuts" and "Accessibility notes" sections to match this doc.

### Tests to add or update

- `storage`: theme preference get/set and default.
- `useTheme`: `system` follows `matchMedia`; explicit preference ignores it; `.dark` and `color-scheme` applied.
- `useAccent`: writes the three variables; mono removes them; dark uses `#161616` for `--key-foreground`.
- `contrast.test.ts`: update backgrounds. Add a token-pair test asserting the table in §11.
- ParamList: removing a row moves focus per §7.2; Undo restores the row at the same index and focuses its key.
- Add row: Enter commits and refocuses the key; the add button is disabled while the key is blank.
- Saved form: creatable Combobox reuses an existing group case-insensitively.
- Announcements: each §7.3 event produces exactly one announcement.

## 11. Contrast acceptance (computed from final tokens)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| foreground / background | 15.1 | 16.6 | 4.5 |
| muted-foreground / background | 5.6 | 5.6 | 4.5 |
| placeholder (muted-fg) / input | 5.6 | 5.3 | 4.5 |
| Kbd text / Kbd bg | 5.1 | 4.7 | 4.5 |
| muted-fg / popover (group labels) | 5.6 | 5.3 | 4.5 |
| ring / background (focus) | 4.7 | 7.0 | 3 |
| focused border vs resting border | 3.8 | 5.7 | 3 |
| highlighted-item inset ring / its bg | 4.3 | 6.0 | 3 |
| primary-foreground / primary (mono) | 14.5 | 13.9 | 4.5 |
| ⌘↵ Kbd on primary (mono) | 10.0 | 11.1 | 4.5 |
| primary-foreground / primary (Violet `#9575e0`) | 5.6 | 5.6 | 4.5 |
| ⌘↵ Kbd on primary (Violet) | 4.5 | 4.5 | 4.5 |
| key-foreground (Violet) / input | 5.9 (`#7250b8`) | 6.1 (`#a58ce8`) | 4.5 |
| destructive-foreground / highlighted menu item | 5.9 | 5.4 | 4.5 |

**Deliberately unchanged:** input borders are ~1.25:1 (coss default). WCAG 1.4.11 does not require a field boundary when the field is identified by its visible label or placeholder, which now meet 4.5:1.

## 12. Don'ts

- No `window.confirm` / `prompt` (suppressed in MV3 popups).
- No hover-only controls. No `outline: none` without a replacement.
- No sticky header or footer. No second scrolling region besides the list (and the URL editor's own 4-line scroll).
- No remote fonts or scripts. No inline scripts.
- Don't let the user's accent drive `--ring` or `--accent`.
- Don't invent UI for the "not designed" items. Use the interim rules in §6.6 and leave a `TODO(design)` comment.
