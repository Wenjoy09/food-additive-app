import Anthropic from '@anthropic-ai/sdk';
import type { CalorieScanResult, ImageMediaType, IngredientScanResult } from './types';

/**
 * Claude API 封装：图片 → 结构化识别结果。
 * 使用官方 TypeScript SDK（基于 fetch，浏览器中可直接运行）。
 *
 * 模型说明：
 * - claude-opus-4-8：默认，视觉识别能力最强，适合复杂中文标签
 * - claude-sonnet-5：均衡选择
 * - claude-haiku-4-5：最省成本、速度最快
 */
export type ModelId = 'claude-opus-4-8' | 'claude-sonnet-5' | 'claude-haiku-4-5';

export const MODEL_OPTIONS: { id: ModelId; label: string }[] = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8（最准）' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5（均衡）' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5（最快最省）' },
];

export interface ApiSettings {
  apiKey: string;
  model: string;
  /** 可选自定义 baseURL（如代理） */
  baseURL?: string;
}

export class ApiAuthError extends Error {}
export class ApiRateLimitError extends Error {}

function createClient(settings: ApiSettings): Anthropic {
  return new Anthropic({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL || undefined,
    // H5 应用运行在浏览器中，API Key 由用户自行保管（仅存本机）
    dangerouslyAllowBrowser: true,
  });
}

const NUTRITION_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: ['string', 'null'] },
    isLiquid: { type: 'boolean' },
    ingredients: { type: 'array', items: { type: 'string' } },
    additives: { type: 'array', items: { type: 'string' } },
    nutritionPer100g: {
      type: ['object', 'null'],
      properties: {
        energyKj: { type: ['number', 'null'] },
        energyKcal: { type: ['number', 'null'] },
        proteinG: { type: ['number', 'null'] },
        fatG: { type: ['number', 'null'] },
        carbohydrateG: { type: ['number', 'null'] },
        sodiumMg: { type: ['number', 'null'] },
      },
      additionalProperties: false,
    },
  },
  required: ['productName', 'isLiquid', 'ingredients', 'additives', 'nutritionPer100g'],
  additionalProperties: false,
} as const;

const CALORIE_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: ['string', 'null'] },
    energyKj: { type: ['number', 'null'] },
    energyKcal: { type: ['number', 'null'] },
    basis: { type: ['string', 'null'] },
    servingSizeG: { type: ['number', 'null'] },
  },
  required: ['productName', 'energyKj', 'energyKcal', 'basis', 'servingSizeG'],
  additionalProperties: false,
} as const;

async function callVision<T>(
  settings: ApiSettings,
  system: string,
  prompt: string,
  base64: string,
  mediaType: ImageMediaType,
  schema: { [key: string]: unknown }
): Promise<T> {
  const client = createClient(settings);
  try {
    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      system,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!text.trim()) {
      throw new Error('识别结果为空，请换一张更清晰的照片重试');
    }
    return JSON.parse(text) as T;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      throw new ApiAuthError('API Key 无效或已过期，请到「设置」页检查');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new ApiRateLimitError('请求过于频繁，请稍后再试');
    }
    if (e instanceof Anthropic.PermissionDeniedError) {
      throw new ApiAuthError('API Key 无权访问该模型，请在设置中切换模型或更换 Key');
    }
    if (e instanceof ApiAuthError || e instanceof ApiRateLimitError) {
      throw e;
    }
    if (e instanceof Error && e.message) {
      throw new Error(`识别失败：${e.message}`);
    }
    throw new Error('识别失败：网络错误或未知问题，请检查网络后重试');
  }
}

/** 功能 2：识别配料表 + 营养成分表 */
export function analyzeIngredients(
  settings: ApiSettings,
  base64: string,
  mediaType: ImageMediaType
): Promise<IngredientScanResult> {
  return callVision<IngredientScanResult>(
    settings,
    [
      '你是一位专业的中国预包装食品标签识别助手。',
      '你会从包装图片中准确读取"配料表"和"营养成分表"，并严格按 JSON Schema 输出。',
      '只报告图片中实际可见的内容；缺失或看不清的字段填 null；不要编造数字。',
    ].join('\n'),
    [
      '请识别这张食品包装图片：',
      '1. productName：产品名称（若可见）',
      '2. isLiquid：根据包装形态和标签基准判断是否为液体食品（按每100mL标注的为 true）',
      '3. ingredients：配料表中列出的全部配料，按原文顺序，逐项拆分',
      '4. additives：其中属于食品添加剂的条目（包括括号内标注的添加剂，如"乳化剂(单，双甘油脂肪酸酯)"应提取"单，双甘油脂肪酸酯"），逐项列出',
      '5. nutritionPer100g：营养成分表中每 100g（或每 100mL）的数值。能量若标注为 kJ 填 energyKj；若标注为千卡/kcal 填 energyKcal；两者都有则都填。蛋白质、脂肪、碳水化合物单位为 g，钠单位为 mg。表中没有的行填 null',
    ].join('\n'),
    base64,
    mediaType,
    NUTRITION_SCHEMA
  );
}

/** 功能 3：识别热量（能量）行 */
export function analyzeCalories(
  settings: ApiSettings,
  base64: string,
  mediaType: ImageMediaType
): Promise<CalorieScanResult> {
  return callVision<CalorieScanResult>(
    settings,
    [
      '你是一位专业的中国食品营养成分表识别助手，专注于读取"能量"行。',
      '只报告图片中实际可见的内容；缺失字段填 null；不要编造数字。',
    ].join('\n'),
    [
      '请读取这张食品包装图片中营养成分表的"能量"行：',
      '1. productName：产品名称（若可见）',
      '2. energyKj / energyKcal：能量数值（kJ 填 energyKj，千卡/kcal 填 energyKcal，都有则都填）',
      '3. basis：该能量的标注基准，如"每100g"、"每100mL"或"每份"',
      '4. servingSizeG：若按"每份"标注，填写每份的克数；否则填 null',
    ].join('\n'),
    base64,
    mediaType,
    CALORIE_SCHEMA
  );
}
