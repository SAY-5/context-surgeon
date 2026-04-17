import { basename } from 'node:path';
import type { Finding } from '../analyze/index.js';

export interface FindingSummary {
  severity: 'warning' | 'info';
  kind: Finding['kind'];
  line: string;
  short: string;
  impact: number;
}

const KIND_ORDER: Record<Finding['kind'], number> = {
  clipped: 0,
  'path-mismatch': 1,
  'language-mismatch': 2,
  duplicate: 3,
  conflict: 4,
  'possible-conflict': 5,
};

function rel(path: string): string {
  const i = path.indexOf('/examples/bloated/');
  if (i >= 0) return path.slice(i + '/examples/bloated/'.length);
  const claudeIdx = path.indexOf('/.claude/');
  if (claudeIdx >= 0) return '.' + path.slice(claudeIdx);
  return basename(path);
}

export function summarize(f: Finding): FindingSummary {
  switch (f.kind) {
    case 'clipped':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `clipped skill-description: ${f.skillName} loses ${f.lost} chars past the 1,536 limit`,
        short: `clipped: ${f.skillName} · -${f.lost}ch`,
        impact: f.estimatedTokensReclaimed,
      };
    case 'path-mismatch':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `rule never applies: ${basename(f.path)} matches no files in this repo`,
        short: `never applies: ${basename(f.path)}`,
        impact: f.estimatedTokensReclaimed,
      };
    case 'language-mismatch':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `rule references ${f.language}, repo has no ${f.language} markers (${basename(f.path)})`,
        short: `${f.language} in non-${f.language} repo: ${basename(f.path)}`,
        impact: f.estimatedTokensReclaimed,
      };
    case 'duplicate':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `duplicate text: ${rel(f.a.path)}:${f.a.line} ↔ ${rel(f.b.path)}:${f.b.line}`,
        short: `duplicate: ${basename(f.a.path)} ↔ ${basename(f.b.path)}`,
        impact: f.estimatedTokensReclaimed,
      };
    case 'possible-conflict':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `similar topic — review manually: ${rel(f.a.path)}:${f.a.line} ↔ ${rel(f.b.path)}:${f.b.line}`,
        short: `similar: ${basename(f.a.path)} ↔ ${basename(f.b.path)}`,
        impact: f.estimatedTokensReclaimed,
      };
    case 'conflict':
      return {
        severity: f.severity,
        kind: f.kind,
        line: `contradicts: ${f.why}`,
        short: `contradicts: ${basename(f.a.path)} ↔ ${basename(f.b.path)}`,
        impact: f.estimatedTokensReclaimed,
      };
  }
}

export function orderedSummaries(findings: Finding[]): FindingSummary[] {
  return findings
    .map(summarize)
    .sort((a, b) => {
      const ko = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      if (ko !== 0) return ko;
      return b.impact - a.impact;
    });
}

export function totalReclaim(findings: Finding[]): number {
  return findings.reduce((sum, f) => sum + (f.estimatedTokensReclaimed ?? 0), 0);
}
