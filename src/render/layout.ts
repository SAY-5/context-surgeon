import type { Bucket, Report, SourceCount } from '../report/compose.js';

export interface RolledBucket {
  bucket: Bucket;
  tokens: number;
  count: number;
}

export interface SegmentLayout {
  bucket: Bucket;
  tokens: number;
  count: number;
  /** offset from bar start, 0-based */
  offset: number;
  width: number;
}

export const BUCKET_ORDER: Bucket[] = [
  'system',
  'user-claude',
  'project-claude',
  'imports',
  'rules',
  'auto-memory',
  'skills',
];

// Rhetorical framing: the bar's "room for your prompt" sliver represents
// what's left for a *realistic* user turn, not the raw 200K window. That
// makes the visual match how developers think about it — "how much of my
// config budget is going to bloat" — rather than how large the window is.
export const TYPICAL_PROMPT_TOKENS = 3500;

// Hard cap so a dumpster-fire fixture (50K+ always-on) still leaves a
// visible hatched sliver on the right for the eye to register.
export const MAX_FILLED_FRACTION = 0.9;

export function rollUp(sources: SourceCount[]): RolledBucket[] {
  const map = new Map<Bucket, RolledBucket>();
  for (const s of sources) {
    const row = map.get(s.bucket) ?? { bucket: s.bucket, tokens: 0, count: 0 };
    row.tokens += s.tokens;
    row.count += 1;
    map.set(s.bucket, row);
  }
  const rows: RolledBucket[] = [];
  for (const b of BUCKET_ORDER) {
    const row = map.get(b);
    if (row && row.tokens > 0) rows.push(row);
  }
  return rows;
}

export function filledFraction(usedTokens: number): number {
  if (usedTokens <= 0) return 0;
  return Math.min(MAX_FILLED_FRACTION, usedTokens / (usedTokens + TYPICAL_PROMPT_TOKENS));
}

export interface LayoutOpts {
  /** minimum width per filled segment (e.g. 1 char for terminal, 2-4px for svg) */
  minFilledSegmentWidth?: number;
}

export function layoutSegments(report: Report, barWidth: number, opts: LayoutOpts = {}): SegmentLayout[] {
  const minSeg = opts.minFilledSegmentWidth ?? 2;
  const rolled = rollUp(report.sources);
  const usedTokens = rolled.reduce((s, r) => s + r.tokens, 0);
  const frac = filledFraction(usedTokens);
  const filledWidth = Math.round(barWidth * frac);
  const roomWidth = Math.max(0, barWidth - filledWidth);
  const roomTokens = Math.max(0, report.contextWindow - usedTokens);

  const filledWidths = allocateProportional(rolled.map(r => r.tokens), filledWidth, minSeg);

  let cursor = 0;
  const segs: SegmentLayout[] = rolled.map((r, i) => {
    const seg: SegmentLayout = {
      bucket: r.bucket,
      tokens: r.tokens,
      count: r.count,
      offset: cursor,
      width: filledWidths[i]!,
    };
    cursor += filledWidths[i]!;
    return seg;
  });
  segs.push({
    bucket: 'room',
    tokens: roomTokens,
    count: 0,
    offset: cursor,
    width: roomWidth,
  });
  return segs;
}

function allocateProportional(tokens: number[], totalWidth: number, minSeg: number): number[] {
  if (tokens.length === 0 || totalWidth <= 0) return tokens.map(() => 0);
  const total = tokens.reduce((a, b) => a + b, 0);
  if (total === 0) return tokens.map(() => 0);
  const raw = tokens.map(t => (t / total) * totalWidth);
  const widths = raw.map(x => Math.max(minSeg, Math.round(x)));
  let sum = widths.reduce((a, b) => a + b, 0);
  while (sum > totalWidth) {
    const idx = widths.indexOf(Math.max(...widths));
    if (widths[idx]! <= minSeg) break;
    widths[idx]! -= 1;
    sum -= 1;
  }
  while (sum < totalWidth) {
    const idx = widths.indexOf(Math.max(...widths));
    widths[idx]! += 1;
    sum += 1;
  }
  return widths;
}
