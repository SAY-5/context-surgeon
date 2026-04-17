import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const binPath = join(repoRoot, 'bin', 'context-surgeon.mjs');
const distEntry = join(repoRoot, 'dist', 'cli', 'index.js');
const bloated = join(repoRoot, 'examples', 'bloated');

interface CliResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const child = spawn('node', [binPath, ...args], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', reject);
    child.on('exit', code => {
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}

// CLI subprocesses warm up node, do discovery + tokenize + analyze end-to-end.
// Bump the default 5s timeout to 30s so it survives CI on slow runners.
describe('e2e skill contract', { timeout: 30_000 }, () => {
  it('built dist exists (run `npm run build` first if this fails)', () => {
    expect(existsSync(distEntry)).toBe(true);
  });

  it('audit --json against the bloated fixture emits a parseable Report', async () => {
    const { stdout, code } = await runCli(['audit', bloated, '--json', '--force-offline']);
    // Exit 1 is expected because the fixture has warning-severity findings.
    expect(code).toBe(1);
    const report = JSON.parse(stdout) as {
      cwd: string;
      total: number;
      contextWindow: number;
      mode: string;
      sources: Array<{ path: string; kind: string; bucket: string; tokens: number }>;
      findings: Array<{ kind: string; severity: string; estimatedTokensReclaimed: number }>;
    };

    expect(report.cwd).toBe(bloated);
    expect(report.mode).toBe('estimate');
    expect(report.contextWindow).toBeGreaterThanOrEqual(200_000);
    expect(report.total).toBeGreaterThan(10_000);
    expect(report.sources.length).toBeGreaterThan(5);
    expect(Array.isArray(report.findings)).toBe(true);

    const kinds = new Set(report.findings.map(f => f.kind));
    // The bloated fixture is calibrated to trigger one of each of these:
    expect(kinds).toContain('clipped');
    expect(kinds).toContain('path-mismatch');
    expect(kinds).toContain('duplicate');
    expect(kinds).toContain('possible-conflict');

    // Every finding must carry severity and a numeric reclaim estimate.
    for (const f of report.findings) {
      expect(['info', 'warning', 'critical']).toContain(f.severity);
      expect(typeof f.estimatedTokensReclaimed).toBe('number');
    }
  });

  it('version subcommand emits the diagnostic block', async () => {
    const { stdout, code } = await runCli(['version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/version:\s+\d+\.\d+\.\d+/);
    expect(stdout).toContain('tokenizer-mode:');
    expect(stdout).toContain('anthropic-sdk:');
    expect(stdout).toContain('node:');
  });

  it('errors cleanly on a nonexistent path', async () => {
    const { stderr, code } = await runCli(['audit', '/nonexistent/path/xyz']);
    expect(code).toBe(1);
    expect(stderr).toContain('directory not found');
  });
});
