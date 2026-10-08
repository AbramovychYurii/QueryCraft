import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

// `text-code` is QueryCraft's 13px mono size (src/styles/theme.css). coss sets
// sizes under `sm:`, so overrides are written `sm:text-code` (docs/redesign §4.1).
describe('cn', () => {
  it('treats text-code as a font size that replaces another size', () => {
    expect(cn('sm:text-sm', 'sm:text-code')).toBe('sm:text-code');
  });

  it('keeps the text colour next to text-code', () => {
    expect(cn('text-muted-foreground', 'text-code')).toBe('text-muted-foreground text-code');
  });

  it('lets text-key-foreground replace another text colour', () => {
    expect(cn('text-foreground', 'text-key-foreground')).toBe('text-key-foreground');
  });
});
