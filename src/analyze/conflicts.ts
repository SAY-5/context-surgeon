import type { CandidatePair, IndexedParagraph, ParagraphRef } from './duplicates.js';
import { preview } from './duplicates.js';

export interface PossibleConflictFinding {
  kind: 'possible-conflict';
  severity: 'info';
  a: ParagraphRef;
  b: ParagraphRef;
  score: number;
  note: string;
  estimatedTokensReclaimed: number;
}

export interface ConflictFinding {
  kind: 'conflict';
  severity: 'warning';
  a: ParagraphRef;
  b: ParagraphRef;
  score: number;
  why: string;
  estimatedTokensReclaimed: number;
}

export type ConflictClassifier = (
  a: IndexedParagraph,
  b: IndexedParagraph,
) => Promise<{ contradicts: boolean; why: string }>;

async function mapWithConcurrency<T, U>(
  items: T[],
  cap: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;
  const workers: Array<Promise<void>> = [];
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!);
    }
  };
  for (let i = 0; i < Math.min(cap, items.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

export function classifyOffline(candidates: CandidatePair[]): PossibleConflictFinding[] {
  return candidates.map(p => ({
    kind: 'possible-conflict' as const,
    severity: 'info' as const,
    a: { path: p.a.path, line: p.a.line, preview: preview(p.a.text) },
    b: { path: p.b.path, line: p.b.line, preview: preview(p.b.text) },
    score: p.score,
    note: 'similar topic — review manually, or set ANTHROPIC_API_KEY for automated classification',
    estimatedTokensReclaimed: 0,
  }));
}

export async function classifyExact(
  candidates: CandidatePair[],
  classifier: ConflictClassifier,
  concurrency = 4,
): Promise<ConflictFinding[]> {
  if (candidates.length === 0) return [];
  const verdicts = await mapWithConcurrency(candidates, concurrency, p => classifier(p.a, p.b));
  const out: ConflictFinding[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i]!;
    const v = verdicts[i]!;
    if (v.contradicts) {
      out.push({
        kind: 'conflict',
        severity: 'warning',
        a: { path: p.a.path, line: p.a.line, preview: preview(p.a.text) },
        b: { path: p.b.path, line: p.b.line, preview: preview(p.b.text) },
        score: p.score,
        why: v.why,
        estimatedTokensReclaimed: 0,
      });
    }
  }
  return out;
}

export async function haikuClassifier(
  a: IndexedParagraph,
  b: IndexedParagraph,
): Promise<{ contradicts: boolean; why: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required for exact conflict classification');
  const sdk = (await import('@anthropic-ai/sdk')) as unknown as {
    default: new (opts: { apiKey: string }) => {
      messages: {
        create(args: {
          model: string;
          max_tokens: number;
          messages: Array<{ role: 'user'; content: string }>;
        }): Promise<{ content: Array<{ type: string; text?: string }> }>;
      };
    };
  };
  const client = new sdk.default({ apiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content:
          `Two rules from the same codebase are below. Do they contradict — is it impossible to follow both at once?\n\n` +
          `Respond with JSON only, nothing else: {"contradicts": true|false, "why": "one short sentence"}\n\n` +
          `Rule A (from ${a.path}):\n${a.text}\n\n` +
          `Rule B (from ${b.path}):\n${b.text}`,
      },
    ],
  });
  const block = response.content[0];
  const text = block?.type === 'text' ? block.text ?? '' : '';
  try {
    const json = JSON.parse(text.trim()) as { contradicts?: unknown; why?: unknown };
    return {
      contradicts: Boolean(json.contradicts),
      why: typeof json.why === 'string' ? json.why : '',
    };
  } catch {
    return { contradicts: false, why: 'unparseable verdict' };
  }
}
