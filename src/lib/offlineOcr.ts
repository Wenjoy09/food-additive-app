import { getAllAdditives } from './additives';
import { parseIngredientsText, parseIsLiquid, parseNutritionText, textToCalorieResult } from './labelParser';
import type { IngredientScanResult } from './types';

/**
 * 离线 OCR：浏览器本地识别（tesseract.js），无需 API Key、无需联网。
 * 引擎与中英文语言包已内置在 public/tesseract/，首次加载后缓存。
 * 准确率低于大模型视觉识别，作为备用方案。
 */

export type OcrProgressFn = (status: string, progress: number) => void;

/** 识别图片中的文字（中文+英文）。输入为预处理后的画布或 data URL */
export async function recognizeText(
  input: HTMLCanvasElement | string,
  onProgress?: OcrProgressFn
): Promise<string> {
  const texts = await recognizeManyTexts([input], (_i, s, p) => onProgress?.(s, p));
  return texts[0] ?? '';
}

/** 批量识别多张图片：worker 只创建一次，逐张识别 */
export async function recognizeManyTexts(
  inputs: (HTMLCanvasElement | string)[],
  onProgress?: (index: number, status: string, progress: number) => void
): Promise<string[]> {
  const { createWorker, OEM } = await import('tesseract.js');
  // tesseract 的 worker 运行在 blob: URL 中，相对路径无法解析，必须传绝对 URL；
  // 以当前目录为基准，兼容部署在子路径（如 GitHub Pages 的 /<repo>/）
  const base = new URL('./', window.location.href).href;
  let current = 0; // 当前正在识别的图片序号，供 logger 使用
  const worker = await createWorker(['chi_sim', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${base}tesseract/worker.min.js`,
    corePath: `${base}tesseract`,
    langPath: `${base}tesseract/langdata`,
    // 语言包为未压缩的 .traineddata，关闭默认的 .gz 后缀请求
    gzip: false,
    logger: (m) => onProgress?.(current, m.status ?? '', m.progress ?? 0),
  });
  try {
    const out: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      current = i;
      const { data } = await worker.recognize(inputs[i]);
      out.push(normalizeOcrText(data.text ?? ''));
    }
    return out;
  } finally {
    await worker.terminate();
  }
}

/** 修正 OCR 常见形近字误识，提高后续解析命中率 */
export function normalizeOcrText(text: string): string {
  return text
    .replace(/生牛[列烈裂]/g, '生牛乳')
    .replace(/添加[是足呈]/g, '添加量')
    .replace(/配料[表:]?[：:]/g, '配料表：')
    .replace(/碳水化[台合]物/g, '碳水化合物')
    .replace(/B-?胡萝卜素/g, 'β-胡萝卜素');
}

/** 在配料文本中匹配本地库已收录的添加剂 */
export function findAdditivesInText(ingredientText: string): string[] {
  const compact = ingredientText.replace(/\s+/g, '');
  if (!compact) return [];
  const found: string[] = [];
  for (const a of getAllAdditives()) {
    if (compact.includes(a.name)) {
      found.push(a.name);
      continue;
    }
    if (a.aliases.some((al) => al.length >= 3 && /[一-龥]/.test(al) && compact.includes(al))) {
      found.push(a.name);
    }
  }
  return found;
}

/** OCR 文本 → 配料扫描结果 */
export function textToIngredientResult(text: string): IngredientScanResult {
  const ingredients = parseIngredientsText(text);
  const ingredientJoined = ingredients.join('，');
  return {
    productName: null,
    isLiquid: parseIsLiquid(text),
    ingredients,
    additives: findAdditivesInText(ingredientJoined || text),
    nutritionPer100g: parseNutritionText(text),
  };
}

export { textToCalorieResult };
