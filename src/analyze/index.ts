import { detectClipped, type ClippedFinding } from './clipped.js';
import {
  detectMismatches,
  scanRepo,
  type PathMismatchFinding,
  type LanguageMismatchFinding,
} from './mismatch.js';
import { detectDuplicates, type DuplicateFinding } from './duplicates.js';
import {
  classifyExact,
  classifyOffline,
  haikuClassifier,
  type ConflictClassifier,
  type ConflictFinding,
  type PossibleConflictFinding,
} from './conflicts.js';
import type { Mode } from '../tokens/index.js';
import type { ResolvedFile } from '../types.js';

export type Finding =
  | ClippedFinding
  | PathMismatchFinding
  | LanguageMismatchFinding
  | DuplicateFinding
  | PossibleConflictFinding
  | ConflictFinding;

export interface AnalyzeOpts {
  cwd: string;
  mode: Mode;
  conflictClassifier?: ConflictClassifier;
  conflictConcurrency?: number;
}

export async function analyze(resolved: ResolvedFile[], opts: AnalyzeOpts): Promise<Finding[]> {
  const signals = await scanRepo(opts.cwd);
  const [clipped, mismatches, dup] = await Promise.all([
    Promise.resolve(detectClipped(resolved)),
    detectMismatches(resolved, opts.cwd, signals),
    Promise.resolve(detectDuplicates(resolved)),
  ]);
  let conflicts: Array<PossibleConflictFinding | ConflictFinding>;
  if (opts.mode === 'exact' && dup.candidates.length > 0) {
    const classifier = opts.conflictClassifier ?? haikuClassifier;
    conflicts = await classifyExact(dup.candidates, classifier, opts.conflictConcurrency ?? 4);
  } else {
    conflicts = classifyOffline(dup.candidates);
  }
  return [...clipped, ...mismatches, ...dup.duplicates, ...conflicts];
}

export type {
  ClippedFinding,
  ConflictClassifier,
  ConflictFinding,
  DuplicateFinding,
  LanguageMismatchFinding,
  PathMismatchFinding,
  PossibleConflictFinding,
};
