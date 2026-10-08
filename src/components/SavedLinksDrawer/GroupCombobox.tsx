import { useEffect, useMemo, useState } from 'react';
import { ChevronsUpDownIcon } from 'lucide-react';
import type { Group } from '@/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@/components/ui/combobox';

interface GroupComboboxProps {
  id?: string;
  groups: Group[];
  /** Selected group id. */
  value: string;
  onChange: (groupId: string) => void;
  /** Called with the typed name when "Create “…”" is chosen. */
  onCreate: (name: string) => void;
  'aria-describedby'?: string;
}

interface GroupOption {
  id: string;
  name: string;
  /** The trailing "Create “{query}”" item. */
  create?: boolean;
}

const CREATE_ID = '__create__';

/**
 * Creatable group picker (docs/redesign §6.4): typing filters the groups, and
 * when nothing matches exactly the last item offers to create one. The match
 * is case-insensitive, so "staging" never offers a duplicate of "Staging".
 */
export function GroupCombobox({
  id,
  groups,
  value,
  onChange,
  onCreate,
  'aria-describedby': describedBy,
}: GroupComboboxProps) {
  const selected = groups.find((g) => g.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? '');

  // Show the selection's name whenever the selection itself changes.
  useEffect(() => {
    setQuery(selected?.name ?? '');
  }, [selected?.id, selected?.name]);

  const options = useMemo<GroupOption[]>(() => {
    const q = query.trim();
    // An untouched input lists every group.
    if (!q || q === selected?.name) return groups;
    const needle = q.toLowerCase();
    const matches = groups.filter((g) => g.name.toLowerCase().includes(needle));
    const exact = groups.some((g) => g.name.toLowerCase() === needle);
    return exact ? matches : [...matches, { id: CREATE_ID, name: q, create: true }];
  }, [groups, query, selected?.name]);

  return (
    <Combobox<GroupOption>
      items={groups}
      filteredItems={options}
      value={selected}
      onValueChange={(option) => {
        if (!option) return;
        if (option.create) onCreate(option.name);
        else onChange(option.id);
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(option) => option.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      openOnInputClick
      // Closed without a choice: show the selected group again, so the text
      // never disagrees with what will be saved.
      onOpenChange={(open) => {
        if (!open) setQuery(selected?.name ?? '');
      }}
    >
      {/*
       * No trigger button: coss's is a second role="combobox" in the tab order,
       * sharing the input's id. The chevron is decoration (as in the design);
       * a click on the field or ↓ opens the list.
       */}
      <div className="relative w-full">
        <ComboboxInput
          id={id}
          aria-describedby={describedBy}
          showTrigger={false}
          className="pe-7"
        />
        <ChevronsUpDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-80"
        />
      </div>
      {/* Focus stays in the input while the list is open; the popup never takes it. */}
      <ComboboxPopup initialFocus={false}>
        <ComboboxList>
          {(option: GroupOption) => (
            <ComboboxItem key={option.id} value={option}>
              {option.create ? `Create “${option.name}”` : option.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
