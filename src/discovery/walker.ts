import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import fg from 'fast-glob';
import type { DiscoveredSources, RawFile, Scope, SourceKind } from '../types.js';
import { managedClaudeMdPath } from './paths.js';

function kindForPath(path: string): SourceKind {
  if (path.endsWith('CLAUDE.local.md')) return 'claude-local-md';
  if (path.endsWith('CLAUDE.md')) return 'claude-md';
  if (/[\\/]rules[\\/]/.test(path)) return 'rule';
  if (path.endsWith('SKILL.md')) return 'skill';
  if (/[\\/]memory[\\/][^\\/]+\.md$/.test(path)) return 'auto-memory';
  if (/settings(\.local)?\.json$/.test(path)) return 'settings';
  return 'imported';
}

function ancestorsOf(start: string): string[] {
  const dirs: string[] = [];
  let cur = resolve(start);
  for (;;) {
    dirs.push(cur);
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return dirs;
}

async function readIfExists(path: string, kind: SourceKind, scope: Scope): Promise<RawFile | null> {
  if (!existsSync(path)) return null;
  try {
    if (!statSync(path).isFile()) return null;
  } catch {
    return null;
  }
  const content = await readFile(path, 'utf8');
  return { path, content, kind, scope };
}

async function globRead(patterns: string[], cwd: string, scope: Scope): Promise<RawFile[]> {
  if (!existsSync(cwd)) return [];
  const matches = await fg(patterns, { cwd, absolute: true, onlyFiles: true, dot: true });
  const out: RawFile[] = [];
  for (const m of matches) {
    const content = await readFile(m, 'utf8');
    out.push({ path: m, content, kind: kindForPath(m), scope });
  }
  return out;
}

export interface DiscoverOpts {
  includeHome?: boolean;
  includeManaged?: boolean;
  stopAtHome?: boolean;
}

export async function discover(startCwd: string, opts: DiscoverOpts = {}): Promise<DiscoveredSources> {
  const cwd = resolve(startCwd);
  const home = homedir();
  const includeHome = opts.includeHome ?? false;
  const includeManaged = opts.includeManaged ?? false;
  const stopAtHome = opts.stopAtHome ?? true;

  const collected: RawFile[] = [];

  for (const dir of ancestorsOf(cwd)) {
    // Stop before home so user-scope files are only added when includeHome is set,
    // and never mislabelled as project scope.
    if (stopAtHome && dir === home) break;
    const scope: Scope = 'project';

    const claudeMd = await readIfExists(join(dir, 'CLAUDE.md'), 'claude-md', scope);
    if (claudeMd) collected.push(claudeMd);

    const claudeLocalMd = await readIfExists(
      join(dir, 'CLAUDE.local.md'),
      'claude-local-md',
      'project-local',
    );
    if (claudeLocalMd) collected.push(claudeLocalMd);

    const dotClaude = join(dir, '.claude');
    if (existsSync(dotClaude)) {
      const dotClaudeMd = await readIfExists(join(dotClaude, 'CLAUDE.md'), 'claude-md', scope);
      if (dotClaudeMd) collected.push(dotClaudeMd);
      collected.push(...(await globRead(['rules/**/*.md'], dotClaude, scope)));
      collected.push(...(await globRead(['skills/*/SKILL.md'], dotClaude, scope)));
      for (const name of ['settings.json', 'settings.local.json']) {
        const s = await readIfExists(
          join(dotClaude, name),
          'settings',
          name.includes('local') ? 'project-local' : scope,
        );
        if (s) collected.push(s);
      }
    }
  }

  if (includeHome) {
    const hc = join(home, '.claude');
    const userClaude = await readIfExists(join(hc, 'CLAUDE.md'), 'claude-md', 'user');
    if (userClaude) collected.push(userClaude);
    if (existsSync(hc)) {
      collected.push(...(await globRead(['rules/**/*.md'], hc, 'user')));
      collected.push(...(await globRead(['skills/*/SKILL.md'], hc, 'user')));
      const s = await readIfExists(join(hc, 'settings.json'), 'settings', 'user');
      if (s) collected.push(s);
    }
  }

  if (includeManaged) {
    const managed = managedClaudeMdPath();
    if (managed) {
      const m = await readIfExists(managed, 'claude-md', 'managed');
      if (m) collected.push(m);
    }
  }

  const seen = new Set<string>();
  const files = collected.filter(f => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });

  return { cwd, home, files };
}
