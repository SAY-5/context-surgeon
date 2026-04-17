import { offlineCount } from './offline.js';
import { exactCount, DEFAULT_EXACT_MODEL } from './exact.js';

export type Mode = 'estimate' | 'exact';

export interface CountResult {
  tokens: number;
  mode: Mode;
}

export interface CountOpts {
  force?: Mode;
  model?: string;
}

export function preferredMode(opts: CountOpts = {}): Mode {
  if (opts.force) return opts.force;
  return process.env.ANTHROPIC_API_KEY ? 'exact' : 'estimate';
}

export async function count(text: string, opts: CountOpts = {}): Promise<CountResult> {
  const mode = preferredMode(opts);
  if (mode === 'exact') {
    const tokens = await exactCount(text, opts.model ?? DEFAULT_EXACT_MODEL);
    return { tokens, mode };
  }
  return { tokens: offlineCount(text), mode };
}

export function formatCount(n: number, mode: Mode): string {
  if (mode === 'exact') {
    return n.toLocaleString('en-US');
  }
  return formatEstimate(n);
}

function formatEstimate(n: number): string {
  if (n < 100) return `${n}`;
  if (n < 1000) return `~${Math.round(n / 10) * 10}`;
  if (n < 10_000) {
    const k = Math.round(n / 100) / 10;
    return `${k.toFixed(1)}K`;
  }
  if (n < 1_000_000) {
    return `${Math.round(n / 1000)}K`;
  }
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function modeBadge(mode: Mode): string {
  return mode === 'exact' ? '[exact]' : '[±est]';
}
