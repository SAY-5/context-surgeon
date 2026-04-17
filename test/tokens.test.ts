import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { count, formatCount, modeBadge, preferredMode } from '../src/tokens/index.js';
import { offlineCount } from '../src/tokens/offline.js';

describe('tokens/formatCount', () => {
  it('exact mode renders thousands separators', () => {
    expect(formatCount(3427, 'exact')).toBe('3,427');
    expect(formatCount(180_000, 'exact')).toBe('180,000');
    expect(formatCount(47, 'exact')).toBe('47');
  });

  it('estimate mode rounds aggressively', () => {
    expect(formatCount(47, 'estimate')).toBe('47');
    expect(formatCount(847, 'estimate')).toBe('~850');
    expect(formatCount(3427, 'estimate')).toBe('3.4K');
    expect(formatCount(18_400, 'estimate')).toBe('18K');
    expect(formatCount(1_200_000, 'estimate')).toBe('1.2M');
  });

  it('badge reflects mode', () => {
    expect(modeBadge('estimate')).toBe('[±est]');
    expect(modeBadge('exact')).toBe('[exact]');
  });
});

describe('tokens/count', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('defaults to estimate mode without ANTHROPIC_API_KEY', async () => {
    const r = await count('Hello, Claude.');
    expect(r.mode).toBe('estimate');
    expect(r.tokens).toBeGreaterThan(0);
  });

  it('preferredMode flips to exact when ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-placeholder';
    expect(preferredMode()).toBe('exact');
  });

  it('force override beats the env var', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-placeholder';
    expect(preferredMode({ force: 'estimate' })).toBe('estimate');
  });

  it('exact mode errors loudly when ANTHROPIC_API_KEY is missing', async () => {
    await expect(count('hello', { force: 'exact' })).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});

describe('tokens/offline', () => {
  it('returns a positive integer count for non-empty input', () => {
    expect(offlineCount('hello world')).toBeGreaterThan(0);
    expect(Number.isInteger(offlineCount('hello world'))).toBe(true);
  });

  it('returns 0 for empty string', () => {
    expect(offlineCount('')).toBe(0);
  });
});
