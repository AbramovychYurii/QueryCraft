/**
 * Inline SVG icons — no external dependency, tree-shakeable, themable via `currentColor`.
 * All icons are 16x16 with stroke-based drawing matching each other's visual weight.
 */

const baseProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const IconClose = () => (
  <svg {...baseProps}>
    <path d="M4 4 L12 12 M12 4 L4 12" />
  </svg>
);

export const IconPlus = () => (
  <svg {...baseProps}>
    <path d="M8 3 V13 M3 8 H13" />
  </svg>
);

export const IconReset = () => (
  <svg {...baseProps}>
    <path d="M3 8 A5 5 0 1 0 5 4" />
    <path d="M3 3 V6 H6" />
  </svg>
);

export const IconCopy = () => (
  <svg {...baseProps}>
    <rect x="5" y="5" width="8" height="8" rx="1.5" />
    <path d="M10 5 V3.5 A0.5 0.5 0 0 0 9.5 3 H3.5 A0.5 0.5 0 0 0 3 3.5 V9.5 A0.5 0.5 0 0 0 3.5 10 H5" />
  </svg>
);

export const IconSave = () => (
  <svg {...baseProps}>
    <path d="M3 3 H11 L13 5 V13 H3 Z" />
    <path d="M5 3 V7 H10 V3" />
    <path d="M5 10 H11" />
  </svg>
);

export const IconCheck = () => (
  <svg {...baseProps}>
    <path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" />
  </svg>
);

export const IconBookmark = () => (
  <svg {...baseProps}>
    <path d="M4 3 H12 V13 L8 10 L4 13 Z" />
  </svg>
);

export const IconSun = () => (
  <svg {...baseProps}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" />
  </svg>
);

export const IconMoon = () => (
  <svg {...baseProps}>
    <path d="M13 9 A5 5 0 1 1 7 3 A4 4 0 0 0 13 9 Z" />
  </svg>
);

export const IconMonitor = () => (
  <svg {...baseProps}>
    <rect x="2" y="3" width="12" height="8" rx="1" />
    <path d="M6 14 H10 M8 11 V14" />
  </svg>
);

export const IconChevronLeft = () => (
  <svg {...baseProps}>
    <path d="M10 3 L5 8 L10 13" />
  </svg>
);

export const IconLogo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13 13 L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const IconEdit = () => (
  <svg {...baseProps}>
    <path d="M11.5 2.5 L13.5 4.5 L5 13 L2 14 L3 11 Z" />
    <path d="M10 4 L12 6" />
  </svg>
);

export const IconSearch = () => (
  <svg {...baseProps}>
    <circle cx="6.5" cy="6.5" r="4" />
    <path d="M9.5 9.5 L13.5 13.5" />
  </svg>
);
