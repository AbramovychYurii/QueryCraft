# QueryCraft

A Chrome extension for inspecting, editing, saving, and replaying URL query parameters on the active tab. Built for developers and QA engineers.

**[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/querycraft/gokkgpehjnmdcnpknmkefbjnhpnnhbih)**

![QueryCraft popup](public/icons/icon128.png)

## Features

- **Live parameter editor** — parses the active tab's URL, shows each query param as an editable row, with one-click navigation to the edited URL.
- **Type-aware inputs** — `true` / `false` values render as a toggle switch with a `BOOL` badge; everything else is a monospace text field.
- **Highlighted URL preview** — full URL shown at the top with parameter keys in the accent color, base URL and separators muted.
- **Save & group** — persist URLs into named groups (stored locally via `chrome.storage.local`), reload them into the editor with one click.
- **Copy / Apply / Reset** — copy the current URL, replace the active tab's URL, or snap back to the URL that was open when the popup first loaded.
- **Dark, light, and system themes** — all colors meet WCAG 2.2 AA contrast.
- **Full keyboard navigation** — every interactive element is reachable via Tab, with visible focus rings and sensible shortcuts.
- **Screen-reader friendly** — semantic HTML, ARIA live region for status announcements, role-correct toggle/switch/dialog semantics.

## Planned features

- **Company-specific query filter rules** — support for complex, configurable filters tailored to the needs of individual companies. The configuration delivery mechanism is still being explored (inline config, file import, or remote fetch). Currently available as a **beta** on the [`DLS-beta`](../../tree/DLS-beta) branch — build it yourself to try it out.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Enter` in a row field | Commit / advance focus |
| `Cmd`/`Ctrl` + `Enter` | Apply edited URL to the active tab |
| `Cmd`/`Ctrl` + `S` | Open the saved URLs drawer |
| `Esc` | Close the drawer |
| `Space` on a `BOOL` toggle | Flip the value |
| `←` / `→` on the theme switch | Cycle light → system → dark |

## Tech stack

- **Manifest V3** (service worker, `action`, minimal permissions)
- **React 18** with TypeScript (strict mode)
- **Vite** + `@crxjs/vite-plugin` for HMR during popup development
- **Zustand** for state (small footprint, test-friendly)
- **CSS Modules** + CSS custom properties for theming
- **Vitest** + React Testing Library (infrastructure ready; tests not yet written)

## Permissions

The extension requests only what it needs:

| Permission | Why |
| --- | --- |
| `activeTab` | Read and update the URL of the currently focused tab |
| `tabs` | Query the active tab's URL when the popup opens |
| `storage` | Persist saved links, groups, and theme preference locally |

No `<all_urls>`, no `clipboardWrite` (popups are secure contexts and a user-gesture click is enough for `navigator.clipboard.writeText`).

## Development

### Prerequisites

- Node.js 20+
- npm 10+ (or pnpm / yarn if you prefer)

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts Vite with the `@crxjs` plugin, which rebuilds on save and writes the unpacked extension into `dist/`.

### Load into Chrome

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the QueryCraft icon in the toolbar on any `http`/`https` page.

### Production build

```bash
npm run build
```

The production build lands in `dist/`, ready to be zipped and uploaded to the Chrome Web Store.

### Type check / lint / test

```bash
npm run build       # runs `tsc --noEmit` before Vite
npm run lint        # ESLint with react + jsx-a11y rules
npm run test        # Vitest (jsdom, with chrome.* mocks preconfigured)
```

## Deployment

Releases are automated via GitHub Actions and publish directly to the Chrome Web Store.

### How it works

| Trigger | What happens |
| --- | --- |
| PR merged into `release` branch | Automatic deploy |
| Manual `workflow_dispatch` | Deploy with a chosen version bump |

### Version bumping

The workflow bumps `manifest.json` version automatically before building:

| Type | Example |
| --- | --- |
| `patch` (default) | `1.0.0` → `1.0.1` |
| `minor` | `1.0.0` → `1.1.0` |
| `major` | `1.0.0` → `2.0.0` |

### Required secrets

The following secrets must be set in the repository settings:

| Secret | Description |
| --- | --- |
| `EXTENSION_ID` | Chrome Web Store extension ID |
| `CLIENT_ID` | Google OAuth client ID |
| `CLIENT_SECRET` | Google OAuth client secret |
| `REFRESH_TOKEN` | Google OAuth refresh token |

### Release flow

1. Merge your feature branch into `main`.
2. Open a PR from `main` → `release`.
3. Merge the PR — the workflow bumps the version, builds, zips, uploads to the store, and tags the release automatically.

## Accessibility notes

- Every interactive element is ≥ 28×28 CSS px (WCAG 2.2 SC 2.5.8).
- Focus indicators are preserved via `:focus-visible` outlines; `outline: none` is never used without a replacement.
- Every input has a `<label>` (visible or `.visually-hidden`), never bare placeholders as labels.
- The drawer uses `role="dialog"`, `aria-modal="true"`, and a focus trap that restores focus to the trigger on close.
- Status changes (URL applied, copied, saved, reset, param added/removed) are announced via a single polite `aria-live` region.
- `prefers-reduced-motion` is honored globally — animations collapse to a near-instant transition.
- Color is never the sole channel for status; danger tone is always paired with an icon and label.

## Testability

- `chrome.*` APIs are accessed only through adapters in `src/lib/storage.ts` and `src/lib/tabs.ts`, so tests can swap a single module instead of the global `chrome` namespace.
- URL parsing lives in pure functions (`parseUrl`, `serializeUrl`, `isEditableUrl`, `createParam`) with no React or Chrome dependencies.
- Components accept behavior via props, not singletons, so they can be rendered in isolation with a test harness.
- `src/test/setup.ts` ships with `chrome.storage.local`, `chrome.tabs`, `navigator.clipboard`, and `matchMedia` mocks preconfigured.

## License

MIT
