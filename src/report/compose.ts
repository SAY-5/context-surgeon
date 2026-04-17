import { count } from '../tokens/index.js';
import type { Mode } from '../tokens/index.js';
import type { ResolvedFile, Scope, SourceKind } from '../types.js';
import { analyze, type Finding, type ConflictClassifier } from '../analyze/index.js';

export type { Finding };

export type Bucket =
  | 'system'
  | 'user-claude'
  | 'project-claude'
  | 'rules'
  | 'auto-memory'
  | 'skills'
  | 'imports'
  | 'room';

export interface SourceCount {
  path: string;
  kind: SourceKind | 'system';
  scope: Scope;
  bucket: Bucket;
  tokens: number;
  label: string;
}

export interface Report {
  cwd: string;
  total: number;
  contextWindow: number;
  mode: Mode;
  sources: SourceCount[];
  findings: Finding[];
  includeHome: boolean;
  systemPromptTokens: number;
}

export interface ComposeOpts {
  cwd: string;
  mode: Mode;
  includeHome: boolean;
  contextWindow?: number;
  systemPromptTokens?: number;
  conflictClassifier?: ConflictClassifier;
}

function shortLabel(path: string, cwd: string): string {
  if (path.startsWith(cwd + '/')) return path.slice(cwd.length + 1);
  if (path === cwd) return '.';
  return path;
}

function bucketFor(f: ResolvedFile): Bucket {
  if (f.kind === 'skill') return 'skills';
  if (f.kind === 'rule') return 'rules';
  if (f.kind === 'auto-memory') return 'auto-memory';
  if (f.kind === 'claude-md' || f.kind === 'claude-local-md') {
    return f.scope === 'user' ? 'user-claude' : 'project-claude';
  }
  return 'imports';
}

function textFor(f: ResolvedFile): string {
  if (f.kind === 'skill') {
    const fm = f.frontmatter as Record<string, unknown>;
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const when = typeof fm.when_to_use === 'string' ? fm.when_to_use : '';
    return when ? `${desc}\n${when}` : desc;
  }
  if (f.kind === 'claude-md' || f.kind === 'claude-local-md') {
    return f.fullText;
  }
  return f.effective;
}

export async function compose(resolved: ResolvedFile[], opts: ComposeOpts): Promise<Report> {
  const contextWindow = opts.contextWindow ?? 200_000;
  const systemPromptTokens = opts.systemPromptTokens ?? 1000;

  const sources: SourceCount[] = [];
  sources.push({
    path: '<system prompt>',
    kind: 'system',
    scope: 'managed',
    bucket: 'system',
    tokens: systemPromptTokens,
    label: 'system prompt',
  });

  for (const f of resolved) {
    const text = textFor(f);
    if (!text) continue;
    const { tokens } = await count(text, { force: opts.mode });
    sources.push({
      path: f.path,
      kind: f.kind,
      scope: f.scope,
      bucket: bucketFor(f),
      tokens,
      label: shortLabel(f.path, opts.cwd),
    });
  }

  const total = sources.reduce((s, x) => s + x.tokens, 0);

  const findings = await analyze(resolved, {
    cwd: opts.cwd,
    mode: opts.mode,
    conflictClassifier: opts.conflictClassifier,
  });

  return {
    cwd: opts.cwd,
    total,
    contextWindow,
    mode: opts.mode,
    sources,
    findings,
    includeHome: opts.includeHome,
    systemPromptTokens,
  };
}
