import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSVG } from './svg.js';
import type { Report } from '../report/compose.js';

export interface PngSize {
  width: number;
  height: number;
}

export const HERO_SIZE: PngSize = { width: 1600, height: 900 };

const FONT_FILES = ['Inter-Regular.ttf', 'Inter-Medium.ttf', 'JetBrainsMono-Medium.ttf'];

function fontsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/render → ../../assets/fonts once built
  return join(here, '..', '..', 'assets', 'fonts');
}

function resolveFontPaths(): string[] {
  const dir = fontsDir();
  const paths: string[] = [];
  for (const name of FONT_FILES) {
    const p = join(dir, name);
    if (!existsSync(p)) {
      throw new Error(
        `font not found: ${p}. PNG export requires Inter and JetBrains Mono to be present in assets/fonts/.`,
      );
    }
    paths.push(p);
  }
  return paths;
}

export async function renderPNG(report: Report, size: PngSize = HERO_SIZE): Promise<Buffer> {
  // Lazy-load resvg so terminal-only audits work in environments that install
  // with --omit=optional (Docker minimal, corporate npm configs) and therefore
  // skip the platform-specific @resvg/resvg-js-<os>-<arch> native binary.
  let Resvg: typeof import('@resvg/resvg-js').Resvg;
  try {
    ({ Resvg } = await import('@resvg/resvg-js'));
  } catch (err) {
    const detail = (err as Error)?.message ?? String(err);
    throw new Error(
      '@resvg/resvg-js is not installed or its native binary is missing. ' +
        'It ships as an optional dependency with a platform-specific build; ' +
        'reinstall without --omit=optional:\n' +
        '  npm install context-surgeon\n' +
        `(underlying error: ${detail})`,
    );
  }
  const svg = renderSVG(report);
  const fontFiles = resolveFontPaths();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size.width },
    background: '#0d1117',
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
      sansSerifFamily: 'Inter',
      monospaceFamily: 'JetBrains Mono',
    },
  });
  return resvg.render().asPng();
}
