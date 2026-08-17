import type { ImageMediaType } from './types';

/**
 * OCR 前图像预处理：
 * 1. 用浏览器解码任意可识别格式（jpg/png/webp/gif/部分 heic），不可解码时给出明确报错
 * 2. 放大到合适尺寸（小字识别率的关键）
 * 3. 灰度化 + 百分位对比度拉伸，弱化彩色背景（如粉底红字）
 */

export function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          '无法解码该图片格式。请改拍/截图为 JPG 或 PNG 后重新上传（iPhone 可关闭"高效格式"或截图后上传）'
        )
      );
    img.src = dataUrl;
  });
}

export async function preprocessForOcr(
  base64: string,
  mediaType: ImageMediaType
): Promise<HTMLCanvasElement> {
  const img = await decodeImage(`data:${mediaType};base64,${base64}`);
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longSide) throw new Error('图片为空，请重新选择');

  // 目标长边：放大 2 倍，但限制在 [1200, 2400] 之间（兼顾识别率与内存）
  const target = Math.min(2400, Math.max(1200, longSide * 2));
  const scale = target / longSide;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('当前浏览器不支持画布处理');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const n = w * h;

  // 灰度
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    gray[p] = v;
    hist[v]++;
  }

  // 百分位（0.5% / 99.5%）找拉伸区间，避免阴影/高光离群点干扰
  const loCount = n * 0.005;
  const hiCount = n * 0.995;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= loCount && lo === 0) lo = v;
    if (acc >= hiCount) {
      hi = v;
      break;
    }
  }
  const range = Math.max(1, hi - lo);

  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let v = ((gray[p] - lo) / range) * 255;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
