import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupedLinksList } from '@/components/SavedLinksDrawer/GroupedLinksList';
import type { Group, SavedLink } from '@/types';

const group: Group = { id: 'g1', name: 'Unsorted', createdAt: 0 };
const link: SavedLink = {
  id: 'l1',
  url: 'https://example.com/?foo=bar',
  label: 'Example',
  createdAt: 0,
  groupId: 'g1',
};

function renderList(onLoadLink = vi.fn()) {
  render(
    <GroupedLinksList
      groups={[group]}
      linksByGroup={new Map([['g1', [link]]])}
      onLoadLink={onLoadLink}
      onDeleteLink={vi.fn()}
      onStartEdit={vi.fn()}
      onStartSave={vi.fn()}
      canSave
    />,
  );
  return onLoadLink;
}

describe('GroupedLinksList', () => {
  it('loads the saved URL when its name is clicked', async () => {
    const onLoadLink = renderList();

    await userEvent.click(screen.getByText('Example'));

    expect(onLoadLink).toHaveBeenCalledWith('https://example.com/?foo=bar');
  });

  it('exposes the name as a button so it can be reached by keyboard', () => {
    renderList();

    expect(screen.getByRole('button', { name: /^Example/ })).toBeInTheDocument();
  });
});
