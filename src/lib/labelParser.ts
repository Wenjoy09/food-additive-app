import type { CalorieScanResult, NutritionPer100g } from './types';

/**
 * 纯解析函数：把 OCR 文本解析为结构化营养/配料数据。
 * 独立成模块便于测试（不依赖 tesseract / 本地库）。
 */

/** 逐行宽松解析营养成分，容忍单位缺失/误识（国标单位固定：能量 kJ、钠 mg） */
export function parseNutritionText(text: string): NutritionPer100g | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, ''))
    .filter(Boolean);

  const firstNum = (s: string): number | null => {
    const m = /([0-9]+(?:\.[0-9]+)?)/.exec(s);
    if (!m) return null;
    const v = parseFloat(m[1]);
    return Number.isFinite(v) ? v : null;
  };

  let energyKj: number | null = null;
  let energyKcal: number | null = null;
  let proteinG: number | null = null;
  let fatG: number | null = null;
  let carbohydrateG: number | null = null;
  let sodiumMg: number | null = null;

  for (const line of lines) {
    if (/能量/.test(line)) {
      const v = firstNum(line.replace(/能量/, ''));
      if (v != null) {
        // 国标标签能量默认以千焦标注；明确出现千卡/kcal 才记为千卡
        if (/千卡|kcal|大卡/i.test(line)) energyKcal = v;
        else energyKj = v;
      }
    } else if (/蛋白质?/.test(line) && proteinG == null) {
      proteinG = firstNum(line.replace(/蛋白质?/, ''));
    } else if (/脂肪/.test(line) && fatG == null) {
      fatG = firstNum(line.replace(/脂肪/, ''));
    } else if (/碳水/.test(line) && carbohydrateG == null) {
      carbohydrateG = firstNum(line.replace(/碳水(?:化合物)?/, ''));
    } else if ((/^钠/.test(line) || /钠[0-9]/.test(line)) && sodiumMg == null) {
      sodiumMg = firstNum(line.replace(/钠/, ''));
    }
  }

  if (
    energyKj == null &&
    energyKcal == null &&
    proteinG == null &&
    fatG == null &&
    carbohydrateG == null &&
    sodiumMg == null
  ) {
    return null;
  }
  return { energyKj, energyKcal, proteinG, fatG, carbohydrateG, sodiumMg };
}

export function parseIsLiquid(text: string): boolean {
  return /每\s*100\s*(?:mL|ml|毫升)/.test(text);
}

/** 从 OCR 文本中提取配料表段落并拆分 */
export function parseIngredientsText(text: string): string[] {
  const compact = text.replace(/\s+/g, '');
  const start = compact.indexOf('配料');
  if (start === -1) return [];
  let body = compact.slice(start);
  const cutKeys = ['营养成分表', '营养成分', '贮存条件', '保质期', '生产日期', '食用方法', '产品标准'];
  for (const k of cutKeys) {
    const i = body.indexOf(k, 4);
    if (i > 0) body = body.slice(0, i);
  }
  body = body.replace(/^配料(?:表)?[:：]?/, '');
  // 去掉常见包裹括号残留，便于逐项展示
  return body
    .replace(/[（(]/g, '，')
    .replace(/[）)]/g, '')
    .split(/[，、,;；]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 30);
}

/** 从文本中提取总净含量（克），如 "210g/份"、"净含量：500克" */
export function parseTotalWeightG(text: string): number | null {
  const compact = text.replace(/\s+/g, '');
  const m =
    /净含量[::]?([0-9]+(?:\.[0-9]+)?)(?:克|g|G)/.exec(compact) ??
    /([0-9]+(?:\.[0-9]+)?)(?:克|g|G)\s*[/／]?\s*份/.exec(compact) ??
    /[×xX]\s*[0-9]+\s*(?:克|g|G)\s*[=＝]\s*([0-9]+(?:\.[0-9]+)?)(?:克|g|G)/.exec(compact);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** OCR 文本 → 热量识别结果 */
export function textToCalorieResult(text: string): CalorieScanResult {
  const n = parseNutritionText(text);
  return {
    productName: null,
    energyKj: n?.energyKj ?? null,
    energyKcal: n?.energyKcal ?? null,
    basis: parseIsLiquid(text) ? '每100mL' : '每100g',
    servingSizeG: null,
    totalWeightG: parseTotalWeightG(text),
  };
}
