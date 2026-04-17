import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  resolveImports,
  ImportCycleError,
  ImportNotFoundError,
} from '../src/imports/resolver.js';
import { parseFile } from '../src/parser/frontmatter.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

async function load(relPath: string) {
  const path = join(fixtures, relPath);
  const content = await readFile(path, 'utf8');
  return parseFile({ path, content, kind: 'claude-md', scope: 'project' });
}

describe('imports/resolver', () => {
  it('resolves a 3-level @import chain with correct depths', async () => {
    const root = await load('sample-repo/CLAUDE.md');
    const resolved = await resolveImports(root);
    const depths = resolved.imports.map(i => ({ ref: i.ref, depth: i.depth }));

    expect(depths).toContainEqual({ ref: 'docs/api-conventions.md', depth: 1 });
    expect(depths).toContainEqual({ ref: 'details.md', depth: 2 });
    expect(depths).toContainEqual({ ref: 'deeper.md', depth: 3 });
  });

  it('detects a cycle and throws with the full path', async () => {
    const root = await load('cycle/CLAUDE.md');
    await expect(resolveImports(root)).rejects.toBeInstanceOf(ImportCycleError);
    try {
      await resolveImports(root);
    } catch (err) {
      const e = err as ImportCycleError;
      expect(e.cycle.length).toBeGreaterThanOrEqual(3);
      expect(e.cycle[0]).toMatch(/cycle\/CLAUDE\.md$/);
      expect(e.cycle[e.cycle.length - 1]).toMatch(/cycle\/a\.md$/);
    }
  });

  it('throws ImportNotFoundError with a clear message for a missing @ref', async () => {
    const fake = parseFile({
      path: join(fixtures, 'sample-repo', 'virtual.md'),
      content: 'see @nonexistent-file.md for details',
      kind: 'claude-md',
      scope: 'project',
    });
    await expect(resolveImports(fake)).rejects.toBeInstanceOf(ImportNotFoundError);
  });
});
