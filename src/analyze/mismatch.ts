import fg from 'fast-glob';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { offlineCount } from '../tokens/offline.js';
import type { ResolvedFile } from '../types.js';

export interface PathMismatchFinding {
  kind: 'path-mismatch';
  severity: 'warning';
  path: string;
  patterns: string[];
  estimatedTokensReclaimed: number;
}

export interface LanguageMismatchFinding {
  kind: 'language-mismatch';
  severity: 'warning';
  path: string;
  language: string;
  evidence: string;
  estimatedTokensReclaimed: number;
}

export interface RepoSignals {
  files: Record<string, number>;
  markers: Record<string, boolean>;
}

const COUNTED_EXTENSIONS = [
  '.py', '.rb', '.java', '.go', '.rs', '.ts', '.tsx', '.js', '.jsx', '.cs', '.php', '.kt', '.swift',
];

const LANGUAGE_MARKERS: Record<string, string[]> = {
  python: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'],
  ruby: ['Gemfile', 'Rakefile'],
  java: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
  node: ['package.json'],
  php: ['composer.json'],
};

const LANGUAGE_EXTENSION: Record<string, string> = {
  python: '.py',
  ruby: '.rb',
  java: '.java',
  go: '.go',
  rust: '.rs',
  php: '.php',
};

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  python: ['django', 'flask', 'fastapi', 'pytest', 'pyenv', 'numpy', 'pandas', 'pydantic', 'sqlalchemy', 'alembic', 'black', 'ruff'],
  ruby: ['rails', 'rubocop', 'rspec', 'sinatra', 'bundler', 'gemfile', 'rake'],
  java: ['spring boot', 'maven', 'gradle', 'junit', 'lombok', 'hibernate', 'spring'],
  go: ['gopls', 'gorilla', 'go mod'],
  rust: ['cargo', 'clippy', 'tokio', 'serde', 'rustc'],
};

const GLOBAL_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
];

export async function scanRepo(cwd: string): Promise<RepoSignals> {
  const entries = await fg(['**/*'], {
    cwd,
    onlyFiles: true,
    dot: false,
    ignore: GLOBAL_IGNORES,
  });
  const files: Record<string, number> = {};
  for (const ext of COUNTED_EXTENSIONS) files[ext] = 0;
  for (const e of entries) {
    const idx = e.lastIndexOf('.');
    if (idx < 0) continue;
    const ext = e.slice(idx);
    files[ext] = (files[ext] ?? 0) + 1;
  }
  const markers: Record<string, boolean> = {};
  for (const [lang, names] of Object.entries(LANGUAGE_MARKERS)) {
    markers[lang] = names.some(n => existsSync(join(cwd, n))) ||
      entries.some(e => names.some(n => e.endsWith(`/${n}`) || e === n));
  }
  return { files, markers };
}

export async function detectMismatches(
  resolved: ResolvedFile[],
  cwd: string,
  signals: RepoSignals,
): Promise<Array<PathMismatchFinding | LanguageMismatchFinding>> {
  const out: Array<PathMismatchFinding | LanguageMismatchFinding> = [];
  for (const f of resolved) {
    if (f.kind !== 'rule') continue;
    const fm = f.frontmatter as Record<string, unknown>;
    const patterns = Array.isArray(fm.paths)
      ? fm.paths.filter((p): p is string => typeof p === 'string')
      : [];
    if (patterns.length > 0) {
      const matches = await fg(patterns, {
        cwd,
        onlyFiles: true,
        dot: false,
        ignore: GLOBAL_IGNORES,
      });
      if (matches.length === 0) {
        out.push({
          kind: 'path-mismatch',
          severity: 'warning',
          path: f.path,
          patterns,
          estimatedTokensReclaimed: offlineCount(f.effective),
        });
        continue;
      }
    }
    for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
      const ext = LANGUAGE_EXTENSION[lang];
      const hasFiles = ext ? (signals.files[ext] ?? 0) > 0 : false;
      const hasMarker = signals.markers[lang] ?? false;
      if (hasFiles || hasMarker) continue;
      const body = f.effective.toLowerCase();
      const hit = keywords.find(k => new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`, 'i').test(body));
      if (hit) {
        out.push({
          kind: 'language-mismatch',
          severity: 'warning',
          path: f.path,
          language: lang,
          evidence: hit,
          estimatedTokensReclaimed: offlineCount(f.effective),
        });
        break;
      }
    }
  }
  return out;
}
