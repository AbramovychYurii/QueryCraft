import { useId, useState } from 'react';
import type { QueryParam } from '@/types';
import { parseStructuredValue, shortPreview } from '@/lib/structuredParam';
import { ParamKeyInput } from '../ParamKeyInput';
import { ParamValueInput } from '../ParamValueInput';
import { BooleanToggle } from '../BooleanToggle';
import { RemoveParamButton } from '../RemoveParamButton';
import { IconCheck, IconCopy } from '../icons';
import styles from './ParamRow.module.css';

interface ParamRowProps {
  param: QueryParam;
  onKeyChange: (id: string, key: string) => void;
  onValueChange: (id: string, value: string) => void;
  onToggleBoolean: (id: string) => void;
  onRemove: (id: string) => void;
  onExpand?: () => void;
}

export function ParamRow({
  param,
  onKeyChange,
  onValueChange,
  onToggleBoolean,
  onRemove,
  onExpand,
}: ParamRowProps) {
  const keyId = useId();
  const valueId = useId();
  const [copiedField, setCopiedField] = useState<'key' | 'value' | null>(null);

  function handleCopy(text: string, field: 'key' | 'value') {
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    });
  }

  const isBool = param.type === 'boolean';
  const isStructured = param.type === 'structured';

  let preview = '';
  if (isStructured) {
    try {
      preview = shortPreview(parseStructuredValue(param.value));
    } catch {
      preview = param.value;
    }
  }

  return (
    <li className={styles.row}>
      <div className={styles.keyCell}>
        <label htmlFor={keyId} className="visually-hidden">
          Parameter key
        </label>
        <div className={styles.fieldWrap}>
          <ParamKeyInput
            id={keyId}
            value={param.key}
            aria-label={`Key for parameter ${param.key || '(empty)'}`}
            onChange={(next) => onKeyChange(param.id, next)}
          />
          <button
            className={`${styles.copyBtn}${copiedField === 'key' ? ` ${styles.copied}` : ''}`}
            onClick={() => handleCopy(param.key, 'key')}
            aria-label={`Copy key "${param.key}"`}
            tabIndex={-1}
          >
            {copiedField === 'key' ? <IconCheck /> : <IconCopy />}
          </button>
        </div>
      </div>

      <div className={styles.valueCell}>
        {isBool ? (
          <>
            <label htmlFor={valueId} className="visually-hidden">
              {`Boolean value for ${param.key}`}
            </label>
            <div className={styles.fieldWrap}>
              <BooleanToggle
                id={valueId}
                value={param.value.toLowerCase() === 'true'}
                aria-label={`Toggle boolean value for ${param.key}`}
                onChange={() => onToggleBoolean(param.id)}
              />
              <button
                className={`${styles.copyBtn}${copiedField === 'value' ? ` ${styles.copied}` : ''}`}
                onClick={() => handleCopy(param.value, 'value')}
                aria-label={`Copy value "${param.value}"`}
                tabIndex={-1}
              >
                {copiedField === 'value' ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
          </>
        ) : isStructured ? (
          <div className={styles.structuredValue}>
            <span className={styles.structuredPreview}>{preview}</span>
            <button
              className={styles.expandBtn}
              onClick={onExpand}
              aria-label={`Expand structured value for ${param.key}`}
              title="Expand structured value"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 3L7.5 6L4.5 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className={`${styles.copyBtnInline}${copiedField === 'value' ? ` ${styles.copied}` : ''}`}
              onClick={() => handleCopy(param.value, 'value')}
              aria-label={`Copy structured value for ${param.key}`}
              tabIndex={-1}
            >
              {copiedField === 'value' ? <IconCheck /> : <IconCopy />}
            </button>
          </div>
        ) : (
          <>
            <label htmlFor={valueId} className="visually-hidden">
              {`Value for parameter ${param.key}`}
            </label>
            <div className={styles.fieldWrap}>
              <ParamValueInput
                id={valueId}
                value={param.value}
                aria-label={`Value for parameter ${param.key || '(empty key)'}`}
                onChange={(next) => onValueChange(param.id, next)}
              />
              <button
                className={`${styles.copyBtn}${copiedField === 'value' ? ` ${styles.copied}` : ''}`}
                onClick={() => handleCopy(param.value, 'value')}
                aria-label={`Copy value for parameter ${param.key || '(empty key)'}`}
                tabIndex={-1}
              >
                {copiedField === 'value' ? <IconCheck /> : <IconCopy />}
              </button>
            </div>
          </>
        )}
      </div>

      <div className={styles.removeCell}>
        <RemoveParamButton paramKey={param.key} onRemove={() => onRemove(param.id)} />
      </div>
    </li>
  );
}
