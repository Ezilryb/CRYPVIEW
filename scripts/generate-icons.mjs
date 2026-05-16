#!/usr/bin/env node
// ============================================================
//  scripts/generate-icons.mjs — CrypView V2
//  Génère les PNG d'icônes PWA depuis favicon.svg.
//
//  Prérequis : npm install -D sharp
//  Usage     : node scripts/generate-icons.mjs
// ============================================================

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');

const svgBuffer = readFileSync(resolve(root, 'public/favicon.svg'));
mkdirSync(resolve(root, 'public/icons'), { recursive: true });

const sizes = [
  { size: 16,   name: 'favicon-16.png'  },
  { size: 32,   name: 'favicon-32.png'  },
  { size: 192,  name: 'icon-192.png'    },
  { size: 512,  name: 'icon-512.png'    },
  { size: 180,  name: 'apple-touch-icon.png' },
];

for (const { size, name } of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(root, `public/icons/${name}`));
  console.log(`✅  public/icons/${name}  (${size}×${size})`);
}

await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(resolve(root, 'public/favicon.png'));
console.log('✅  public/favicon.png  (32×32)');

console.log('\n🎉  Toutes les icônes ont été générées dans public/icons/');
