import { describe, expect, it } from 'vitest';
import { renderPNG } from '../src/render/png.js';
import type { Report } from '../src/report/compose.js';

function fixture(): Report {
  return {
    cwd: '/fixture/project',
    total: 16_500,
    contextWindow: 200_000,
    mode: 'estimate',
    includeHome: false,
    systemPromptTokens: 1000,
    sources: [
      { path: '<system prompt>', kind: 'system', scope: 'managed', bucket: 'system', tokens: 1000, label: 'system prompt' },
      { path: '/fixture/CLAUDE.md', kind: 'claude-md', scope: 'project', bucket: 'project-claude', tokens: 10_200, label: 'CLAUDE.md' },
      { path: '/fixture/.claude/rules/a.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 500, label: 'a.md' },
      { path: '/fixture/.claude/skills/s1/SKILL.md', kind: 'skill', scope: 'project', bucket: 'skills', tokens: 500, label: 's1' },
      { path: '/fixture/.claude/memory/MEMORY.md', kind: 'auto-memory', scope: 'project', bucket: 'auto-memory', tokens: 2600, label: 'MEMORY.md' },
    ],
    findings: [],
  };
}

describe('render/png', () => {
  it('emits a valid PNG with the requested pixel width', async () => {
    const png = await renderPNG(fixture(), { width: 1600, height: 900 });
    // PNG magic: \x89PNG\r\n\x1a\n
    expect(png[0]).toBe(0x89);
    expect(png.slice(1, 4).toString('latin1')).toBe('PNG');
    expect(png[4]).toBe(0x0d);
    expect(png[5]).toBe(0x0a);
    // IHDR chunk: width at bytes 16-19 (big-endian uint32)
    const width = png.readUInt32BE(16);
    expect(width).toBe(1600);
  });

  it('renders in a reasonable byte range for the hero fixture', async () => {
    const png = await renderPNG(fixture(), { width: 1600, height: 900 });
    expect(png.length).toBeGreaterThan(10_000);
    expect(png.length).toBeLessThan(500_000);
  });
});
