import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { discover } from '../src/discovery/walker.js';
import { parseFile } from '../src/parser/frontmatter.js';
import { resolveImports } from '../src/imports/resolver.js';
import { detectClipped, MENU_CHAR_LIMIT } from '../src/analyze/clipped.js';
import { detectMismatches, scanRepo } from '../src/analyze/mismatch.js';
import { detectDuplicates } from '../src/analyze/duplicates.js';
import {
  classifyExact,
  classifyOffline,
  type ConflictClassifier,
} from '../src/analyze/conflicts.js';
import { TfIdfIndex } from '../src/analyze/tfidf.js';
import type { ResolvedFile } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const bloated = join(here, '..', 'examples', 'bloated');

async function loadResolved(cwd: string): Promise<ResolvedFile[]> {
  const sources = await discover(cwd);
  return Promise.all(sources.files.map(f => resolveImports(parseFile(f))));
}

function virtualRule(path: string, frontmatter: Record<string, unknown>, body: string): ResolvedFile {
  return {
    path,
    kind: 'rule',
    scope: 'project',
    frontmatter,
    body,
    effective: body,
    imports: [],
    fullText: body,
  };
}

async function makeVirtualSkill(frontmatter: Record<string, unknown>): Promise<ResolvedFile> {
  return {
    path: '/virtual/skill/SKILL.md',
    kind: 'skill',
    scope: 'project',
    frontmatter,
    body: '',
    effective: '',
    imports: [],
    fullText: '',
  };
}

describe('analyze/clipped', () => {
  it('fires when combined description+when_to_use exceeds the 1536-char menu limit', async () => {
    const resolved = await loadResolved(bloated);
    const findings = detectClipped(resolved);
    const names = findings.map(f => f.skillName).sort();
    expect(names).toContain('refactor-suggest');
    expect(names).toContain('feature-plan');
    for (const f of findings) {
      expect(f.cutAt).toBe(MENU_CHAR_LIMIT);
      expect(f.lost).toBeGreaterThan(0);
      expect(f.estimatedTokensReclaimed).toBeGreaterThan(0);
    }
  });

  it('does not fire for a short skill', async () => {
    const short = await makeVirtualSkill({ name: 'tiny', description: 'short description' });
    expect(detectClipped([short])).toHaveLength(0);
  });
});

describe('analyze/mismatch', () => {
  it('flags path-mismatch for rules with paths that match no files in the repo', async () => {
    const resolved = await loadResolved(bloated);
    const signals = await scanRepo(bloated);
    const findings = await detectMismatches(resolved, bloated, signals);
    const pathMismatches = findings.filter(f => f.kind === 'path-mismatch');
    const names = pathMismatches.map(f => f.path.split('/').pop() ?? '');
    expect(names).toEqual(expect.arrayContaining(['ruby-rails.md', 'java-enterprise.md', 'python-legacy.md']));
  });

  it('does not flag the typescript rule in a TS repo', async () => {
    const resolved = await loadResolved(bloated);
    const signals = await scanRepo(bloated);
    const findings = await detectMismatches(resolved, bloated, signals);
    const tsFinding = findings.find(f => f.path.endsWith('typescript.md'));
    expect(tsFinding).toBeUndefined();
  });

  it('flags language-mismatch for rules that mention absent-language keywords', async () => {
    const rule = virtualRule(
      '/virtual/.claude/rules/legacy.md',
      {},
      'Use pytest fixtures. Prefer django models over raw SQL.',
    );
    const signals = { files: {} as Record<string, number>, markers: {} as Record<string, boolean> };
    const findings = await detectMismatches([rule], '/virtual', signals);
    const lang = findings.find(f => f.kind === 'language-mismatch');
    expect(lang?.language).toBe('python');
  });
});

describe('analyze/tfidf', () => {
  it('returns 1 for identical strings', () => {
    const idx = new TfIdfIndex();
    idx.add('use pnpm install and pnpm run build');
    idx.add('use pnpm install and pnpm run build');
    expect(idx.cosine(0, 1)).toBeCloseTo(1, 5);
  });

  it('returns a low score for unrelated strings', () => {
    const idx = new TfIdfIndex();
    idx.add('use pnpm install and pnpm run build');
    idx.add('the quick brown fox jumps over the lazy dog');
    expect(idx.cosine(0, 1)).toBeLessThan(0.4);
  });
});

describe('analyze/duplicates', () => {
  it('flags two near-identical paragraphs across different files', async () => {
    const a = virtualRule(
      '/virtual/.claude/rules/a.md',
      {},
      'Branch names: feature/<ticket>-<slug>, fix/<ticket>-<slug>, chore/<slug>. Rebase, do not merge, when bringing your branch up to date. Squash-merge when landing.',
    );
    const b = virtualRule(
      '/virtual/.claude/rules/b.md',
      {},
      'Branch names: feature/<ticket>-<slug>, fix/<ticket>-<slug>, chore/<slug>. Rebase, do not merge, when bringing your branch up to date. Squash-merge when landing.',
    );
    const { duplicates } = detectDuplicates([a, b]);
    expect(duplicates.length).toBeGreaterThanOrEqual(1);
    expect(duplicates[0]!.score).toBeGreaterThan(0.85);
  });

  it('does not flag unrelated paragraphs', async () => {
    const a = virtualRule(
      '/virtual/.claude/rules/a.md',
      {},
      'Write Pothos schemas with discriminated union results. Use DataLoader everywhere to avoid N+1 queries.',
    );
    const b = virtualRule(
      '/virtual/.claude/rules/b.md',
      {},
      'Accessibility: every UI change ships with a manual review, checking keyboard navigation and color contrast.',
    );
    const { duplicates } = detectDuplicates([a, b]);
    expect(duplicates).toHaveLength(0);
  });
});

describe('analyze/conflicts — offline', () => {
  it('emits possible-conflict for each candidate, never conflict', () => {
    const candidates = [
      {
        a: { path: '/a', line: 1, text: 'Use tabs.' },
        b: { path: '/b', line: 1, text: 'Use spaces.' },
        score: 0.6,
      },
    ];
    const out = classifyOffline(candidates);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('possible-conflict');
    expect(out[0]!.note).toMatch(/ANTHROPIC_API_KEY/);
  });
});

describe('analyze/conflicts — exact', () => {
  it('only emits conflict for contradicts:true verdicts', async () => {
    const candidates = [
      { a: { path: '/a', line: 1, text: 'A1' }, b: { path: '/b', line: 1, text: 'B1' }, score: 0.7 },
      { a: { path: '/a', line: 2, text: 'A2' }, b: { path: '/b', line: 2, text: 'B2' }, score: 0.7 },
      { a: { path: '/a', line: 3, text: 'A3' }, b: { path: '/b', line: 3, text: 'B3' }, score: 0.7 },
    ];
    const classifier: ConflictClassifier = async (a, _b) => {
      return { contradicts: a.text === 'A2', why: 'mock reason' };
    };
    const findings = await classifyExact(candidates, classifier, 4);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('conflict');
    expect(findings[0]!.a.preview).toBe('A2');
  });

  it('respects the concurrency cap', async () => {
    let inFlight = 0;
    let peak = 0;
    const classifier: ConflictClassifier = async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise(r => setTimeout(r, 8));
      inFlight--;
      return { contradicts: false, why: '' };
    };
    const candidates = Array.from({ length: 20 }, (_, i) => ({
      a: { path: '/a', line: i, text: `A${i}` },
      b: { path: '/b', line: i, text: `B${i}` },
      score: 0.7,
    }));
    await classifyExact(candidates, classifier, 4);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });
});
