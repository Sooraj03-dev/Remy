#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BRAND = path.join(ROOT, 'assets', 'brand');
const IMAGES = path.join(ROOT, 'assets', 'images');
const ANDROID_RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const art = JSON.parse(await fs.readFile(path.join(BRAND, 'source', 'remy-art.json'), 'utf8'));

const INK = '#342949';
const LAVENDER = '#B9A0EB';
const BACKGROUND = '#F3EEFA';
const MINT = '#CFF2E2';
const fills = { ...art.colors, peach: '#FFC6BA' };

function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}

function watercolor(pose, id) {
  const body = pose === 'walking' ? art.walkingBody : art.body;
  const shapes = [art.leftEar[0], art.rightEar[0], body[0]];
  const clip = shapes.map(({ d }) => `<path d="${d}"/>`).join('');
  let seed = 5491;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const grain = Array.from({ length: 520 }, (_, index) => {
    const x = (random() * art.width).toFixed(2);
    const y = (random() * art.height).toFixed(2);
    const radius = (0.2 + random() * 0.9).toFixed(2);
    const color = index % 2 ? fills.furShade : fills.furLight;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>`;
  }).join('');
  return `<clipPath id="${id}">${clip}</clipPath><g clip-path="url(#${id})" opacity=".19">${grain}</g>`;
}

function mouse(pose, x, y, scale = 1, silhouette = false) {
  const paths = art.poses[pose].flatMap((part) => art[part]).map(({ d, fill, stroke, opacity = 1 }) => {
    const color = fill ? (silhouette ? 'white' : fills[fill]) : 'none';
    const outline = stroke ? `stroke="${silhouette ? 'white' : INK}" stroke-width="${stroke}"` : '';
    return `<path d="${d}" fill="${color}" ${outline} opacity="${opacity}"/>`;
  });
  const texture = silhouette ? '' : watercolor(pose, `grain-${pose}-${x}`);
  return `<g transform="translate(${x} ${y}) scale(${scale})" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}${texture}</g>`;
}

const badge = `
  <defs>
    <linearGradient id="clay" x2="1" y2="1">
      <stop stop-color="#E8DFFF"/>
      <stop offset=".62" stop-color="${LAVENDER}"/>
      <stop offset="1" stop-color="#A189D2"/>
    </linearGradient>
    <linearGradient id="light" x2="0" y2="1">
      <stop stop-color="white" stop-opacity=".72"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="9" y="14" width="142" height="140" rx="37" fill="${INK}" opacity=".16"/>
  <rect x="9" y="8" width="142" height="140" rx="37" fill="url(#clay)"/>
  <rect x="12" y="11" width="136" height="134" rx="34" fill="none" stroke="url(#light)" stroke-width="2"/>
  ${mouse('sitting', 18, 19, 1.04)}
`;

const launcher = svg(160, 160, `<rect width="160" height="160" fill="${LAVENDER}"/>${badge}`);
const foreground = svg(160, 160, `<g transform="translate(27 27) scale(.6625)">${badge}</g>`);
const monochrome = svg(160, 160, mouse('sitting', 28, 31, 0.87, true));
const notification = svg(120, 120, mouse('sitting', 0, 5, 1, true));
const splash = svg(160, 160, badge);

const stars = `
  <path d="M212 51L216 62L227 66L216 70L212 81L208 70L197 66L208 62Z" fill="${LAVENDER}" stroke="${INK}" stroke-width="1.4"/>
  <path d="M322 69L325 78L334 81L325 84L322 93L319 84L310 81L319 78Z" fill="${MINT}" stroke="${INK}" stroke-width="1.4"/>
`;
const spriteSheet = svg(720, 180, `
  <rect width="720" height="180" fill="${BACKGROUND}"/>
  <clipPath id="ledge"><rect x="20" y="0" width="140" height="126"/></clipPath>
  <g clip-path="url(#ledge)">${mouse('peeking', 29, 48, 1.01)}</g>
  <path d="M25 126H155" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="270" cy="142" rx="33" ry="4" fill="${INK}" opacity=".12"/>
  ${stars}
  ${mouse('bouncing', 210, 22)}
  <ellipse cx="448" cy="143" rx="35" ry="4" fill="${INK}" opacity=".12"/>
  ${mouse('walking', 392, 44)}
  <ellipse cx="629" cy="148" rx="37" ry="4" fill="${INK}" opacity=".12"/>
  ${mouse('sitting', 572, 43)}
`);

function png(source, size, height = size) {
  // Start from a high-resolution SVG render so the launcher stays sharp at 1024px.
  return sharp(Buffer.from(source), { density: 576 })
    .resize(size, height)
    .png({ compressionLevel: 9 });
}

await fs.mkdir(IMAGES, { recursive: true });
await Promise.all([
  png(launcher, 1024).removeAlpha().toFile(path.join(IMAGES, 'icon.png')),
  png(foreground, 1024).toFile(path.join(IMAGES, 'adaptive-icon.png')),
  png(monochrome, 1024).toFile(path.join(IMAGES, 'monochrome-icon.png')),
  png(notification, 96).toFile(path.join(IMAGES, 'notification-icon.png')),
  png(launcher, 64).toFile(path.join(IMAGES, 'favicon.png')),
  png(splash, 512).toFile(path.join(IMAGES, 'splash-icon.png')),
  png(spriteSheet, 1440, 360).toFile(path.join(BRAND, 'remy-sprite-sheet.png')),
]);

const aliases = {
  'icon.png': 'icon.png',
  'adaptive-icon.png': 'adaptive-icon.png',
  'favicon.png': 'favicon.png',
  'splash-icon.png': 'splash.png',
};
await Promise.all(Object.entries(aliases).map(([source, target]) =>
  fs.copyFile(path.join(IMAGES, source), path.join(ROOT, 'assets', target)),
));

async function renderAndroidResources() {
  try {
    await fs.access(ANDROID_RES);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    const size = 48 * scale;
    const mipmap = path.join(ANDROID_RES, `mipmap-${density}`);
    const drawable = path.join(ANDROID_RES, `drawable-${density}`);
    await Promise.all([fs.mkdir(mipmap, { recursive: true }), fs.mkdir(drawable, { recursive: true })]);
    const mask = Buffer.from(svg(size, size, `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>`));
    await Promise.all([
      png(launcher, size).toFile(path.join(mipmap, 'ic_launcher.png')),
      png(launcher, size).composite([{ input: mask, blend: 'dest-in' }]).toFile(path.join(mipmap, 'ic_launcher_round.png')),
      png(foreground, 108 * scale).toFile(path.join(mipmap, 'ic_launcher_foreground.png')),
      png(splash, 200 * scale).toFile(path.join(drawable, 'splashscreen_image.png')),
    ]);
  }
}

await renderAndroidResources();
console.log('[brand] Rendered the Remy launcher, splash, notification icon, and sprite sheet.');
