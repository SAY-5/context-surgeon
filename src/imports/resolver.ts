import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { ParsedFile, ResolvedFile, ResolvedImport } from '../types.js';
import { parseFile } from '../parser/frontmatter.js';

const IMPORT_RE = /(?<![\w@])@((?:~|\.{1,2})?\/?[\w\-./~]+\.[a-zA-Z0-9]+)/g;
const MAX_DEPTH = 5;

function expandTilde(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return resolve(homedir(), p.slice(2));
  return p;
}

function resolveRef(ref: string, parentPath: string): string {
  const expanded = expandTilde(ref);
  if (isAbsolute(expanded)) return expanded;
  return resolve(dirname(parentPath), expanded);
}

export class ImportCycleError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`@import cycle detected:\n  ${cycle.join('\n  → ')}`);
    this.name = 'ImportCycleError';
  }
}

export class ImportDepthError extends Error {
  constructor(public readonly chain: string[]) {
    super(`@import chain exceeds max depth of ${MAX_DEPTH}:\n  ${chain.join('\n  → ')}`);
    this.name = 'ImportDepthError';
  }
}

export class ImportNotFoundError extends Error {
  constructor(public readonly ref: string, public readonly fromPath: string) {
    super(`@import not found: "${ref}" (referenced from ${fromPath})`);
    this.name = 'ImportNotFoundError';
  }
}

function extractRefs(text: string): string[] {
  // Strip fenced code blocks and inline backticks so @-references inside
  // code samples (e.g. `@pytest.mark.integration`) are not mistaken for imports.
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '');
  const refs: string[] = [];
  for (const m of cleaned.matchAll(IMPORT_RE)) {
    refs.push(m[1]!);
  }
  return refs;
}

async function walk(
  parentPath: string,
  parentText: string,
  depth: number,
  visited: string[],
): Promise<ResolvedImport[]> {
  if (depth > MAX_DEPTH) {
    throw new ImportDepthError(visited);
  }
  const out: ResolvedImport[] = [];
  for (const ref of extractRefs(parentText)) {
    const target = resolveRef(ref, parentPath);
    if (visited.includes(target)) {
      throw new ImportCycleError([...visited, target]);
    }
    if (!existsSync(target)) {
      throw new ImportNotFoundError(ref, parentPath);
    }
    const content = await readFile(target, 'utf8');
    const parsed = parseFile({
      path: target,
      content,
      kind: 'imported',
      scope: 'unknown',
    });
    out.push({ path: target, depth, ref, effective: parsed.effective });
    const deeper = await walk(target, parsed.effective, depth + 1, [...visited, target]);
    out.push(...deeper);
  }
  return out;
}

export async function resolveImports(file: ParsedFile): Promise<ResolvedFile> {
  const imports = await walk(file.path, file.effective, 1, [file.path]);
  const fullText = [file.effective, ...imports.map(i => i.effective)].join('\n\n');
  return { ...file, imports, fullText };
}
