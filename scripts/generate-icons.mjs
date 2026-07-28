import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArtworkPath = path.join(
  root,
  'assets',
  'branding',
  'instead-modern-card-concept.png',
);
const sourceArtwork = await readFile(sourceArtworkPath);
const iconBackground = '#171714';

async function writeSquare(size, output) {
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(sourceArtwork)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: iconBackground })
    .removeAlpha()
    .png()
    .toFile(output);
}

async function writeRound(size, output) {
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${
      size / 2
    }" r="${size / 2}" fill="white"/></svg>`,
  );

  await mkdir(path.dirname(output), { recursive: true });
  await sharp(sourceArtwork)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toFile(output);
}

const iosDirectory = path.join(
  root,
  'ios',
  'Instead',
  'Images.xcassets',
  'AppIcon.appiconset',
);
const iosIcons = [
  ['Icon-20@2x.png', 40],
  ['Icon-20@3x.png', 60],
  ['Icon-29@2x.png', 58],
  ['Icon-29@3x.png', 87],
  ['Icon-40@2x.png', 80],
  ['Icon-40@3x.png', 120],
  ['Icon-60@2x.png', 120],
  ['Icon-60@3x.png', 180],
  ['Icon-1024.png', 1024],
];

for (const [filename, size] of iosIcons) {
  await writeSquare(size, path.join(iosDirectory, filename));
}

const androidDirectory = path.join(
  root,
  'android',
  'app',
  'src',
  'main',
  'res',
);
const androidIcons = [
  ['mipmap-mdpi', 48, 108],
  ['mipmap-hdpi', 72, 162],
  ['mipmap-xhdpi', 96, 216],
  ['mipmap-xxhdpi', 144, 324],
  ['mipmap-xxxhdpi', 192, 432],
];

for (const [directory, legacySize, adaptiveSize] of androidIcons) {
  await writeSquare(
    legacySize,
    path.join(androidDirectory, directory, 'ic_launcher.png'),
  );
  await writeRound(
    legacySize,
    path.join(androidDirectory, directory, 'ic_launcher_round.png'),
  );
  await writeSquare(
    adaptiveSize,
    path.join(androidDirectory, directory, 'ic_launcher_foreground.png'),
  );
}

await writeSquare(
  1024,
  path.join(root, 'assets', 'branding', 'instead-app-icon.png'),
);
await writeSquare(64, path.join(root, 'web', 'public', 'favicon.png'));
await writeSquare(
  180,
  path.join(root, 'web', 'public', 'apple-touch-icon.png'),
);

console.log('Generated INSTEAD icons for web, iOS, and Android.');
