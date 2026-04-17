import chalk from 'chalk';
import { formatCount, modeBadge } from '../tokens/index.js';
import type { Bucket, Report } from '../report/compose.js';
import { layoutSegments } from './layout.js';

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

function padToCols(left: string, right: string, width: number, widthFn: (s: string) => number): string {
  const gap = Math.max(1, width - widthFn(left) - widthFn(right));
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
  const segs = layoutSegments(report, barWidth, { minFilledSegmentWidth: 1 });

  const lines: string[] = [];

  const title = chalk.hex('#e6edf3').bold('Your context, before you type');
  const totalColored =
    chalk.hex('#e6edf3')(`${formatCount(report.total, report.mode)}`) +
    chalk.hex('#6e7681')(` / ${formatCount(report.contextWindow, report.mode)} tokens  `) +
    chalk.hex('#8b949e')(modeBadge(report.mode));
  lines.push(padToCols(title, totalColored, width, visibleLength));
  lines.push('');

  // bar
  let bar = '';
  for (const seg of segs) {
    if (seg.width <= 0) continue;
    const color = PALETTE[seg.bucket];
    const ch = seg.bucket === 'room' ? '░' : '█';
    bar += chalk.hex(color)(ch.repeat(seg.width));
  }
  lines.push(` ${bar}`);
  lines.push('');

  // legend, 3 per row
  const legendItems: Array<{ bucket: Bucket; label: string; tokens: number; count: number }> = segs
    .filter(s => s.tokens > 0)
    .map(s => ({
      bucket: s.bucket,
      label: s.bucket === 'room' ? 'room for your prompt' : BUCKET_LABEL[s.bucket],
      tokens: s.tokens,
      count: s.count,
    }));
  const legendCell = (it: { bucket: Bucket; label: string; tokens: number; count: number }): string => {
    const swatch = chalk.hex(PALETTE[it.bucket])('■');
    const suffix = it.bucket === 'room' || it.count === 0 ? '' : ` (${it.count})`;
    const name = chalk.hex('#e6edf3')(`${it.label}${suffix}`);
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

  if (report.findings.length === 0) {
    lines.push(chalk.hex('#8b949e')(' [ ] no findings yet — analyzers ship in next commit batch.'));
  } else {
    const warn = report.findings.filter(f => f.severity === 'warning').length;
    const info = report.findings.filter(f => f.severity === 'info').length;
    lines.push(
      chalk.hex('#f87171')(` [!] ${warn} warning${warn === 1 ? '' : 's'}`) +
        chalk.hex('#8b949e')(`, ${info} note${info === 1 ? '' : 's'}`),
    );
  }
  lines.push('');

  return lines.join('\n');
}
