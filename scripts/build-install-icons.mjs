import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f6f3eb"/><rect x="96" y="96" width="320" height="320" rx="56" fill="#28251f"/><path d="M171 176v160h170v-42H215V176Z" fill="#d1b575"/><path d="m272 230 34-34 34 34m-34-34v75" fill="none" stroke="#f6f3eb" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
for (const [name, size] of [['pwa-192.png',192],['pwa-512.png',512],['pwa-maskable.png',512]]) await sharp(svg).resize(size,size).png().toFile(fileURLToPath(new URL('../public/' + name, import.meta.url)));
