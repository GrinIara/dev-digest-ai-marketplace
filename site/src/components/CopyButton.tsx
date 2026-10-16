import type { CSSProperties } from 'react';
import { m } from '../i18n';
import { useCopy } from '../lib/copy';

interface Props {
  id: string;
  text: string;
  idle: string;
  copied?: string;
  failed?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  title?: string;
  /** Keep the click from reaching a stretched parent link. */
  stop?: boolean;
}

export function CopyButton({ id, text, idle, copied = m.copy.copied, failed = m.copy.failed, className, style, ariaLabel, title, stop }: Props) {
  const { copy, status } = useCopy();
  const s = status(id);
  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={ariaLabel}
      title={title}
      onClick={(e) => {
        if (stop) e.stopPropagation();
        copy(id, text);
      }}
    >
      {s === 'copied' ? <span className="ok">{copied}</span> : s === 'failed' ? <span className="danger">{failed}</span> : <span>{idle}</span>}
    </button>
  );
}
