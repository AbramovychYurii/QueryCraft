import { useRef, type CSSProperties } from 'react';
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon, XIcon } from 'lucide-react';
import type { AccentColor, TextDirection, ThemePreference } from '@/types';
import type { ResolvedTheme } from '@/hooks/useTheme';
import { ACCENTS } from '@/lib/accents';
import { readableOn } from '@/lib/contrast';
import { shortcutLabel } from '@/lib/platform';
import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from '@/lib/segmented-control';
import { cn } from '@/lib/utils';
import { useReportSheetHeight } from '@/popup/popupHeight';
import { announce } from '@/components/LiveRegion';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Frame, FramePanel } from '@/components/ui/frame';
import { Kbd } from '@/components/ui/kbd';
import { RadioGroupPrimitive, RadioPrimitive } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetClose,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  accent: AccentColor;
  onAccentChange: (accent: AccentColor) => void;
  preference: ThemePreference;
  /** The scheme in use: the OS's while the preference is 'system'. */
  resolved: ResolvedTheme;
  onPreferenceChange: (preference: ThemePreference) => void;
  direction: TextDirection;
  onDirectionChange: (direction: TextDirection) => void;
}

const SHEET_ID = 'settings';
const MONO = 'mono';

/** Mono first, then the palette; Mono replaces the old "Reset to monochrome" link. */
const SWATCHES = [
  { name: 'Mono', value: MONO },
  ...ACCENTS.map((a) => ({ name: a.name, value: a.hex })),
];

const THEMES: { value: ThemePreference; label: string; Icon: typeof MonitorIcon }[] = [
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
];

/** Settings sheet (docs/redesign §6.3). Changes apply instantly; there is no footer. */
export function SettingsDrawer({
  open,
  onClose,
  accent,
  onAccentChange,
  preference,
  resolved,
  onPreferenceChange,
  direction,
  onDirectionChange,
}: SettingsDrawerProps) {
  const checkedSwatchRef = useRef<HTMLButtonElement>(null);
  useReportSheetHeight(open, SHEET_ID);

  const selected = accent ?? MONO;
  const selectedName = SWATCHES.find((s) => s.value === selected)?.name ?? 'Mono';

  function handleAccentChange(value: unknown) {
    const swatch = SWATCHES.find((s) => s.value === value);
    if (!swatch) return;
    onAccentChange(swatch.value === MONO ? null : swatch.value);
    announce(`Accent: ${swatch.name}`);
  }

  function handleThemeChange(value: unknown) {
    const theme = THEMES.find((t) => t.value === value);
    if (!theme) return;
    onPreferenceChange(theme.value);
    announce(`Theme: ${theme.label}`);
  }

  function handleDirectionChange(rtl: boolean) {
    onDirectionChange(rtl ? 'rtl' : 'ltr');
    announce(`Right-to-left layout: ${rtl ? 'on' : 'off'}`);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetPopup
        side="right"
        density="compact"
        showCloseButton={false}
        initialFocus={checkedSwatchRef}
        data-qc-sheet={SHEET_ID}
      >
        <SheetHeader className="flex-row items-center gap-2 ps-4 pe-2">
          <SheetTitle className="flex-1">Settings</SheetTitle>
          <SheetClose render={<Button variant="ghost" size="icon" aria-label="Close settings" />}>
            <XIcon />
          </SheetClose>
        </SheetHeader>

        <SheetPanel className="flex flex-col gap-4">
          <Field className="items-stretch">
            <div className="flex items-baseline justify-between">
              <p className="font-medium text-sm/4">Accent color</p>
              {/* The name, so colour is never the only cue. */}
              <p className="text-muted-foreground text-sm/4">{selectedName}</p>
            </div>
            <RadioGroupPrimitive
              aria-label="Accent color"
              value={selected}
              onValueChange={handleAccentChange}
              className="grid grid-cols-6 gap-2 py-1"
            >
              {SWATCHES.map((swatch) => {
                const isMono = swatch.value === MONO;
                const style: CSSProperties = {
                  background: isMono ? 'var(--foreground)' : swatch.value,
                  color: isMono ? 'var(--background)' : readableOn(swatch.value),
                };
                return (
                  <RadioPrimitive.Root
                    key={swatch.value}
                    ref={swatch.value === selected ? checkedSwatchRef : undefined}
                    value={swatch.value}
                    aria-label={swatch.name}
                    style={style}
                    className={cn(
                      'flex h-8 cursor-pointer items-center justify-center rounded-md outline-none',
                      // Several swatches are under 3:1 on white: a hairline keeps their edge.
                      'inset-ring inset-ring-black/10',
                      // Selected = foreground-tone outline; focused = --ring (§4.3).
                      'data-checked:ring-2 data-checked:ring-foreground data-checked:ring-offset-2 data-checked:ring-offset-popover',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                    )}
                  >
                    <RadioPrimitive.Indicator className="flex">
                      <CheckIcon aria-hidden="true" className="size-4" />
                    </RadioPrimitive.Indicator>
                  </RadioPrimitive.Root>
                );
              })}
            </RadioGroupPrimitive>
            <FieldDescription>Tints the primary button, switches and URL keys.</FieldDescription>
          </Field>

          <section className="flex flex-col gap-2">
            <p className="font-medium text-muted-foreground text-xs">Preview</p>
            {/* Shows exactly what the accent changes; not interactive. */}
            <Frame aria-hidden="true" inert>
              <FramePanel className="flex flex-col gap-2.5 p-3">
                <p className="truncate font-mono text-code text-muted-foreground">
                  ?<span className="font-medium text-key-foreground">view</span>=
                  <span className="text-foreground">table</span>&amp;
                  <span className="font-medium text-key-foreground">live</span>=
                  <span className="text-foreground">true</span>
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked tabIndex={-1} />
                    <span className="font-mono text-code">true</span>
                  </div>
                  <Button size="sm" tabIndex={-1}>
                    Apply
                    <Kbd className="bg-primary-foreground/12 text-primary-foreground">
                      {shortcutLabel('↵')}
                    </Kbd>
                  </Button>
                </div>
              </FramePanel>
            </Frame>
          </section>

          <Separator />

          <Field>
            <FieldLabel>
              <Switch checked={direction === 'rtl'} onCheckedChange={handleDirectionChange} />
              Right-to-left layout
            </FieldLabel>
            <FieldDescription>
              Mirrors QueryCraft for right-to-left languages like Arabic and Hebrew.
            </FieldDescription>
          </Field>

          <Field className="items-stretch">
            <p className="font-medium text-sm/4">Theme</p>
            <RadioGroupPrimitive
              aria-label="Theme"
              value={preference}
              onValueChange={handleThemeChange}
              className={cn(segmentedControlRootClassName, 'w-full')}
            >
              {THEMES.map(({ value, label, Icon }) => (
                <RadioPrimitive.Root
                  key={value}
                  value={value}
                  className={cn(
                    segmentedControlItemVariants({ state: 'checked' }),
                    'min-w-0 flex-1',
                  )}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </RadioPrimitive.Root>
              ))}
            </RadioGroupPrimitive>
            <FieldDescription>
              {preference === 'system'
                ? `Follows your OS appearance — ${resolved} right now.`
                : 'Overrides your OS appearance for QueryCraft only.'}
            </FieldDescription>
          </Field>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
