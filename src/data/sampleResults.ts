import type { CalorieScanResult, IngredientScanResult } from '@/lib/types';

/**
 * 未配置 API Key 时的演示数据，让用户先体验完整流程。
 */

export const SAMPLE_INGREDIENT_RESULT: IngredientScanResult = {
  productName: '示例：柠檬味气泡水',
  isLiquid: true,
  ingredients: [
    '水',
    '赤藓糖醇',
    '二氧化碳',
    '柠檬汁',
    '食用香精',
    '酸度调节剂（柠檬酸，柠檬酸钠）',
    '甜味剂（三氯蔗糖，安赛蜜）',
  ],
  additives: ['赤藓糖醇', '食用香精', '柠檬酸', '柠檬酸钠', '三氯蔗糖', '安赛蜜'],
  nutritionPer100g: {
    energyKj: 0,
    energyKcal: 0,
    proteinG: 0,
    fatG: 0,
    carbohydrateG: 0.5,
    sodiumMg: 5,
  },
};

export const SAMPLE_CALORIE_RESULT: CalorieScanResult = {
  productName: '示例：全麦饼干',
  energyKj: 1980,
  energyKcal: null,
  basis: '每100g',
  servingSizeG: null,
};
