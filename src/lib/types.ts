/** 食品添加剂条目 */
export interface Additive {
  id: string;
  /** 中文通用名 */
  name: string;
  /** 别名 / INS 号 / CNS 号，用于搜索与识别匹配 */
  aliases: string[];
  /** 分类 */
  category: AdditiveCategory;
  /** 作用 */
  function: string;
  /** 潜在危害 / 安全说明 */
  hazards: string;
  /** 常见于哪些食品 */
  commonFoods: string[];
}

export type AdditiveCategory =
  | '防腐剂'
  | '甜味剂'
  | '抗氧化剂'
  | '着色剂'
  | '增稠剂'
  | '乳化剂'
  | '酸度调节剂'
  | '膨松剂'
  | '香精香料'
  | '水分保持剂'
  | '漂白剂'
  | '营养强化剂'
  | '稳定剂凝固剂'
  | '增味剂'
  | '其他';

export const ADDITIVE_CATEGORIES: AdditiveCategory[] = [
  '防腐剂',
  '甜味剂',
  '抗氧化剂',
  '着色剂',
  '增稠剂',
  '乳化剂',
  '酸度调节剂',
  '膨松剂',
  '香精香料',
  '水分保持剂',
  '漂白剂',
  '营养强化剂',
  '稳定剂凝固剂',
  '增味剂',
];

/** 每 100g（固体）或 100mL（液体）的营养成分 */
export interface NutritionPer100g {
  energyKj: number | null;
  energyKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbohydrateG: number | null;
  sodiumMg: number | null;
}

/** 配料表识别结果 */
export interface IngredientScanResult {
  productName: string | null;
  isLiquid: boolean;
  /** 全部配料 */
  ingredients: string[];
  /** 识别出的食品添加剂名称 */
  additives: string[];
  nutritionPer100g: NutritionPer100g | null;
}

/** 热量识别结果 */
export interface CalorieScanResult {
  productName: string | null;
  energyKj: number | null;
  energyKcal: number | null;
  /** 能量标注基准的说明，如 "每100g"、"每份30g" */
  basis: string | null;
  /** 每份克数（若标注按份计） */
  servingSizeG: number | null;
  /** 商品总净含量（克），如 "210g/份" 中的 210 */
  totalWeightG: number | null;
}

/** 健康标签 */
export interface HealthLabel {
  /** 显示文本，如 "低钠"、"高糖" */
  text: string;
  /** good = 健康加分项，warn = 需要注意 */
  tone: 'good' | 'warn';
}

/** 扫描结果中添加剂与本地库的关联 */
export interface MatchedAdditive {
  /** 识别出的原始名称 */
  scannedName: string;
  /** 本地库条目；未收录时为 null */
  additive: Additive | null;
}

/** 常见食物条目（非包装食品） */
export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  /** 每 100g 可食部分热量（千卡） */
  kcalPer100g: number;
  /** 升糖指数；肉蛋水产等几乎不含碳水的食物为 null（不适用） */
  gi: number | null;
  note: string | null;
}

export type FoodCategory =
  | '蔬菜'
  | '水果'
  | '肉蛋禽'
  | '水产'
  | '谷物主食'
  | '豆类坚果'
  | '乳品';

export const FOOD_CATEGORIES: FoodCategory[] = [
  '蔬菜',
  '水果',
  '肉蛋禽',
  '水产',
  '谷物主食',
  '豆类坚果',
  '乳品',
];

/** 升糖指数分级（国际通用标准） */
export type GiLevel = 'low' | 'medium' | 'high' | 'na';

export function giLevel(gi: number | null): GiLevel {
  if (gi == null) return 'na';
  if (gi <= 55) return 'low';
  if (gi <= 69) return 'medium';
  return 'high';
}

export const GI_LEVEL_TEXT: Record<GiLevel, string> = {
  low: '低 GI',
  medium: '中 GI',
  high: '高 GI',
  na: 'GI 不适用',
};

export const SCAN_MODE = 'scan' as const;
export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
