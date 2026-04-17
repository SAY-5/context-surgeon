import { formatCount, modeBadge } from '../tokens/index.js';
import type { Bucket, Report } from '../report/compose.js';
import { layoutSegments, type SegmentLayout } from './layout.js';

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

const VIEWBOX_W = 1600;
const VIEWBOX_H = 900;
const BAR_X = 200;
const BAR_Y = 340;
const BAR_W = 1200;
const BAR_H = 56;

const TITLE_Y = 240;
const LEGEND_Y = 460;
const FINDINGS_Y = 560;

const FONT_INTER = 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
const FONT_MONO = 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace';

const TEXT_PRIMARY = '#e6edf3';
const TEXT_SECONDARY = '#8b949e';
const TEXT_MUTED = '#6e7681';

function geomSegments(report: Report): SegmentLayout[] {
  const segs = layoutSegments(report, BAR_W, { minFilledSegmentWidth: 4 });
  return segs.map(s => ({ ...s, offset: s.offset + BAR_X }));
}

function escape(s: string): string {
  return s.replace(/[<>&"']/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

function approxCharWidth(fontPx: number): number {
  return fontPx * 0.58;
}

interface Placed {
  labelX: number;
  labelEndX: number;
  lane: number;
}

interface LeaderLane {
  labelBaseline: number;
  lineTop: number;
}

const LANES: LeaderLane[] = [
  { labelBaseline: 316, lineTop: 320 },
  { labelBaseline: 296, lineTop: 300 },
  { labelBaseline: 276, lineTop: 280 },
];

function renderLeaders(segs: SegmentLayout[]): string {
  const narrow = segs.filter(s => s.bucket !== 'room' && s.width < 80);
  narrow.sort((a, b) => a.offset - b.offset);
  const placed: Placed[] = [];
  const parts: string[] = [];
  const labelFont = 12;
  const charW = approxCharWidth(labelFont);
  const gap = 10;

  for (const seg of narrow) {
    const label = BUCKET_LABEL[seg.bucket];
    const labelW = label.length * charW;
    const segCenter = seg.offset + seg.width / 2;
    const labelX = segCenter - labelW / 2;
    const labelEndX = labelX + labelW;

    let laneIdx = -1;
    for (let i = 0; i < LANES.length; i++) {
      const collides = placed.some(
        p => p.lane === i && !(labelEndX + gap < p.labelX || p.labelEndX + gap < labelX),
      );
      if (!collides) {
        laneIdx = i;
        break;
      }
    }
    if (laneIdx < 0) continue;

    const lane = LANES[laneIdx]!;
    placed.push({ labelX, labelEndX, lane: laneIdx });

    parts.push(
      `    <line x1="${segCenter}" y1="${BAR_Y}" x2="${segCenter}" y2="${lane.lineTop}" stroke="${TEXT_MUTED}" stroke-width="1" />`,
    );
    parts.push(
      `    <text x="${segCenter}" y="${lane.labelBaseline}" font-family="${FONT_INTER}" font-size="${labelFont}" fill="${TEXT_SECONDARY}" text-anchor="middle">${escape(label)}</text>`,
    );
  }
  return parts.join('\n');
}

function renderSegments(segs: SegmentLayout[]): string {
  const parts: string[] = [];
  for (const seg of segs) {
    const fill = seg.bucket === 'room' ? 'url(#hatch)' : PALETTE[seg.bucket];
    const extra = seg.bucket === 'room' ? ' stroke="#30363d" stroke-width="1"' : '';
    parts.push(
      `    <rect data-bucket="${seg.bucket}" x="${seg.offset}" y="${BAR_Y}" width="${seg.width}" height="${BAR_H}" rx="4" ry="4" fill="${fill}"${extra} />`,
    );
    if (seg.width >= 140 && seg.bucket !== 'room') {
      const cx = seg.offset + seg.width / 2;
      parts.push(
        `    <text x="${cx}" y="${BAR_Y + BAR_H / 2 + 4}" font-family="${FONT_INTER}" font-size="13" fill="#0d1117" text-anchor="middle" font-weight="500">${escape(BUCKET_LABEL[seg.bucket])}</text>`,
      );
    }
  }
  return parts.join('\n');
}

function renderLegend(segs: SegmentLayout[], report: Report): string {
  const entries = segs.filter(s => s.tokens > 0);
  const cols = 3;
  const cellW = Math.floor(BAR_W / cols);
  const rowH = 28;
  const parts: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const seg = entries[i]!;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = BAR_X + col * cellW;
    const y = LEGEND_Y + row * rowH;
    const swatchColor = seg.bucket === 'room' ? 'url(#hatchSmall)' : PALETTE[seg.bucket];
    const label = seg.bucket === 'room' ? 'room for your prompt' : BUCKET_LABEL[seg.bucket];
    const countSuffix = seg.bucket === 'room' || seg.count === 0 ? '' : ` (${seg.count})`;
    const tokensStr = formatCount(seg.tokens, report.mode);
    parts.push(
      `    <rect x="${x}" y="${y - 12}" width="14" height="14" rx="2" ry="2" fill="${swatchColor}" />`,
    );
    parts.push(
      `    <text x="${x + 22}" y="${y}" font-family="${FONT_INTER}" font-size="13" fill="${TEXT_PRIMARY}">${escape(label + countSuffix)}</text>`,
    );
    parts.push(
      `    <text x="${x + 22 + (label.length + countSuffix.length) * approxCharWidth(13) + 12}" y="${y}" font-family="${FONT_MONO}" font-size="13" fill="${TEXT_SECONDARY}">${escape(tokensStr)}</text>`,
    );
  }
  return parts.join('\n');
}

function renderFindings(report: Report): string {
  if (report.findings.length === 0) {
    return `    <text x="${BAR_X}" y="${FINDINGS_Y}" font-family="${FONT_INTER}" font-size="13" fill="${TEXT_MUTED}">[ ] no findings yet — analyzers ship in next commit batch.</text>`;
  }
  const crit = report.findings.filter(f => f.severity === 'critical').length;
  const warn = report.findings.filter(f => f.severity === 'warn').length;
  return `    <text x="${BAR_X}" y="${FINDINGS_Y}" font-family="${FONT_INTER}" font-size="13" fill="#f87171">[!] ${crit} critical, ${warn} warning finding(s)</text>`;
}

export function renderSVG(report: Report): string {
  const segs = geomSegments(report);
  const totalStr = formatCount(report.total, report.mode);
  const windowStr = formatCount(report.contextWindow, report.mode);
  const badge = modeBadge(report.mode);
  const sourceCount = report.sources.length;
  const ariaLabel = `Claude Code context: ${totalStr} of ${windowStr} tokens used by ${sourceCount} always-on source${sourceCount === 1 ? '' : 's'}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}" role="img" aria-label="${escape(ariaLabel)}">
  <defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#0d1117" />
      <rect width="2" height="6" fill="#21262d" />
    </pattern>
    <pattern id="hatchSmall" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="#0d1117" />
      <rect width="1.5" height="4" fill="#21262d" />
    </pattern>
  </defs>

  <rect width="${VIEWBOX_W}" height="${VIEWBOX_H}" fill="#0d1117" />

  <g data-region="title">
    <text x="${BAR_X}" y="${TITLE_Y}" font-family="${FONT_INTER}" font-size="28" font-weight="500" fill="${TEXT_PRIMARY}">Your context, before you type</text>
    <text x="${BAR_X + BAR_W}" y="${TITLE_Y}" font-family="${FONT_MONO}" font-size="28" font-weight="500" fill="${TEXT_PRIMARY}" text-anchor="end" xml:space="preserve">${escape(totalStr)}<tspan fill="${TEXT_MUTED}"> / ${escape(windowStr)} tokens</tspan><tspan fill="${TEXT_SECONDARY}" font-family="${FONT_INTER}" font-size="18" dx="12">${escape(badge)}</tspan></text>
  </g>

  <g data-region="leaders">
${renderLeaders(segs)}
  </g>

  <g data-region="bar">
    <rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="4" ry="4" fill="#161b22" />
${renderSegments(segs)}
  </g>

  <g data-region="legend">
${renderLegend(segs, report)}
  </g>

  <g data-region="findings">
${renderFindings(report)}
  </g>
</svg>
`;
}
