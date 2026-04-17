import { describe, expect, it } from 'vitest';
import { renderSVG } from '../src/render/svg.js';
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
      { path: '/fixture/CLAUDE.local.md', kind: 'claude-local-md', scope: 'project-local', bucket: 'project-claude', tokens: 80, label: 'CLAUDE.local.md' },
      { path: '/fixture/.claude/rules/a.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 410, label: 'a.md' },
      { path: '/fixture/.claude/rules/b.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 310, label: 'b.md' },
      { path: '/fixture/.claude/rules/c.md', kind: 'rule', scope: 'project', bucket: 'rules', tokens: 780, label: 'c.md' },
      { path: '/fixture/.claude/skills/s1/SKILL.md', kind: 'skill', scope: 'project', bucket: 'skills', tokens: 500, label: 's1' },
      { path: '/fixture/.claude/skills/s2/SKILL.md', kind: 'skill', scope: 'project', bucket: 'skills', tokens: 500, label: 's2' },
      { path: '/fixture/.claude/memory/MEMORY.md', kind: 'auto-memory', scope: 'project', bucket: 'auto-memory', tokens: 2600, label: 'MEMORY.md' },
    ],
    findings: [],
  };
}

describe('render/svg', () => {
  it('returns a well-formed SVG document', () => {
    const svg = renderSVG(fixture());
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toMatch(/viewBox="0 0 1600 900"/);
    expect(svg).toMatch(/role="img"/);
    expect(svg).toMatch(/aria-label="[^"]+"/);
  });

  it('has balanced open/close tags for the tags we author', () => {
    const svg = renderSVG(fixture());
    const count = (re: RegExp) => (svg.match(re) ?? []).length;
    expect(count(/<svg\b/g)).toBe(count(/<\/svg>/g));
    expect(count(/<g\b/g)).toBe(count(/<\/g>/g));
    expect(count(/<text\b/g)).toBe(count(/<\/text>/g));
    expect(count(/<defs\b/g)).toBe(count(/<\/defs>/g));
    expect(count(/<pattern\b/g)).toBe(count(/<\/pattern>/g));
  });

  it('renders one segment per non-empty bucket plus a room segment', () => {
    const svg = renderSVG(fixture());
    const matches = svg.match(/data-bucket="[^"]+"/g) ?? [];
    // fixture has 5 non-empty buckets (system, project-claude, rules, skills, auto-memory) + room
    expect(matches.length).toBe(6);
    expect(svg).toContain('data-bucket="system"');
    expect(svg).toContain('data-bucket="project-claude"');
    expect(svg).toContain('data-bucket="rules"');
    expect(svg).toContain('data-bucket="skills"');
    expect(svg).toContain('data-bucket="auto-memory"');
    expect(svg).toContain('data-bucket="room"');
  });

  it('surfaces the mode badge for the Report mode', () => {
    const est = renderSVG(fixture());
    expect(est).toContain('[±est]');
    const exact = renderSVG({ ...fixture(), mode: 'exact' });
    expect(exact).toContain('[exact]');
  });

  it('uses the locked palette hex values for each bucket', () => {
    const svg = renderSVG(fixture());
    expect(svg).toContain('#6e7681'); // system
    expect(svg).toContain('#fbbf24'); // project-claude
    expect(svg).toContain('#3b82f6'); // rules
    expect(svg).toContain('#a78bfa'); // auto-memory
    expect(svg).toContain('#2dd4bf'); // skills
    expect(svg).toContain('#0d1117'); // background
  });

  it('matches a stable structural skeleton snapshot', () => {
    // Strip text content and numeric attribute values so the snapshot catches
    // structural changes but not content/token-count drift.
    const raw = renderSVG(fixture());
    const structural = raw
      .replace(/>[^<]*</g, '><')
      .replace(/="[^"]*"/g, '=""')
      .replace(/\s+/g, ' ')
      .trim();
    expect(structural).toMatchInlineSnapshot(
      `"<svg xmlns="" viewBox="" role="" aria-label=""><defs><pattern id="" width="" height="" patternUnits="" patternTransform=""><rect width="" height="" fill="" /><rect width="" height="" fill="" /></pattern><pattern id="" width="" height="" patternUnits="" patternTransform=""><rect width="" height="" fill="" /><rect width="" height="" fill="" /></pattern></defs><rect width="" height="" fill="" /><g data-region=""><text x="" y="" font-family="" font-size="" font-weight="" fill=""></text><text x="" y="" font-family="" font-size="" font-weight="" fill="" text-anchor="" xml:space=""><tspan fill=""></tspan><tspan fill="" font-family="" font-size="" dx=""></tspan></text></g><g data-region=""><line x1="" y1="" x2="" y2="" stroke="" stroke-width="" /><text x="" y="" font-family="" font-size="" fill="" text-anchor=""></text><line x1="" y1="" x2="" y2="" stroke="" stroke-width="" /><text x="" y="" font-family="" font-size="" fill="" text-anchor=""></text></g><g data-region=""><rect x="" y="" width="" height="" rx="" ry="" fill="" /><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" /><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill="" text-anchor="" font-weight=""></text><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" /><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill="" text-anchor="" font-weight=""></text><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" /><rect data-bucket="" x="" y="" width="" height="" rx="" ry="" fill="" stroke="" stroke-width="" /></g><g data-region=""><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text><rect x="" y="" width="" height="" rx="" ry="" fill="" /><text x="" y="" font-family="" font-size="" fill=""></text><text x="" y="" font-family="" font-size="" fill=""></text></g><g data-region=""><text x="" y="" font-family="" font-size="" fill=""></text></g></svg>"`,
    );
  });
});
