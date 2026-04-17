import { describe, expect, it } from 'vitest';
import { parseFile } from '../src/parser/frontmatter.js';
import type { RawFile } from '../src/types.js';

function raw(content: string, kind: RawFile['kind'] = 'claude-md'): RawFile {
  return { path: '/virtual/test.md', content, kind, scope: 'project' };
}

describe('parser/frontmatter', () => {
  it('strips HTML block comments from effective content', () => {
    const f = parseFile(
      raw('# title\n<!-- maintainer note: keep this short -->\nbody line\n'),
    );
    expect(f.effective).not.toContain('maintainer note');
    expect(f.effective).toContain('body line');
    expect(f.body).toContain('maintainer note');
  });

  it('preserves HTML comments inside fenced code blocks', () => {
    const content =
      '# title\n\n```html\n<!-- this comment is inside a fence -->\n```\n\n<!-- this one is outside -->\n';
    const f = parseFile(raw(content));
    expect(f.effective).toContain('this comment is inside a fence');
    expect(f.effective).not.toContain('this one is outside');
  });

  it('parses YAML frontmatter into a typed object', () => {
    const content = '---\nname: widget\npaths:\n  - "src/**/*.ts"\n---\n\nbody\n';
    const f = parseFile(raw(content, 'rule'));
    expect(f.frontmatter.name).toBe('widget');
    expect(f.frontmatter.paths).toEqual(['src/**/*.ts']);
    expect(f.body.trim()).toBe('body');
  });

  it('handles files with no frontmatter', () => {
    const f = parseFile(raw('just plain content\n'));
    expect(f.frontmatter).toEqual({});
    expect(f.body.trim()).toBe('just plain content');
  });

  it('throws a path-aware error on malformed frontmatter', () => {
    expect(() =>
      parseFile(raw('---\nname: widget\n  bad: indent\n---\nbody\n')),
    ).toThrow(/test\.md/);
  });

  it('treats settings.json files as opaque (no YAML parse)', () => {
    const f = parseFile(raw('{"permissions": {"deny": ["Read"]}}', 'settings'));
    expect(f.frontmatter).toEqual({});
    expect(f.effective).toContain('permissions');
  });
});
