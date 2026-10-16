import { m } from '../i18n';
import type { ArtifactType } from './types';

const GLYPHS: Record<ArtifactType, string> = { plugin: '▣', skill: '◆', agent: '●', command: '/', hook: '↯', mcp: '⇄' };
const IDS = Object.keys(GLYPHS) as ArtifactType[];

export const TYPES: { id: ArtifactType; label: string; glyph: string; plural: string }[] = IDS.map((id) => ({
  id,
  glyph: GLYPHS[id],
  label: m.types[id].label,
  plural: m.types[id].plural,
}));

export const TYPE_INFO = Object.fromEntries(TYPES.map((t) => [t.id, t])) as Record<
  ArtifactType,
  (typeof TYPES)[number]
>;

export const FACETS = [
  ['type', m.facets.type],
  ['category', m.facets.category],
  ['tag', m.facets.tag],
  ['author', m.facets.author],
] as const;
