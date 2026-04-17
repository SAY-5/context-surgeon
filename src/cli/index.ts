import { Command } from 'commander';
import chalk from 'chalk';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { discover } from '../discovery/walker.js';
import { parseFile } from '../parser/frontmatter.js';
import { resolveImports } from '../imports/resolver.js';
import { count, formatCount, modeBadge, preferredMode } from '../tokens/index.js';
import { compose, type ComposePhase } from '../report/compose.js';
import { renderTerminal } from '../render/terminal.js';
import { renderSVG } from '../render/svg.js';
import { renderPNG, HERO_SIZE } from '../render/png.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgJsonPath = join(here, '..', '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf8')) as { version: string };

// TODO(commit-12): replace with real repo URL before launch.
const REPO_URL = 'https://github.com/<repo>/context-surgeon';

const HELP_TEXT = `\
context-surgeon — Audit what Claude Code actually loads before you type.

USAGE
  npx context-surgeon [dir]                  audit <dir> (or cwd if omitted)
  npx context-surgeon audit <dir>            same, explicit subcommand
  npx context-surgeon audit --svg hero.svg   write hero SVG to file
  npx context-surgeon audit --png hero.png   rasterize hero to PNG
  npx context-surgeon audit --out dist/      write both .svg and .png
  npx context-surgeon audit --json           machine-readable report on stdout
  npx context-surgeon tokens "some text"     count tokens in a string
  npx context-surgeon version                print version + diagnostics

  ANTHROPIC_API_KEY=sk-... npx context-surgeon
    upgrades token counts to exact mode and enables conflict detection.

OPTIONS (audit)
  --json             emit the Report as JSON
  --svg [path]       emit hero SVG; no path = stdout
  --png <path>       emit hero PNG (path required; binary)
  --out <dir>        write both context-surgeon-hero.{svg,png} into <dir>/
  --include-home     also scan ~/.claude/ (off by default)
  --force-offline    keep estimate mode even when ANTHROPIC_API_KEY is set
  --width <n>        terminal render width, 40–400 (auto-detect by default)

EXIT CODES
  0   no findings, no errors
  1   any findings present, or the command errored

Learn more: ${REPO_URL}
`;

function validateWidth(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || String(n) !== String(raw)) {
    throw new Error(`--width must be an integer (got "${raw}")`);
  }
  if (n < 40 || n > 400) {
    throw new Error(`--width must be between 40 and 400 (got ${n})`);
  }
  return n;
}

interface Spinner {
  update(text: string): void;
  stop(): void;
}

function makeSpinner(enabled: boolean): Spinner {
  if (!enabled) return { update: () => {}, stop: () => {} };
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let text = 'auditing…';
  const write = () => {
    process.stderr.write(`\r${chalk.hex('#2dd4bf')(frames[i % frames.length]!)} ${chalk.hex('#8b949e')(text)}\x1b[K`);
    i++;
  };
  write();
  const interval = setInterval(write, 80);
  return {
    update: (t: string) => {
      text = t;
    },
    stop: () => {
      clearInterval(interval);
      process.stderr.write('\r\x1b[K');
    },
  };
}

interface AuditOpts {
  json?: boolean;
  svg?: boolean | string;
  png?: string;
  out?: string;
  includeHome?: boolean;
  forceOffline?: boolean;
  width?: string;
}

async function runAudit(dir: string | undefined, opts: AuditOpts): Promise<void> {
  const target = dir ?? process.cwd();
  if (!existsSync(target)) {
    throw new Error(`directory not found: ${target}`);
  }
  if (!statSync(target).isDirectory()) {
    throw new Error(`not a directory: ${target}`);
  }
  const formats = [opts.json, opts.svg !== undefined, opts.png !== undefined, opts.out !== undefined].filter(Boolean).length;
  if (formats > 1) {
    throw new Error('--json, --svg, --png, and --out are mutually exclusive; pick one output format');
  }
  const width = validateWidth(opts.width);

  const showSpinner = !opts.json && !opts.svg && !opts.png && !opts.out && process.stderr.isTTY === true;
  const spinner = makeSpinner(showSpinner);
  try {
    const sources = await discover(target, { includeHome: opts.includeHome });
    spinner.update(`resolving ${sources.files.length} source${sources.files.length === 1 ? '' : 's'}…`);
    const resolved = await Promise.all(sources.files.map(f => resolveImports(parseFile(f))));
    const mode = opts.forceOffline ? 'estimate' : preferredMode();
    const report = await compose(resolved, {
      cwd: sources.cwd,
      mode,
      includeHome: !!opts.includeHome,
      onProgress: (phase: ComposePhase, current: number, total: number) => {
        if (phase === 'tokenize') spinner.update(`tokenizing ${current} / ${total}…`);
        else if (phase === 'analyze' && current === 0) spinner.update('analyzing…');
      },
    });
    spinner.stop();

    if (opts.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    } else if (opts.svg !== undefined) {
      const svg = renderSVG(report);
      if (typeof opts.svg === 'string') {
        await writeFile(opts.svg, svg, 'utf8');
        process.stderr.write(`wrote ${opts.svg}\n`);
      } else {
        process.stdout.write(svg);
      }
    } else if (opts.png !== undefined) {
      const png = await renderPNG(report, HERO_SIZE);
      await writeFile(opts.png, png);
      process.stderr.write(`wrote ${opts.png} (${formatBytes(png.length)})\n`);
    } else if (opts.out !== undefined) {
      if (!existsSync(opts.out)) {
        await mkdir(opts.out, { recursive: true });
      } else if (!statSync(opts.out).isDirectory()) {
        throw new Error(`--out path is not a directory: ${opts.out}`);
      }
      const svgPath = join(opts.out, 'context-surgeon-hero.svg');
      const pngPath = join(opts.out, 'context-surgeon-hero.png');
      await writeFile(svgPath, renderSVG(report), 'utf8');
      const png = await renderPNG(report, HERO_SIZE);
      await writeFile(pngPath, png);
      process.stderr.write(`wrote ${svgPath}\n`);
      process.stderr.write(`wrote ${pngPath} (${formatBytes(png.length)})\n`);
    } else {
      process.stdout.write(renderTerminal(report, { width }));
    }

    // Exit 1 only for warning-severity findings (future: critical too, when any
    // Finding kind uses it); info-severity notes are informational and do not fail CI.
    const hasBlockingFinding = report.findings.some(f => f.severity === 'warning');
    if (hasBlockingFinding) {
      process.exitCode = 1;
    }
  } catch (err) {
    spinner.stop();
    throw err;
  }
}

export async function main(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('context-surgeon')
    .description('Audit what Claude Code actually loads before you type.')
    .version(pkg.version, '-v, --version', 'print version number')
    .helpOption('-h, --help', 'print help')
    .exitOverride()
    .addHelpText('beforeAll', HELP_TEXT)
    .showHelpAfterError(false)
    .configureOutput({
      // Suppress commander's own "error:" line; our main() catch renders the colored message.
      writeErr: () => {},
      outputError: () => {},
    });

  program.configureHelp({
    // we provide our own help block via addHelpText; suppress commander's auto-generated sections
    formatHelp: () => '',
  });

  program
    .command('audit [dir]', { isDefault: true })
    .description('audit the agent context surface for <dir> (defaults to cwd)')
    .option('--json', 'emit the Report as JSON')
    .option('--svg [path]', 'emit the hero SVG; no path = stdout')
    .option('--png <path>', 'emit the hero PNG (path required)')
    .option('--out <dir>', 'write both context-surgeon-hero.{svg,png} into <dir>/')
    .option('--include-home', 'include ~/.claude (off by default)', false)
    .option('--force-offline', 'force offline estimate even when ANTHROPIC_API_KEY is set', false)
    .option('--width <n>', 'terminal width (40–400; auto-detected by default)')
    .action(runAudit);

  program
    .command('tokens <text>')
    .description('count tokens in <text>; pass - to read stdin')
    .option('--force-offline', 'force offline estimate even when ANTHROPIC_API_KEY is set', false)
    .option('--model <model>', 'model to use for exact counts (default: claude-sonnet-4-6)')
    .action(async (text: string, opts: { forceOffline?: boolean; model?: string }) => {
      let input = text;
      if (text === '-') input = await readStdin();
      const mode = opts.forceOffline ? 'estimate' : preferredMode();
      process.stdout.write(`mode: ${mode}${mode === 'exact' ? ' (ANTHROPIC_API_KEY detected)' : ' (no ANTHROPIC_API_KEY)'}\n`);
      const result = await count(input, {
        force: opts.forceOffline ? 'estimate' : undefined,
        model: opts.model,
      });
      process.stdout.write(`${formatCount(result.tokens, result.mode)} tokens  ${modeBadge(result.mode)}\n`);
    });

  program
    .command('version')
    .description('print version and diagnostics')
    .action(async () => {
      const mode = preferredMode();
      let sdkInstalled = false;
      try {
        await import('@anthropic-ai/sdk');
        sdkInstalled = true;
      } catch {
        sdkInstalled = false;
      }
      process.stdout.write(
        `version:         ${pkg.version}\n` +
          `tokenizer-mode:  ${mode}${mode === 'exact' ? '  (ANTHROPIC_API_KEY set)' : '  (no ANTHROPIC_API_KEY)'}\n` +
          `anthropic-sdk:   ${sdkInstalled ? 'installed' : 'not installed'}\n` +
          `node:            ${process.version}\n` +
          `platform:        ${process.platform}/${process.arch}\n`,
      );
    });

  try {
    await program.parseAsync(argv, { from: 'user' });
    const code = process.exitCode;
    return typeof code === 'number' ? code : 0;
  } catch (err) {
    const e = err as Error & { exitCode?: number; code?: string };
    if (e.code === 'commander.help' || e.code === 'commander.version' || e.code === 'commander.helpDisplayed') return 0;
    const isJson = argv.includes('--json');
    if (isJson) {
      process.stderr.write(JSON.stringify({ error: e.message }) + '\n');
    } else {
      process.stderr.write(`${chalk.hex('#f87171').bold('[!]')} ${chalk.hex('#e6edf3')(e.message)}\n`);
    }
    return e.exitCode ?? 1;
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
