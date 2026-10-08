import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Group } from '@/types';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GroupCombobox } from './GroupCombobox';

/** Read by the sheet: Name takes focus when the form opens (§7.2). */
export const SAVE_NAME_ID = 'saved-url-name';

interface SaveFormProps {
  label: string;
  onLabelChange: (v: string) => void;
  groupId: string;
  onGroupChange: (id: string) => void;
  groups: Group[];
  onCreateNewGroup: (name: string) => void;
  previewUrl: string;
}

/**
 * Body of the save and edit forms (docs/redesign §6.4). The sheet around it
 * owns the header, the Cancel / Save footer and ⌘↵.
 */
export function SaveForm({
  label,
  onLabelChange,
  groupId,
  onGroupChange,
  groups,
  onCreateNewGroup,
  previewUrl,
}: SaveFormProps) {
  const nameId = SAVE_NAME_ID;
  const groupFieldId = useId();
  const groupDescriptionId = useId();
  const urlId = useId();
  const urlDescriptionId = useId();

  // Focus lands on Name whenever the form is shown (§7.2) — also when it
  // replaces the list inside an open sheet. Deferred a tick so a closing row
  // menu has already restored focus to its trigger.
  useEffect(() => {
    const timer = window.setTimeout(() => document.getElementById(nameId)?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [nameId]);

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={nameId}>
          Name <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Input
          id={nameId}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Staging with debug flag"
          maxLength={80}
        />
        <FieldDescription>Shown instead of the URL in the list.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={groupFieldId}>Group</FieldLabel>
        <GroupCombobox
          id={groupFieldId}
          aria-describedby={groupDescriptionId}
          groups={groups}
          value={groupId}
          onChange={onGroupChange}
          onCreate={onCreateNewGroup}
        />
        <FieldDescription id={groupDescriptionId}>
          Type to find a group, or create a new one.
        </FieldDescription>
      </Field>

      <ReadOnlyUrl
        id={urlId}
        descriptionId={urlDescriptionId}
        url={previewUrl}
        label="URL"
        description="Read-only — edit parameters in the main view before saving."
      />
    </div>
  );
}

/**
 * The URL being saved, read-only, with the same mono highlighting as the main
 * URL editor and at most four lines before it scrolls (§6.4). coss has no
 * read-only field style, so it is a muted shell around a transparent textarea
 * laid over the highlighted text.
 */
function ReadOnlyUrl({
  id,
  descriptionId,
  url,
  label,
  description,
}: {
  id: string;
  descriptionId: string;
  url: string;
  label: string;
  description: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // The bottom fade shows only when there is more to scroll to.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight);
  }, [url]);

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="w-full rounded-lg border border-input bg-muted py-[5px] has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24">
        <div
          ref={scrollRef}
          data-overflowing={overflowing || undefined}
          className="max-h-20 overflow-y-auto data-overflowing:mask-b-from-[calc(100%-1.5rem)]"
        >
          <div className="relative">
            <div
              aria-hidden="true"
              className="whitespace-pre-wrap break-all px-[11px] font-mono text-code text-muted-foreground"
            >
              {highlightUrl(url)}
            </div>
            <textarea
              id={id}
              value={url}
              readOnly
              aria-readonly="true"
              aria-describedby={descriptionId}
              spellCheck={false}
              className="absolute inset-0 size-full resize-none overflow-hidden whitespace-pre-wrap break-all bg-transparent px-[11px] font-mono text-code text-transparent caret-foreground outline-none"
            />
          </div>
        </div>
      </div>
      <FieldDescription id={descriptionId}>{description}</FieldDescription>
    </Field>
  );
}

/**
 * Base and the `? & =` separators muted, keys medium, values in the foreground.
 * Keys are not in the accent here: on the read-only field's bg-muted the key
 * colour, tuned against the plain background (§4.4), falls under 4.5:1 for 9 of
 * the 11 accents in light — so they keep the foreground, as Mono does.
 */
function highlightUrl(url: string): ReactNode {
  const q = url.indexOf('?');
  if (q === -1) return url;
  const nodes: ReactNode[] = [url.slice(0, q + 1)];
  url
    .slice(q + 1)
    .split('&')
    .forEach((pair, i) => {
      if (i > 0) nodes.push('&');
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      nodes.push(
        <span key={`k${i}`} className="font-medium text-foreground">
          {key}
        </span>,
      );
      if (eq !== -1) {
        nodes.push(
          '=',
          <span key={`v${i}`} className="text-foreground">
            {pair.slice(eq + 1)}
          </span>,
        );
      }
    });
  return nodes;
}
