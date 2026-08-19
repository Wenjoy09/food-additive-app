import { analyzeCalories, analyzeIngredients } from './claudeApi';
import type { ApiSettings } from './claudeApi';
import type { CalorieScanResult, ImageMediaType, IngredientScanResult } from './types';

/**
 * 多服务商视觉识别层：
 * - claude：Anthropic 官方 SDK（需海外 API Key）
 * - qwen：通义千问（国内，OpenAI 兼容接口，通常有免费额度）
 * - glm：智谱 GLM（国内，OpenAI 兼容接口，glm-4v-flash 免费）
 * - custom：任意 OpenAI 兼容视觉接口（如本地/自建代理）
 */
export type ProviderId = 'claude' | 'qwen' | 'glm' | 'custom';

export interface ProviderMeta {
  id: ProviderId;
  label: string;
  hint: string;
  defaultBaseURL: string;
  defaultModel: string;
  keyUrl: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'qwen',
    label: '通义千问（推荐·国内）',
    hint: '阿里云百炼平台，新用户通常有免费额度；视觉模型 qwen-vl-max',
    defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-vl-max',
    keyUrl: 'https://bailian.console.aliyun.com/',
  },
  {
    id: 'glm',
    label: '智谱 GLM（国内）',
    hint: 'glm-4v-flash 视觉模型免费；注册即用',
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4v-flash',
    keyUrl: 'https://open.bigmodel.cn/',
  },
  {
    id: 'claude',
    label: 'Claude（海外）',
    hint: '识别最准；需要 Anthropic API Key（海外支付方式）',
    defaultBaseURL: '',
    defaultModel: 'claude-opus-4-8',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'custom',
    label: '自定义接口',
    hint: '任意 OpenAI 兼容的视觉接口（如自建代理 / 其他厂商）',
    defaultBaseURL: '',
    defaultModel: '',
    keyUrl: '',
  },
];

export function getProviderMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** 从可能带 markdown 围栏/前后杂文的文本中提取 JSON 对象 */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('识别结果中未包含 JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export interface VisionImage {
  base64: string;
  mediaType: ImageMediaType;
}

async function openaiCompatVision<T>(
  settings: ApiSettings,
  prompt: string,
  images: VisionImage[],
  schema: { [key: string]: unknown }
): Promise<T> {
  if (!settings.baseURL) throw new Error('未配置接口地址（baseURL）');
  // 智谱视觉模型输出上限为 1024 tokens，其余服务商可用更大值
  const maxTokens = /glm/i.test(settings.model) ? 1024 : 4096;
  const res = await fetch(`${settings.baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((img) => ({
              type: 'image_url',
              image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
            })),
            {
              type: 'text',
              text: `${prompt}\n\n只输出符合以下 JSON Schema 的纯 JSON，不要输出任何其他文字：\n${JSON.stringify(schema)}`,
            },
          ],
        },
      ],
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('API Key 无效或无权限，请到「设置」页检查');
  }
  if (res.status === 429) {
    throw new Error('请求过于频繁或额度不足，请稍后再试');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`识别失败（HTTP ${res.status}）：${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | { text?: string }[] } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((c) => (typeof c === 'string' ? c : (c.text ?? ''))).join('')
        : '';
  if (!text.trim()) throw new Error('识别结果为空，请换一张更清晰的照片重试');
  return extractJson(text) as T;
}

export const NUTRITION_SCHEMA = {
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
};

export const CALORIE_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: ['string', 'null'] },
    energyKj: { type: ['number', 'null'] },
    energyKcal: { type: ['number', 'null'] },
    basis: { type: ['string', 'null'] },
    servingSizeG: { type: ['number', 'null'] },
    totalWeightG: { type: ['number', 'null'] },
  },
  required: ['productName', 'energyKj', 'energyKcal', 'basis', 'servingSizeG', 'totalWeightG'],
  additionalProperties: false,
};

const INGREDIENT_PROMPT = [
  '请识别这些中国食品包装图片中的"配料表"和"营养成分表"（可能分布在不同图片中，请综合读取）：',
  '1. productName：产品名称（若可见）',
  '2. isLiquid：是否为液体食品（营养成分表按每100mL标注的为 true）',
  '3. ingredients：配料表全部配料，按原文顺序逐项拆分',
  '4. additives：其中属于食品添加剂的条目（含括号内标注，如"乳化剂(单，双甘油脂肪酸酯)"提取"单，双甘油脂肪酸酯"）',
  '5. nutritionPer100g：每 100g（或每100mL）数值。能量 kJ 填 energyKj、千卡填 energyKcal；蛋白质/脂肪/碳水化合物单位 g；钠单位 mg；没有的填 null',
  '只报告图中可见内容，看不清的填 null，不要编造。',
].join('\n');

const CALORIE_PROMPT = [
  '请读取这些中国食品包装图片中营养成分表的"能量"行（营养成分表可能在任意一张图中）：',
  '1. productName：产品名称（若可见）',
  '2. energyKj / energyKcal：能量数值（kJ 填 energyKj，千卡填 energyKcal，都有则都填）',
  '3. basis：标注基准，如"每100g"、"每100mL"或"每份"',
  '4. servingSizeG：若按"每份"标注，填每份克数；否则 null',
  '5. totalWeightG：商品总净含量（克），从商品标题/规格中找，如"6只 210g/份"填 210、"净含量：500g"填 500；找不到填 null',
  '只报告图中可见内容，看不清的填 null，不要编造。',
].join('\n');

export function analyzeIngredientsWithProvider(
  settings: ApiSettings & { provider: ProviderId },
  images: VisionImage[]
): Promise<IngredientScanResult> {
  if (settings.provider === 'claude') {
    return analyzeIngredients(settings, images);
  }
  return openaiCompatVision<IngredientScanResult>(
    settings,
    INGREDIENT_PROMPT,
    images,
    NUTRITION_SCHEMA
  );
}

export function analyzeCaloriesWithProvider(
  settings: ApiSettings & { provider: ProviderId },
  images: VisionImage[]
): Promise<CalorieScanResult> {
  if (settings.provider === 'claude') {
    return analyzeCalories(settings, images);
  }
  return openaiCompatVision<CalorieScanResult>(
    settings,
    CALORIE_PROMPT,
    images,
    CALORIE_SCHEMA
  );
}
