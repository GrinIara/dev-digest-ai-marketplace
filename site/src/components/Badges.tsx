import { m } from '../i18n';
import { TYPE_INFO } from '../lib/constants';
import type { ArtifactType, Security } from '../lib/types';

export function TypeBadge({ type, large }: { type: ArtifactType; large?: boolean }) {
  const t = TYPE_INFO[type];
  return (
    <span className={'type-badge' + (large ? ' large' : '')} style={{ color: `var(--t-${type})` }}>
      <span aria-hidden="true">{t.glyph}</span>
      {t.label}
    </span>
  );
}

export function secBadges(s: Security): { label: string; title: string }[] {
  return [s.hooks && m.badges.hooks, s.mcp && m.badges.mcp, s.scripts && m.badges.scripts].filter(Boolean) as {
    label: string;
    title: string;
  }[];
}

export function SecBadges({ security, large }: { security: Security; large?: boolean }) {
  return (
    <>
      {secBadges(security).map((b) => (
        <span key={b.label} title={b.title} className={'sec-badge' + (large ? ' large' : '')}>
          {m.badges.warn(b.label)}
        </span>
      ))}
    </>
  );
}
