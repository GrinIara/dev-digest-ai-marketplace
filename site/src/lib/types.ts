export type ArtifactType = 'plugin' | 'skill' | 'agent' | 'command' | 'hook' | 'mcp';

export interface Security {
  hooks: boolean;
  mcp: boolean;
  scripts: boolean;
}

/** One entry of index.json, as written by scripts/build-index.mjs. */
export interface IndexArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  plugin: string;
  description: string;
  tags: string[];
  category: string | null;
  author: string | null;
  version: string;
  tools: string[];
  installCommand: string;
  path: string;
  sourceUrl: string;
  body: string;
  security: Security;
  /** null where COMPATIBILITY.md does not say. */
  compat: { claudeCode: string | null; os: string[] | null };
  updatedAt: string | null;
  /** Only on plugins: ids of the artifacts they ship. */
  children?: string[];
}

export interface IndexRelease {
  plugin: string;
  version: string;
  date: string | null;
  notes: string;
}

export interface IndexJson {
  schemaVersion: number;
  generatedAt: string;
  commit: string | null;
  marketplace: { name: string; repo: string; description: string | null };
  stats: Record<string, number>;
  artifacts: IndexArtifact[];
  releases: IndexRelease[];
}

export interface TokenIndex {
  name: string[];
  tags: string[];
  description: string[];
  body: string[];
}

export interface Artifact extends IndexArtifact {
  children: string[];
  href: string;
  idx: TokenIndex;
  changelog: IndexRelease[];
}

export interface Release extends IndexRelease {
  href: string;
}

export interface Catalog {
  meta: { name: string; repo: string; commit: string | null; generatedAt: string | null; github: string };
  arts: Artifact[];
  rel: Release[];
  byId: Record<string, Artifact>;
}

export interface Filters {
  type: string[];
  category: string[];
  tag: string[];
  author: string[];
}
