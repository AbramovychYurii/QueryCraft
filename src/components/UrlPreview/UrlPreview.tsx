import { useEffect, useRef, useState } from 'react';
import type { ParsedUrl } from '@/types';
import { serializeUrl } from '@/lib/urlParser';
import styles from './UrlPreview.module.css';

interface UrlPreviewProps {
  parsed: ParsedUrl;
  onUrlChange: (rawUrl: string) => void;
}

/**
 * Colorize the URL segment by segment: base muted, keys bright, values
 * secondary, separators faint. Mirrors the reference's per-segment styling.
 */
function renderHighlighted(url: string) {
  const questionIdx = url.indexOf('?');
  if (questionIdx === -1) return <>{url}</>;

  const base = url.slice(0, questionIdx);
  const queryStr = url.slice(questionIdx + 1);

  const nodes: React.ReactNode[] = [
    <span key="base">{base}</span>,
    <span key="qs" className={styles.sep}>
      ?
    </span>,
  ];

  const params = queryStr.split('&');
  params.forEach((part, i) => {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) {
      nodes.push(
        <span key={`pk${i}`} className={styles.paramKey}>
          {part}
        </span>,
      );
    } else {
      nodes.push(
        <span key={`pk${i}`} className={styles.paramKey}>
          {part.slice(0, eqIdx)}
        </span>,
        <span key={`sep${i}`} className={styles.sep}>
          =
        </span>,
        <span key={`pv${i}`} className={styles.paramValue}>
          {part.slice(eqIdx + 1)}
        </span>,
      );
    }
    if (i < params.length - 1) {
      nodes.push(
        <span key={`amp${i}`} className={styles.sep}>
          &amp;
        </span>,
      );
    }
  });

  return <>{nodes}</>;
}

export function UrlPreview({ parsed, onUrlChange }: UrlPreviewProps) {
  const serialized = serializeUrl(parsed);
  const [localValue, setLocalValue] = useState(serialized);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setLocalValue(serialized);
    }
  }, [serialized]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    onUrlChange(value);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    setLocalValue(serialized);
  };

  // Enter commits (URLs can't contain raw newlines anyway — the URL parser
  // silently strips them, which would leave the field lying about the state).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <section aria-label="URL editor" className={styles.root}>
      <div className={styles.editorWrapper} dir="ltr">
        <div className={styles.highlight} aria-hidden="true">
          {renderHighlighted(localValue)}
        </div>
        <textarea
          className={styles.textarea}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={handleBlur}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Current URL"
        />
      </div>
    </section>
  );
}
