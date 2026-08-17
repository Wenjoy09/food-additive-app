import additivesData from '@/data/additives.json';
import type { Additive, MatchedAdditive } from './types';

const ADDITIVES = additivesData as unknown as Additive[];

export function getAllAdditives(): Additive[] {
  return ADDITIVES;
}

export function getAdditiveById(id: string): Additive | undefined {
  return ADDITIVES.find((a) => a.id === id);
}

/** 关键词搜索：匹配名称、别名、INS/CNS 号、分类 */
export function searchAdditives(keyword: string): Additive[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return ADDITIVES;
  return ADDITIVES.filter(
    (a) =>
      a.name.toLowerCase().includes(kw) ||
      a.category.toLowerCase().includes(kw) ||
      a.aliases.some((al) => al.toLowerCase().includes(kw))
  );
}

/** 按分类过滤 */
export function filterByCategory(list: Additive[], category: string | null): Additive[] {
  if (!category) return list;
  return list.filter((a) => a.category === category);
}

/**
 * 把识别出的添加剂名称模糊匹配到本地库。
 * 规则：去除括号内容/空格后，名称或任一别名互相包含即视为匹配。
 */
export function matchAdditive(scannedName: string): Additive | null {
  const clean = normalize(scannedName);
  if (!clean) return null;

  let best: Additive | null = null;
  let bestScore = 0;

  for (const a of ADDITIVES) {
    const names = [a.name, ...a.aliases].map(normalize).filter(Boolean);
    for (const n of names) {
      let score = 0;
      if (n === clean) score = 100;
      else if (clean.includes(n) || n.includes(clean)) {
        score = Math.min(90, (Math.min(clean.length, n.length) / Math.max(clean.length, n.length)) * 90 + 10);
      }
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (bestScore === 100) break;
  }

  return bestScore >= 40 ? best : null;
}

export function matchAdditives(scannedNames: string[]): MatchedAdditive[] {
  return scannedNames.map((name) => ({
    scannedName: name,
    additive: matchAdditive(name),
  }));
}

/** 去掉括号内容、空白和常见包裹词，便于匹配 */
function normalize(s: string): string {
  return s
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s,，、]/g, '')
    .toLowerCase();
}
