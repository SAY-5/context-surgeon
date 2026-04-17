import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { discover } from '../src/discovery/walker.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

describe('discovery/walker', () => {
  it('finds project auto-memory under .claude/memory/', async () => {
    const sources = await discover(join(fixtures, 'sample-repo'));
    const memoryFiles = sources.files.filter(f => f.kind === 'auto-memory');
    expect(memoryFiles.length).toBeGreaterThanOrEqual(1);
    expect(memoryFiles[0]!.path).toMatch(/\.claude\/memory\/MEMORY\.md$/);
    expect(memoryFiles[0]!.content).toContain('ripgrep');
  });

  it('classifies discovered files by kind', async () => {
    const sources = await discover(join(fixtures, 'sample-repo'));
    const kinds = new Set(sources.files.map(f => f.kind));
    expect(kinds).toContain('claude-md');
    expect(kinds).toContain('claude-local-md');
    expect(kinds).toContain('rule');
    expect(kinds).toContain('skill');
    expect(kinds).toContain('auto-memory');
  });

  it('stops ancestor walk before home so user-scope files do not pollute project scope', async () => {
    const sources = await discover(join(fixtures, 'sample-repo'));
    for (const f of sources.files) {
      expect(f.scope).not.toBe('user');
    }
  });
});
