import { Resvg } from '@resvg/resvg-js';
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
