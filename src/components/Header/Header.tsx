import type { ReactElement } from 'react';
import { BookmarkIcon, SearchIcon, SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ariaShortcut, shortcutLabel } from '@/lib/platform';

interface HeaderProps {
  onOpenSaved: () => void;
  onOpenSettings: () => void;
}

/** Popup header (docs/redesign §6.1). Phase 6 adds the ⌘K palette trigger first in the row. */
export function Header({ onOpenSaved, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex flex-none items-center justify-between border-b py-3 ps-4 pe-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground"
        >
          <SearchIcon className="size-3.5" />
        </span>
        <h1 className="font-semibold text-sm">QueryCraft</h1>
      </div>

      {/* Tooltips open after 600ms; the provider makes the next one in the row open at once. */}
      <TooltipProvider delay={600}>
        <div className="flex items-center gap-0.5">
          <HeaderButton
            label="Saved URLs"
            shortcut="S"
            icon={<BookmarkIcon />}
            onClick={onOpenSaved}
          />
          <HeaderButton label="Settings" icon={<SettingsIcon />} onClick={onOpenSettings} />
        </div>
      </TooltipProvider>
    </header>
  );
}

interface HeaderButtonProps {
  label: string;
  /** Key pressed with Cmd/Ctrl, shown in the tooltip and exposed to assistive tech. */
  shortcut?: string;
  icon: ReactElement;
  onClick: () => void;
}

/** Icon-only, so it carries an aria-label and a tooltip with the label and its shortcut. */
function HeaderButton({ label, shortcut, icon, onClick }: HeaderButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-keyshortcuts={shortcut ? ariaShortcut(shortcut) : undefined}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipPopup>
        <span className="flex items-center gap-2">
          {label}
          {shortcut && <Kbd>{shortcutLabel(shortcut)}</Kbd>}
        </span>
      </TooltipPopup>
    </Tooltip>
  );
}
