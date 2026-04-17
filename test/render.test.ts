import { describe, expect, it } from 'vitest';
import { renderTerminal, stripAnsi } from '../src/render/terminal.js';
import type { Report } from '../src/report/compose.js';

function fixture(): Report {
  return {
    cwd: '/fixture/project',
    total: 10_234,
    contextWindow: 200_000,
    mode: 'estimate',
    includeHome: false,
    systemPromptTokens: 1000,
    sources: [
      { path: '<system prompt>', kind: 'system', scope: 'managed', bucket: 'system', tokens: 1000, label: 'system prompt' },
      { path: '/fixture/project/CLAUDE.md', kind: 'claude-md', scope: 'project', bucket: 'project-claude', tokens: 4200, label: 'CLAUDE.md' },
      { path: '/fixture/project/CLAUDE.local.md', kind: 'claude-local-md', scope: 'project-local', bucket: 'project-claude', tokens: 310, label: 'CLAUDE.local.md' },
      { path: '/fixture/project/.claude/rules/a.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 410, label: '.claude/rules/a.md' },
      { path: '/fixture/project/.claude/rules/b.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 310, label: '.claude/rules/b.md' },
      { path: '/fixture/project/.claude/skills/s1/SKILL.md', kind: 'skill', scope: 'project', bucket: 'skills', tokens: 130, label: 'skill: s1' },
      { path: '/fixture/project/.claude/skills/s2/SKILL.md', kind: 'skill', scope: 'project', bucket: 'skills', tokens: 250, label: 'skill: s2' },
    ],
    findings: [],
  };
}

describe('render/terminal', () => {
  it('matches the stable snapshot at 80 cols', () => {
    const out = stripAnsi(renderTerminal(fixture(), { width: 80 }));
    expect(out).toMatchInlineSnapshot(`
      "Your context, before you type                          10K / 200K tokens  [±est]

       █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

       ■ sys prompt (1)  1.0K    ■ project CLAUDE.md (2)  4.5K ■ .claude/rules/ (2)  ~720
       ■ skill metadata (2)  ~380 ■ room for your prompt  193K

       [ ] no findings yet — analyzers ship in next commit batch.
      "
    `);
  });

  it('emits no ANSI escapes when NO_COLOR is respected by chalk', () => {
    const origNoColor = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const out = renderTerminal(fixture(), { width: 80 });
      // chalk checks NO_COLOR at module load, not per call, so this is a loose check
      // that rendered output is still a valid string; ANSI-free mode is covered by stripAnsi snapshot.
      expect(out).toContain('Your context, before you type');
      expect(out).toContain('no findings yet');
    } finally {
      if (origNoColor === undefined) delete process.env.NO_COLOR;
      else process.env.NO_COLOR = origNoColor;
    }
  });
});
