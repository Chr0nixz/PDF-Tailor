import sharp from 'sharp';
import { mkdir, readFile } from 'fs/promises';
import { access } from 'fs/promises';

const sizes = [
  { name: 'icons/pwa-192x192.png', size: 192 },
  { name: 'icons/pwa-512x512.png', size: 512 },
  { name: 'icons/apple-touch-icon.png', size: 180 },
];

const SVG_PATH = 'public/favicon.svg';

async function generateIcons() {
  try {
    await access(SVG_PATH);
  } catch {
    console.error('Source favicon.svg not found in public/');
    process.exit(1);
  }

  await mkdir('public/icons', { recursive: true });

  const svgBuffer = await readFile(SVG_PATH);

  await Promise.all(
    sizes.map(async ({ name, size }) => {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(`public/${name}`);
      console.log(`Generated ${name}`);
    })
  );
}

generateIcons();
