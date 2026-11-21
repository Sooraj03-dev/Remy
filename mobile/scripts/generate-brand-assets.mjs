#!/usr/bin/env node
/**
 * Thrifty Owl brand asset generator.
 *
 * Source of truth: assets/brand/source/owl-logo.svg — a layered vector with
 * separate groups for bubble, ears, body, belly, eyes, pupils and beak.
 * The layers exist so AnimatedOwl can animate them independently in-app.
 *
 * If a raster original is dropped at assets/brand/source/owl-logo.png it is
 * traced with ImageTracerJS to assets/brand/owl-logo.traced.svg for reference.
 * Tracing produces flat colour regions, not semantic layers, so the committed
 * layered SVG stays the animation source.
 *
 * Usage: npm run assets:brand
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'assets', 'brand', 'source');
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');
const IMAGE_DIR = path.join(ROOT, 'assets', 'images');

const INK = '#342949';
const LAVENDER = '#B9A0EB';
const BACKDROP = '#F3EEFA';

const LAYER_IDS = ['bubble', 'ears', 'body', 'belly', 'eyes', 'pupils', 'beak'];

function fail(message) {
  console.error(`[brand] ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function extractGroup(svg, id) {
  const match = svg.match(new RegExp(`<g id="${id}">[\\s\\S]*?</g>`));
  if (!match) fail(`missing <g id="${id}"> in source SVG`);
  return match[0];
}

function svgDoc({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${body}</svg>`;
}

/** Recolour every literal fill in a markup fragment. */
function recolor(markup, fill) {
  return markup.replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${fill}"`);
}

async function render(svg, outPath, width, height) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`[brand] wrote ${path.relative(ROOT, outPath)} (${width}x${height})`);
}

async function main() {
  await fs.mkdir(BRAND_DIR, { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });

  const sourceSvg = await fs.readFile(path.join(SOURCE_DIR, 'owl-logo.svg'), 'utf8');
  const layers = Object.fromEntries(LAYER_IDS.map((id) => [id, extractGroup(sourceSvg, id)]));

  // Keep the animated/committed copy in sync with the source.
  await fs.writeFile(path.join(BRAND_DIR, 'owl-logo.svg'), sourceSvg, 'utf8');
  console.log('[brand] wrote assets/brand/owl-logo.svg');

  // Optional raster original -> traced reference vector (not used for animation).
  const rasterSource = path.join(SOURCE_DIR, 'owl-logo.png');
  try {
    await fs.access(rasterSource);
    const ImageTracer = require('imagetracerjs');
    const traced = ImageTracer.imagedataToSVG(
      await sharp(rasterSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => ({
        width: info.width,
        height: info.height,
        data: new Uint8ClampedArray(data),
      })),
      { numberofcolors: 8, ltres: 1, qtres: 1, pathomit: 8 },
    );
    await fs.writeFile(path.join(BRAND_DIR, 'owl-logo.traced.svg'), traced, 'utf8');
    console.log('[brand] traced source PNG -> assets/brand/owl-logo.traced.svg');
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[brand] trace skipped:', error.message);
  }

  const owlOnly = ['ears', 'body', 'belly', 'eyes', 'pupils', 'beak']
    .map((id) => layers[id])
    .join('');

  const owlWithBubble = ['bubble', 'ears', 'body', 'belly', 'eyes', 'pupils', 'beak']
    .map((id) => layers[id])
    .join('');

  // 1024 icon: Ink owl on Lavender, owl ~60% of canvas, no transparency, no rounding.
  const iconSvg = svgDoc({
    width: 1024,
    height: 1024,
    body: `<rect width="1024" height="1024" fill="${LAVENDER}"/><g transform="translate(-177.4 11.1) scale(2.693)">${owlOnly}</g>`,
  });
  await render(iconSvg, path.join(IMAGE_DIR, 'icon.png'), 1024, 1024);

  // Adaptive foreground: transparent, owl inside the central 66% safe zone.
  const adaptiveSvg = svgDoc({
    width: 1024,
    height: 1024,
    body: `<g transform="translate(-116.7 55.2) scale(2.456)">${owlOnly}</g>`,
  });
  await render(adaptiveSvg, path.join(IMAGE_DIR, 'adaptive-icon.png'), 1024, 1024);

  // Android 13 themed icon: alpha-only silhouette, eyes punched out with a mask.
  const monochromeBody = `
    <defs>
      <mask id="owlMask">
        <rect width="1024" height="1024" fill="#FFFFFF"/>
        <g transform="translate(-116.7 55.2) scale(2.456)">
          <circle cx="212" cy="186" r="34" fill="#000000"/>
          <circle cx="300" cy="186" r="34" fill="#000000"/>
        </g>
      </mask>
    </defs>
    <g mask="url(#owlMask)">
      <g transform="translate(-116.7 55.2) scale(2.456)" fill="#FFFFFF">${recolor(owlOnly, '#FFFFFF')}</g>
    </g>`;
  const monochromeSvg = svgDoc({ width: 1024, height: 1024, body: monochromeBody });
  await render(monochromeSvg, path.join(IMAGE_DIR, 'monochrome-icon.png'), 1024, 1024);

  // Splash mark: transparent, owl in its speech bubble, on the #F3EEFA native splash.
  const splashSvg = svgDoc({
    width: 512,
    height: 512,
    body: `<g transform="translate(36 84) scale(0.859)">${owlWithBubble}</g>`,
  });
  await render(splashSvg, path.join(IMAGE_DIR, 'splash-icon.png'), 512, 512);

  // Notification icon: 96x96, white on transparent.
  const notificationSvg = svgDoc({
    width: 96,
    height: 96,
    body: `
      <defs>
        <mask id="owlMask">
          <rect width="96" height="96" fill="#FFFFFF"/>
          <g transform="translate(6.8 17.1) scale(0.31)">
            <circle cx="212" cy="186" r="34" fill="#000000"/>
            <circle cx="300" cy="186" r="34" fill="#000000"/>
          </g>
        </mask>
      </defs>
      <g mask="url(#owlMask)">
        <g transform="translate(6.8 17.1) scale(0.31)" fill="#FFFFFF">${recolor(owlOnly, '#FFFFFF')}</g>
      </g>`,
  });
  await render(notificationSvg, path.join(IMAGE_DIR, 'notification-icon.png'), 96, 96);

  // Favicon: small icon composition.
  await render(iconSvg, path.join(IMAGE_DIR, 'favicon.png'), 64, 64);

  // Brand the checked-in native Android project too, when present.
  const androidRes = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  try {
    await fs.access(androidRes);
    const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
    for (const [density, factor] of Object.entries(densities)) {
      const launcher = Math.round(48 * factor);
      const foreground = Math.round(108 * factor);
      const mipmap = path.join(androidRes, `mipmap-${density}`);
      await fs.mkdir(mipmap, { recursive: true });
      await render(iconSvg, path.join(mipmap, 'ic_launcher.png'), launcher, launcher);
      await render(adaptiveSvg, path.join(mipmap, 'ic_launcher_foreground.png'), foreground, foreground);

      const roundMask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${launcher}" height="${launcher}"><circle cx="${launcher / 2}" cy="${launcher / 2}" r="${launcher / 2}" fill="#FFFFFF"/></svg>`,
      );
      const roundIcon = await sharp(Buffer.from(iconSvg))
        .resize(launcher, launcher)
        .composite([{ input: roundMask, blend: 'dest-in' }])
        .png()
        .toBuffer();
      await fs.writeFile(path.join(mipmap, 'ic_launcher_round.png'), roundIcon);

      const drawable = path.join(androidRes, `drawable-${density}`);
      await fs.mkdir(drawable, { recursive: true });
      const splashWidth = Math.round(200 * factor);
      await render(splashSvg, path.join(drawable, 'splashscreen_image.png'), splashWidth, splashWidth);
    }
    console.log('[brand] refreshed Android launcher + splash resources');
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('[brand] android resources skipped:', error.message);
  }

  // Legacy aliases kept so older configs/scripts keep working.
  await fs.copyFile(path.join(IMAGE_DIR, 'splash-icon.png'), path.join(ROOT, 'assets', 'splash.png'));
  await fs.copyFile(path.join(IMAGE_DIR, 'icon.png'), path.join(ROOT, 'assets', 'icon.png'));

  console.log(`[brand] done. Splash backdrop is ${BACKDROP}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
