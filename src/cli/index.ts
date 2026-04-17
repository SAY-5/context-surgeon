import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { discover } from '../discovery/walker.js';
import { parseFile } from '../parser/frontmatter.js';
import { resolveImports } from '../imports/resolver.js';
import { count, formatCount, modeBadge, preferredMode } from '../tokens/index.js';
import { compose } from '../report/compose.js';
import { renderTerminal } from '../render/terminal.js';
import { renderSVG } from '../render/svg.js';
import { renderPNG, HERO_SIZE } from '../render/png.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgJsonPath = join(here, '..', '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf8')) as { version: string };

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

export async function main(argv: string[]): Promise<number> {
  const program = new Command();
  program
    .name('context-surgeon')
    .version(pkg.version)
    .description('audit what Claude Code reads before you type')
    .exitOverride();

  program
    .command('discover <dir>')
    .description('list every context file Claude Code would load for <dir>')
    .option('--json', 'emit JSON')
    .option('--include-home', 'include ~/.claude (off by default for fixtures)', false)
    .option('--include-managed', 'include OS-level managed CLAUDE.md', false)
    .action(async (dir: string, opts: { json?: boolean; includeHome?: boolean; includeManaged?: boolean }) => {
      const sources = await discover(dir, {
        includeHome: opts.includeHome,
        includeManaged: opts.includeManaged,
      });
      const resolved = await Promise.all(
        sources.files.map(async f => resolveImports(parseFile(f))),
      );
      if (opts.json) {
        process.stdout.write(
          JSON.stringify(
            {
              cwd: sources.cwd,
              fileCount: resolved.length,
              files: resolved.map(f => ({
                path: f.path,
                kind: f.kind,
                scope: f.scope,
                frontmatter: f.frontmatter,
                bytes: f.effective.length,
                imports: f.imports.map(i => ({ path: i.path, depth: i.depth, ref: i.ref })),
              })),
            },
            null,
            2,
          ) + '\n',
        );
      } else {
        process.stdout.write(`${resolved.length} file(s) discovered in ${sources.cwd}\n\n`);
        for (const f of resolved) {
          process.stdout.write(`  ${f.kind.padEnd(16)} ${f.path}\n`);
          for (const imp of f.imports) {
            const indent = '   ' + '  '.repeat(imp.depth);
            process.stdout.write(`${indent}↪ ${imp.ref}  →  ${imp.path}\n`);
          }
        }
        process.stdout.write('\n');
      }
    });

  program
    .command('audit <dir>')
    .description('audit what Claude Code loads for <dir>')
    .option('--json', 'emit the Report as JSON instead of rendering')
    .option('--svg [path]', 'emit the hero SVG; no path = stdout, path = file')
    .option('--png <path>', 'emit the hero PNG rasterized from the SVG (path required)')
    .option('--out <dir>', 'write both .svg and .png into <dir>/ as context-surgeon-hero.*')
    .option('--include-home', 'include ~/.claude (off by default)', false)
    .option('--force-offline', 'force offline estimate even when ANTHROPIC_API_KEY is set', false)
    .option('--width <n>', 'terminal width for rendering (auto-detected by default)', v => Number(v))
    .action(async (
      dir: string,
      opts: {
        json?: boolean;
        svg?: boolean | string;
        png?: string;
        out?: string;
        includeHome?: boolean;
        forceOffline?: boolean;
        width?: number;
      },
    ) => {
      const formats = [opts.json, opts.svg !== undefined, opts.png !== undefined, opts.out !== undefined].filter(Boolean).length;
      if (formats > 1) {
        throw new Error('--json, --svg, --png, and --out are mutually exclusive; pick one output format');
      }
      const sources = await discover(dir, { includeHome: opts.includeHome });
      const resolved = await Promise.all(
        sources.files.map(async f => resolveImports(parseFile(f))),
      );
      const mode = opts.forceOffline ? 'estimate' : preferredMode();
      const report = await compose(resolved, {
        cwd: sources.cwd,
        mode,
        includeHome: !!opts.includeHome,
      });
      if (opts.json) {
        process.stdout.write(JSON.stringify(report, null, 2) + '\n');
        return;
      }
      if (opts.svg !== undefined) {
        const svg = renderSVG(report);
        if (typeof opts.svg === 'string') {
          await writeFile(opts.svg, svg, 'utf8');
          process.stderr.write(`wrote ${opts.svg}\n`);
        } else {
          process.stdout.write(svg);
        }
        return;
      }
      if (opts.png !== undefined) {
        const png = await renderPNG(report, HERO_SIZE);
        await writeFile(opts.png, png);
        process.stderr.write(`wrote ${opts.png} (${formatBytes(png.length)})\n`);
        return;
      }
      if (opts.out !== undefined) {
        if (!existsSync(opts.out)) {
          await mkdir(opts.out, { recursive: true });
        } else if (!statSync(opts.out).isDirectory()) {
          throw new Error(`--out path is not a directory: ${opts.out}`);
        }
        const svgPath = join(opts.out, 'context-surgeon-hero.svg');
        const pngPath = join(opts.out, 'context-surgeon-hero.png');
        const svg = renderSVG(report);
        await writeFile(svgPath, svg, 'utf8');
        const png = await renderPNG(report, HERO_SIZE);
        await writeFile(pngPath, png);
        process.stderr.write(`wrote ${svgPath}\n`);
        process.stderr.write(`wrote ${pngPath} (${formatBytes(png.length)})\n`);
        return;
      }
      process.stdout.write(renderTerminal(report, { width: opts.width }));
    });

  program
    .command('tokens <text>')
    .description('count tokens in <text>; pass - to read stdin')
    .option('--force-offline', 'force offline estimate even when ANTHROPIC_API_KEY is set', false)
    .option('--model <model>', 'model to use for exact counts (default: claude-sonnet-4-6)')
    .action(async (text: string, opts: { forceOffline?: boolean; model?: string }) => {
      let input = text;
      if (text === '-') {
        input = await readStdin();
      }
      const mode = opts.forceOffline ? 'estimate' : preferredMode();
      process.stdout.write(`mode: ${mode}${mode === 'exact' ? ' (ANTHROPIC_API_KEY detected)' : ' (no ANTHROPIC_API_KEY)'}\n`);
      const result = await count(input, {
        force: opts.forceOffline ? 'estimate' : undefined,
        model: opts.model,
      });
      process.stdout.write(`${formatCount(result.tokens, result.mode)} tokens  ${modeBadge(result.mode)}\n`);
    });

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === 'commander.help' || e.code === 'commander.version') return 0;
    if (e.code === 'commander.helpDisplayed') return 0;
    process.stderr.write(`error: ${e.message}\n`);
    return 1;
  }
}
