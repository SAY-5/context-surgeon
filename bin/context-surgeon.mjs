#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const first = args[0];

if (first === '--version' || first === '-v') {
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

if (!first || first === '--help' || first === '-h') {
  process.stdout.write(
    `context-surgeon v${pkg.version}\n` +
    `audit what Claude Code reads before you type\n\n` +
    `usage:\n` +
    `  context-surgeon <command> [options]\n\n` +
    `commands:\n` +
    `  (subcommands land in upcoming commits)\n\n` +
    `options:\n` +
    `  -v, --version   print version\n` +
    `  -h, --help      print this help\n`
  );
  process.exit(first ? 0 : 1);
}

const distEntry = join(root, 'dist', 'cli', 'index.js');
if (!existsSync(distEntry)) {
  process.stderr.write(
    `error: CLI not built. run \`npm run build\` from ${root} first.\n`
  );
  process.exit(2);
}
const { main } = await import(distEntry);
const code = await main(args);
process.exit(typeof code === 'number' ? code : 0);
