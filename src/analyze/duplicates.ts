import { offlineCount } from '../tokens/offline.js';
import { splitParagraphs } from '../parser/markdown.js';
import { TfIdfIndex } from './tfidf.js';
import type { ResolvedFile } from '../types.js';

export interface IndexedParagraph {
  path: string;
  line: number;
  text: string;
}

export interface DuplicateFinding {
  kind: 'duplicate';
  severity: 'info';
  a: ParagraphRef;
  b: ParagraphRef;
  score: number;
  estimatedTokensReclaimed: number;
}

export interface CandidatePair {
  a: IndexedParagraph;
  b: IndexedParagraph;
  score: number;
}

export interface ParagraphRef {
  path: string;
  line: number;
  preview: string;
}

const MIN_PARAGRAPH_CHARS = 60;
const DUPLICATE_THRESHOLD = 0.85;
const CANDIDATE_MIN = 0.6;

export function detectDuplicates(resolved: ResolvedFile[]): {
  duplicates: DuplicateFinding[];
  candidates: CandidatePair[];
} {
  const paragraphs: IndexedParagraph[] = [];
  for (const f of resolved) {
    const paras = splitParagraphs(f.body);
    for (const p of paras) {
      const text = p.text.trim();
      if (text.length < MIN_PARAGRAPH_CHARS) continue;
      paragraphs.push({ path: f.path, line: p.lineStart + 1, text });
    }
  }

  const idx = new TfIdfIndex();
  for (const p of paragraphs) idx.add(p.text);

  const duplicates: DuplicateFinding[] = [];
  const candidates: CandidatePair[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (paragraphs[i]!.path === paragraphs[j]!.path) continue;
      const s = idx.cosine(i, j);
      const a = paragraphs[i]!;
      const b = paragraphs[j]!;
      if (s >= DUPLICATE_THRESHOLD) {
        const smaller = a.text.length <= b.text.length ? a : b;
        duplicates.push({
          kind: 'duplicate',
          severity: 'info',
          a: { path: a.path, line: a.line, preview: preview(a.text) },
          b: { path: b.path, line: b.line, preview: preview(b.text) },
          score: Math.round(s * 1000) / 1000,
          estimatedTokensReclaimed: offlineCount(smaller.text),
        });
      } else if (s >= CANDIDATE_MIN) {
        candidates.push({ a, b, score: Math.round(s * 1000) / 1000 });
      }
    }
  }
  return { duplicates, candidates };
}

export function preview(s: string): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= 80 ? clean : `${clean.slice(0, 77)}…`;
}
