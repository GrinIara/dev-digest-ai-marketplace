import { m } from '../i18n';

export const norm = (s: string): string => String(s).toLowerCase().replace(/[’ʼ`]/g, "'");

export const tok = (s: string): string[] => norm(s).match(/[\p{L}\p{N}']+/gu) ?? [];

export const fmt = (d: string | null): string | null =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString(m.locale, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
