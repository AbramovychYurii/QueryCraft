import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupedLinksList } from '@/components/SavedLinksDrawer/GroupedLinksList';
import type { Group, SavedLink } from '@/types';

const groups: Group[] = [
  { id: 'g1', name: 'Unsorted', createdAt: 0 },
  { id: 'g2', name: 'Staging', createdAt: 1 },
];
const labelled: SavedLink = {
  id: 'l1',
  url: 'https://example.com/?foo=bar',
  label: 'Example',
  createdAt: 0,
  groupId: 'g1',
};
const bare: SavedLink = {
  id: 'l2',
  url: 'https://staging.example.com/app?debug=true',
  createdAt: 1,
  groupId: 'g2',
};

function renderList() {
  const handlers = {
    onLoadLink: vi.fn(),
    onCopyLink: vi.fn(),
    onDeleteLink: vi.fn(),
    onStartEdit: vi.fn(),
  };
  render(
    <GroupedLinksList
      groups={groups}
      linksByGroup={
        new Map([
          ['g1', [labelled]],
          ['g2', [bare]],
        ])
      }
      {...handlers}
    />,
  );
  return handlers;
}

describe('GroupedLinksList', () => {
  it('loads the saved URL when its row is clicked', async () => {
    const { onLoadLink } = renderList();

    await userEvent.click(screen.getByText('Example'));

    expect(onLoadLink).toHaveBeenCalledWith('https://example.com/?foo=bar');
  });

  it('shows URLs without their protocol', () => {
    renderList();
    expect(screen.getByText('example.com/?foo=bar')).toBeInTheDocument();
    expect(screen.getByText('staging.example.com/app?debug=true')).toBeInTheDocument();
  });

  it('deletes a focused row with Backspace', async () => {
    const { onDeleteLink } = renderList();
    screen.getByText('Example').closest('button')!.focus();

    await userEvent.keyboard('{Backspace}');

    expect(onDeleteLink).toHaveBeenCalledWith(labelled);
  });

  it('filters by label, URL and group name', async () => {
    renderList();
    const filter = screen.getByRole('searchbox', { name: 'Filter saved URLs' });

    await userEvent.type(filter, 'staging');
    expect(screen.queryByText('Example')).not.toBeInTheDocument();
    expect(screen.getByText('staging.example.com/app?debug=true')).toBeInTheDocument();

    await userEvent.clear(filter);
    await userEvent.type(filter, 'unsorted');
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('says so when nothing matches the filter', async () => {
    renderList();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter saved URLs' }), 'zzz');
    expect(screen.getByText('No saved URLs match “zzz”')).toBeInTheDocument();
  });

  it('moves focus to the next row after Delete from the row menu', async () => {
    const { onDeleteLink } = renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Example' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
    await new Promise((r) => setTimeout(r, 10));

    expect(onDeleteLink).toHaveBeenCalledWith(labelled);
    expect(document.activeElement).toHaveTextContent('staging.example.com/app?debug=true');
  });

  it('offers the row actions in a menu named after the link', async () => {
    const { onCopyLink } = renderList();

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Example' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Copy URL' }));

    expect(onCopyLink).toHaveBeenCalledWith('https://example.com/?foo=bar');
  });
});
