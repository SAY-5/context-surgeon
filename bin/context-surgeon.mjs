#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distEntry = join(root, 'dist', 'cli', 'index.js');

if (!existsSync(distEntry)) {
  process.stderr.write(
    `error: CLI not built. run \`npm run build\` from ${root} first.\n`,
  );
  process.exit(2);
}

const { main } = await import(distEntry);
const code = await main(process.argv.slice(2));
process.exit(typeof process.exitCode === 'number' ? process.exitCode : typeof code === 'number' ? code : 0);
