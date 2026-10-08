import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupCombobox } from '@/components/SavedLinksDrawer/GroupCombobox';
import type { Group } from '@/types';

const groups: Group[] = [
  { id: 'default', name: 'Unsorted', createdAt: 0 },
  { id: 'g2', name: 'Staging', createdAt: 1 },
];

function renderCombobox() {
  const onChange = vi.fn();
  const onCreate = vi.fn();
  render(<GroupCombobox groups={groups} value="default" onChange={onChange} onCreate={onCreate} />);
  return { input: screen.getByRole('combobox'), onChange, onCreate };
}

describe('GroupCombobox', () => {
  it('offers to create a group when nothing matches exactly', async () => {
    const { input, onCreate } = renderCombobox();

    await userEvent.clear(input);
    await userEvent.type(input, 'Bug repros');
    await userEvent.click(await screen.findByRole('option', { name: 'Create “Bug repros”' }));

    expect(onCreate).toHaveBeenCalledWith('Bug repros');
  });

  it('reuses an existing group case-insensitively instead of offering a duplicate', async () => {
    const { input, onChange } = renderCombobox();

    await userEvent.clear(input);
    await userEvent.type(input, 'staging');

    expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Staging' }));
    expect(onChange).toHaveBeenCalledWith('g2');
  });
});
