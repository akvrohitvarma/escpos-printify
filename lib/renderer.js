import satori from 'satori';
import { html as satoriHtml } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve font paths from @fontsource/inter
let fonts = null;

function loadFonts() {
  if (fonts) return fonts;

  const interBase = dirname(require.resolve('@fontsource/inter/package.json'));
  const filesDir = join(interBase, 'files');

  const loadFont = (weight) => {
    // Satori requires .woff or .ttf (not woff2)
    try {
      const filePath = join(filesDir, `inter-latin-${weight}-normal.woff`);
      return readFileSync(filePath);
    } catch { return null; }
  };

  const weights = [
    { weight: 400, style: 'normal' },
    { weight: 700, style: 'normal' },
    { weight: 900, style: 'normal' },
  ];

  fonts = [];
  for (const { weight, style } of weights) {
    const data = loadFont(weight);
    if (data) {
      fonts.push({ name: 'Inter', data: data.buffer, weight, style });
    }
  }

  if (fonts.length === 0) {
    throw new Error(
      'No font files found. Ensure @fontsource/inter is installed.'
    );
  }

  return fonts;
}

/**
 * Pre-warm the rendering pipeline (Satori + Resvg JIT compilation).
 * Call once at server startup to avoid cold-start latency (~1s) on first requests.
 */
/**
 * Pre-warm the rendering pipeline (font loading + first Satori/Resvg pass).
 */
export async function warmup() {
  const raw = await renderHtmlToImage(
    '<div style="width:512px;display:flex;background:#fff;font-family:Inter,sans-serif;padding:20px;"><p style="font-size:24px;">warm</p></div>',
    512, 100,
  );
  await ditherImage(raw);
}

/**
 * Render an HTML string to a PNG buffer using Satori + Resvg.
 * The HTML must use Satori-compatible CSS (flexbox only, no tables).
 */
export async function renderHtmlToImage(htmlString, width = 512, maxHeight = 1200) {
  const fontData = loadFonts();

  // Parse HTML to Satori VDOM
  const markup = satoriHtml(htmlString);

  // Render to SVG — height is trimmed after, so this is just the max canvas
  const svg = await satori(markup, {
    width,
    height: maxHeight,
    fonts: fontData,
  });

  // SVG → raw pixels via Resvg (Satori already converts text to <path>, no fonts needed)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(255, 255, 255, 1)',
    font: { loadSystemFonts: false },
  });
  const rendered = resvg.render();
  const { width: w, height: h } = rendered;
  const pixels = rendered.pixels; // raw RGBA Uint8Array

  // Scan from bottom to find last row with non-white pixel
  let lastRow = 0;
  for (let y = h - 1; y >= 0; y--) {
    const rowOffset = y * w * 4;
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x * 4;
      if (pixels[idx] < 250 || pixels[idx + 1] < 250 || pixels[idx + 2] < 250) {
        lastRow = y;
        y = -1; // break outer
        break;
      }
    }
  }

  // Single sharp pipeline: crop + flatten + encode PNG
  const cropHeight = Math.max(1, Math.min(h, lastRow + 20));
  return sharp(Buffer.from(pixels), { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: 0, top: 0, width: w, height: cropHeight })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 1 })
    .toBuffer();
}

/**
 * Apply Floyd-Steinberg dithering to a PNG buffer.
 * Returns a black-and-white dithered PNG suitable for thermal printing.
 *
 * @param {Buffer} pngBuffer - Input PNG
 * @param {Object} opts
 * @param {number} opts.brightnessBoost - Multiplier for brightness (default 1.0 for templates, 1.3 for photos)
 * @param {number} opts.brightnessOffset - Additive brightness offset (default 0 for templates, 20 for photos)
 */
export async function ditherImage(pngBuffer, { brightnessBoost = 1.0, brightnessOffset = 0 } = {}) {
  const { data, info } = await sharp(pngBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const len = data.length;

  // Apply brightness in-place using Float32Array for error diffusion precision
  const pixels = new Float32Array(len);
  if (brightnessBoost === 1.0 && brightnessOffset === 0) {
    for (let i = 0; i < len; i++) pixels[i] = data[i];
  } else {
    for (let i = 0; i < len; i++) {
      pixels[i] = Math.min(255, data[i] * brightnessBoost + brightnessOffset);
    }
  }

  // Floyd-Steinberg dithering with precomputed constants
  const result = Buffer.alloc(len);
  const w = width;

  for (let y = 0; y < height; y++) {
    const row = y * w;
    const nextRow = row + w;
    const hasNextRow = y + 1 < height;

    for (let x = 0; x < w; x++) {
      const idx = row + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 128 ? 255 : 0;
      result[idx] = newVal;
      const err = oldVal - newVal;

      if (x + 1 < w)
        pixels[idx + 1] += err * 0.4375;          // 7/16
      if (hasNextRow) {
        if (x > 0)
          pixels[nextRow + x - 1] += err * 0.1875; // 3/16
        pixels[nextRow + x] += err * 0.3125;        // 5/16
        if (x + 1 < w)
          pixels[nextRow + x + 1] += err * 0.0625;  // 1/16
      }
    }
  }

  return sharp(result, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 1 })
    .toBuffer();
}

/**
 * Pre-shrink an uploaded image so Satori can handle it without choking.
 * Returns a small JPEG data URL that can be embedded in template HTML.
 * The image then flows through the normal Satori → Resvg pipeline,
 * preserving the template border, caption, and layout.
 */
export async function preshrinkImage(base64DataUrl, fitWidth = 472) {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const resized = await sharp(imageBuffer)
    .resize(fitWidth)
    .jpeg({ quality: 80 })
    .toBuffer();

  return 'data:image/jpeg;base64,' + resized.toString('base64');
}
