import { createCn } from 'cn/config';

/**
 * Class merging aware of QueryCraft's theme additions (src/styles/theme.css).
 * Without this, `text-code` reads as a text colour: it would drop
 * `text-muted-foreground`, and never replace `sm:text-sm`.
 */
export const cn = createCn({
  extend: { classGroups: { 'font-size': [{ text: ['code'] }] } },
});
