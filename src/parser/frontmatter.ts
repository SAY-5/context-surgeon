import matter from 'gray-matter';
import type { ParsedFile, RawFile } from '../types.js';

const HTML_BLOCK_COMMENT_RE = /<!--[\s\S]*?-->/g;
const FENCE_RE = /```[\s\S]*?```/g;
const FENCE_PLACEHOLDER_PREFIX = '\x00CS_FENCE_';
const FENCE_PLACEHOLDER_SUFFIX = '\x00';

function stripHtmlBlockComments(text: string): string {
  // Preserve comments inside fenced code blocks — matches Claude Code's documented behavior.
  const fences: string[] = [];
  const placeheld = text.replace(FENCE_RE, match => {
    fences.push(match);
    return `${FENCE_PLACEHOLDER_PREFIX}${fences.length - 1}${FENCE_PLACEHOLDER_SUFFIX}`;
  });
  const stripped = placeheld.replace(HTML_BLOCK_COMMENT_RE, '');
  return stripped.replace(
    new RegExp(`${FENCE_PLACEHOLDER_PREFIX}(\\d+)${FENCE_PLACEHOLDER_SUFFIX}`, 'g'),
    (_, idx: string) => fences[Number(idx)] ?? '',
  );
}

export function parseFile(raw: RawFile): ParsedFile {
  if (raw.kind === 'settings') {
    return {
      path: raw.path,
      kind: raw.kind,
      scope: raw.scope,
      frontmatter: {},
      body: raw.content,
      effective: raw.content,
    };
  }

  let parsed;
  try {
    parsed = matter(raw.content);
  } catch (err) {
    throw new Error(`failed to parse frontmatter in ${raw.path}: ${(err as Error).message}`);
  }

  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  const body = parsed.content ?? '';
  const effective = stripHtmlBlockComments(body);

  return {
    path: raw.path,
    kind: raw.kind,
    scope: raw.scope,
    frontmatter,
    body,
    effective,
  };
}
