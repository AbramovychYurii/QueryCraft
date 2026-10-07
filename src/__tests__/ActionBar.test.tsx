import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBar } from '@/components/ActionBar';

function renderBar(props: Partial<Parameters<typeof ActionBar>[0]> = {}) {
  render(
    <ActionBar onApply={vi.fn()} onReset={vi.fn()} onCopy={vi.fn()} onSave={vi.fn()} {...props} />,
  );
}

describe('ActionBar', () => {
  it('names Apply without its shortcut glyph, which aria-keyshortcuts carries', () => {
    renderBar();
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply.getAttribute('aria-keyshortcuts')).toMatch(/^(Meta|Control)\+Enter$/);
  });

  it('swaps the Copy label to Copied while the copy is confirmed', () => {
    renderBar({ copied: true });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
  });

  it('disables Apply when there is nothing to apply', () => {
    renderBar({ applyDisabled: true });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });
});
