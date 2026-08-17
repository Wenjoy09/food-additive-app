// 一次性脚本：生成 PWA 图标（192/512/maskable）与苹果触摸图标
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const outDir = new URL('../public', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const svg = (size, maskable) => {
  // maskable 版本留安全边距（内容缩到 62%）
  const ratio = maskable ? 0.62 : 0.86;
  const inner = size * ratio;
  const offset = (size - inner) / 2;
  const s = inner / 48; // 图标内容绘制在 48x48 坐标系
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#16a34a"/>
  <g transform="translate(${offset}, ${offset}) scale(${s})">
    <g fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 20.5 C11 12 17 6 26 5 C34 4 41 6 43 7 C43 7 44 15 41 22 C38 29 31 33 24 32 C17 31 12 27 11 20.5 Z" fill="#ffffff" fill-opacity="0.14"/>
      <path d="M11 20.5 C11 12 17 6 26 5 C34 4 41 6 43 7 C43 7 44 15 41 22 C38 29 31 33 24 32 C17 31 12 27 11 20.5 Z"/>
      <path d="M11 40 C14 30 22 20 34 14"/>
      <path d="M18 31 C22 30 26 30 30 31"/>
      <path d="M23 24 C27 23 31 23 35 24"/>
    </g>
  </g>
</svg>`);
};

async function run() {
  const jobs = [
    { file: 'icon-192.png', size: 192, maskable: false },
    { file: 'icon-512.png', size: 512, maskable: false },
    { file: 'icon-maskable-512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const j of jobs) {
    await sharp(svg(j.size, j.maskable)).png().toFile(`${outDir}/${j.file}`);
    console.log('generated', j.file);
  }
}

run();
