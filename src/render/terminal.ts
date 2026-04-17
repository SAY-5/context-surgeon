import chalk from 'chalk';
import { formatCount, modeBadge } from '../tokens/index.js';
import type { Bucket, Report, SourceCount } from '../report/compose.js';

const PALETTE: Record<Bucket, string> = {
  system: '#6e7681',
  'user-claude': '#f59e0b',
  'project-claude': '#fbbf24',
  rules: '#3b82f6',
  'auto-memory': '#a78bfa',
  skills: '#2dd4bf',
  imports: '#c084fc',
  room: '#30363d',
};

const BUCKET_ORDER: Bucket[] = [
  'system',
  'user-claude',
  'project-claude',
  'imports',
  'rules',
  'auto-memory',
  'skills',
];

const BUCKET_LABEL: Record<Bucket, string> = {
  system: 'sys prompt',
  'user-claude': '~/CLAUDE.md',
  'project-claude': 'project CLAUDE.md',
  rules: '.claude/rules/',
  'auto-memory': 'auto-memory',
  skills: 'skill metadata',
  imports: '@imports',
  room: 'room for your prompt',
};

interface BucketRow {
  bucket: Bucket;
  tokens: number;
  count: number;
}

function rollUp(sources: SourceCount[]): BucketRow[] {
  const map = new Map<Bucket, BucketRow>();
  for (const s of sources) {
    const row = map.get(s.bucket) ?? { bucket: s.bucket, tokens: 0, count: 0 };
    row.tokens += s.tokens;
    row.count += 1;
    map.set(s.bucket, row);
  }
  const rows: BucketRow[] = [];
  for (const b of BUCKET_ORDER) {
    const row = map.get(b);
    if (row && row.tokens > 0) rows.push(row);
  }
  return rows;
}

function allocateWidths(
  segments: Array<{ tokens: number }>,
  totalWindow: number,
  barWidth: number,
): number[] {
  const raw = segments.map(s => (s.tokens / totalWindow) * barWidth);
  const widths = raw.map(x => Math.max(1, Math.round(x)));
  let sum = widths.reduce((a, b) => a + b, 0);
  if (sum > barWidth) {
    while (sum > barWidth) {
      const idx = widths.indexOf(Math.max(...widths));
      widths[idx]! -= 1;
      sum -= 1;
    }
  }
  return widths;
}

function padToCols(left: string, right: string, width: number, stripWidth: (s: string) => number): string {
  const gap = Math.max(1, width - stripWidth(left) - stripWidth(right));
  return `${left}${' '.repeat(gap)}${right}`;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;
export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}
function visibleLength(s: string): number {
  return stripAnsi(s).length;
}

export interface RenderOpts {
  width?: number;
}

export function renderTerminal(report: Report, opts: RenderOpts = {}): string {
  const width = Math.max(60, opts.width ?? process.stdout.columns ?? 80);
  const barWidth = width - 2;
  const used = report.sources.reduce((s, x) => s + x.tokens, 0);
  const roomTokens = Math.max(0, report.contextWindow - used);

  const rows = rollUp(report.sources);
  const segments = [
    ...rows.map(r => ({ bucket: r.bucket, tokens: r.tokens })),
    { bucket: 'room' as Bucket, tokens: roomTokens },
  ];
  const widths = allocateWidths(segments, report.contextWindow, barWidth);

  const lines: string[] = [];

  // title row
  const title = chalk.hex('#e6edf3').bold('Your context, before you type');
  const totalStr = `${formatCount(report.total, report.mode)} / ${formatCount(report.contextWindow, report.mode)} tokens  ${chalk.hex('#8b949e')(modeBadge(report.mode))}`;
  const totalColored = chalk.hex('#e6edf3')(`${formatCount(report.total, report.mode)}`) +
    chalk.hex('#6e7681')(` / ${formatCount(report.contextWindow, report.mode)} tokens  `) +
    chalk.hex('#8b949e')(modeBadge(report.mode));
  void totalStr;
  lines.push(padToCols(title, totalColored, width, visibleLength));
  lines.push('');

  // bar row
  let bar = '';
  segments.forEach((seg, i) => {
    const w = widths[i]!;
    const color = PALETTE[seg.bucket];
    const ch = seg.bucket === 'room' ? '░' : '█';
    bar += chalk.hex(color)(ch.repeat(w));
  });
  lines.push(` ${bar}`);
  lines.push('');

  // legend: two rows, three per row
  const legendItems = [
    ...rows.map(r => ({
      bucket: r.bucket,
      label: `${BUCKET_LABEL[r.bucket]} (${r.count})`,
      tokens: r.tokens,
    })),
    { bucket: 'room' as Bucket, label: 'room for your prompt', tokens: roomTokens },
  ];
  const legendCell = (it: { bucket: Bucket; label: string; tokens: number }): string => {
    const swatch = chalk.hex(PALETTE[it.bucket])('■');
    const name = chalk.hex('#e6edf3')(it.label);
    const cnt = chalk.hex('#8b949e')(formatCount(it.tokens, report.mode));
    return `${swatch} ${name}  ${cnt}`;
  };
  const cellWidth = Math.floor((width - 2) / 3);
  const formatCell = (cell: string): string => {
    const len = visibleLength(cell);
    return cell + ' '.repeat(Math.max(1, cellWidth - len));
  };
  for (let i = 0; i < legendItems.length; i += 3) {
    const row = legendItems.slice(i, i + 3).map(legendCell).map(formatCell).join('');
    lines.push(` ${row.trimEnd()}`);
  }
  lines.push('');

  // findings
  if (report.findings.length === 0) {
    lines.push(chalk.hex('#8b949e')(' [ ] no findings yet — analyzers ship in next commit batch.'));
  } else {
    const crit = report.findings.filter(f => f.severity === 'critical').length;
    const warn = report.findings.filter(f => f.severity === 'warn').length;
    lines.push(chalk.hex('#f87171')(` [!] ${crit} critical, ${warn} warning finding(s)`));
    for (const f of report.findings) {
      const mark = f.severity === 'critical' ? chalk.hex('#f87171')('▸') : chalk.hex('#fbbf24')('▸');
      lines.push(`   ${mark} ${f.summary}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
