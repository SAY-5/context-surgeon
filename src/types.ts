export type SourceKind =
  | 'claude-md'
  | 'claude-local-md'
  | 'rule'
  | 'skill'
  | 'auto-memory'
  | 'settings'
  | 'imported';

export type Scope =
  | 'managed'
  | 'user'
  | 'project'
  | 'project-local'
  | 'unknown';

export interface RawFile {
  path: string;
  content: string;
  kind: SourceKind;
  scope: Scope;
}

export interface ParsedFile {
  path: string;
  kind: SourceKind;
  scope: Scope;
  frontmatter: Record<string, unknown>;
  body: string;
  effective: string;
}

export interface ResolvedImport {
  path: string;
  depth: number;
  ref: string;
  effective: string;
}

export interface ResolvedFile extends ParsedFile {
  imports: ResolvedImport[];
  fullText: string;
}

export interface DiscoveredSources {
  cwd: string;
  home: string;
  files: RawFile[];
}
