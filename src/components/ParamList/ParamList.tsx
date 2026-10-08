import { useEffect, useMemo, useState } from 'react';
import type { QueryParam } from '@/types';
import { isEditableTarget } from '@/lib/dom';
import { StackFrame } from '../JsonStack';
import type { FrameInfo } from '../JsonStack';
import { ParamRow } from '../ParamRow';
import { AddParamRow } from '../AddParamRow';
import { SearchInput } from '../SearchInput';
import styles from './ParamList.module.css';

interface ParamListProps {
  params: QueryParam[];
  onKeyChange: (id: string, key: string) => void;
  onValueChange: (id: string, value: string) => void;
  onToggleBoolean: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (key: string, value: string) => void;
}

export function ParamList({
  params,
  onKeyChange,
  onValueChange,
  onToggleBoolean,
  onRemove,
  onAdd,
}: ParamListProps) {
  const headingId = 'params-heading';
  const [frames, setFrames] = useState<FrameInfo[]>([]);
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();
  const visibleParams = useMemo(
    () => (query === '' ? params : params.filter((p) => p.key.toLowerCase().includes(query))),
    [params, query],
  );

  // Keyboard: Esc pops one frame, Cmd/Ctrl+Backspace pops all.
  // Both are skipped when the key was already consumed (e.g. cancelling an
  // inline JSON edit calls preventDefault) or aimed at an editable field —
  // Esc in the raw JSON textarea must not silently discard the draft, and
  // Cmd+Backspace in an input is "delete to line start", not "close all".
  useEffect(() => {
    if (frames.length === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setFrames((prev) => (prev.length <= 1 ? [] : prev.slice(0, -1)));
      }
      if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFrames([]);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frames.length]);

  function handleExpand(paramId: string, paramKey: string) {
    setFrames([{ name: paramKey, path: [], paramId }]);
  }

  function pushFrame(frame: FrameInfo) {
    setFrames((prev) => [...prev, frame]);
  }

  function popFrame() {
    setFrames((prev) => (prev.length <= 1 ? [] : prev.slice(0, -1)));
  }

  if (frames.length > 0) {
    return (
      <StackFrame
        frames={frames}
        params={params}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onValueChange={onValueChange}
        onPop={popFrame}
        onPopAll={() => setFrames([])}
        onPopTo={(index) => setFrames((prev) => prev.slice(0, index + 1))}
        onPush={pushFrame}
      />
    );
  }

  return (
    <>
      {/* Spacing above is the shell's gap (App <main>, gap-3). */}
      <div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter parameters"
          label="Filter parameters by key"
        />
      </div>

      <section className={styles.section} aria-labelledby={headingId}>
        <div className={styles.header}>
          <h2 id={headingId} className={styles.heading}>
            Parameters
          </h2>
          <span className={styles.count} aria-label={`${visibleParams.length} parameters shown`}>
            {visibleParams.length}
          </span>
        </div>

        {visibleParams.length > 0 && (
          <ul className={styles.list}>
            {visibleParams.map((param) => (
              <ParamRow
                key={param.id}
                param={param}
                onKeyChange={onKeyChange}
                onValueChange={onValueChange}
                onToggleBoolean={onToggleBoolean}
                onRemove={onRemove}
                onExpand={
                  param.type === 'structured'
                    ? () => handleExpand(param.id, param.key)
                    : undefined
                }
              />
            ))}
          </ul>
        )}

        {visibleParams.length === 0 && (
          <p className={styles.empty}>
            {params.length === 0
              ? 'No parameters in this URL yet.'
              : `No parameters match "${search.trim()}"`}
          </p>
        )}

        <AddParamRow onAdd={onAdd} />
      </section>
    </>
  );
}
