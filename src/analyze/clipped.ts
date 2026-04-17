import { offlineCount } from '../tokens/offline.js';
import type { ResolvedFile } from '../types.js';

export interface ClippedFinding {
  kind: 'clipped';
  severity: 'warning';
  path: string;
  skillName: string;
  totalChars: number;
  cutAt: number;
  lost: number;
  estimatedTokensReclaimed: number;
}

export const MENU_CHAR_LIMIT = 1536;

export function detectClipped(resolved: ResolvedFile[]): ClippedFinding[] {
  const out: ClippedFinding[] = [];
  for (const f of resolved) {
    if (f.kind !== 'skill') continue;
    const fm = f.frontmatter as Record<string, unknown>;
    const desc = typeof fm.description === 'string' ? fm.description : '';
    const when = typeof fm.when_to_use === 'string' ? fm.when_to_use : '';
    const combined = when ? `${desc}\n${when}` : desc;
    if (combined.length > MENU_CHAR_LIMIT) {
      const overflow = combined.slice(MENU_CHAR_LIMIT);
      out.push({
        kind: 'clipped',
        severity: 'warning',
        path: f.path,
        skillName: typeof fm.name === 'string' ? fm.name : skillNameFromPath(f.path),
        totalChars: combined.length,
        cutAt: MENU_CHAR_LIMIT,
        lost: combined.length - MENU_CHAR_LIMIT,
        estimatedTokensReclaimed: offlineCount(overflow),
      });
    }
  }
  return out;
}

function skillNameFromPath(path: string): string {
  const m = path.match(/skills\/([^/]+)\//);
  return m?.[1] ?? path;
}
