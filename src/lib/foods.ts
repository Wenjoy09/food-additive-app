import foodsData from '@/data/foods.json';
import type { FoodItem } from './types';

const FOODS = foodsData as unknown as FoodItem[];

export function getAllFoods(): FoodItem[] {
  return FOODS;
}

/** 关键词搜索（名称匹配） */
export function searchFoods(keyword: string): FoodItem[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return FOODS;
  return FOODS.filter((f) => f.name.toLowerCase().includes(kw));
}

/** 按分类过滤 */
export function filterFoodsByCategory(list: FoodItem[], category: string | null): FoodItem[] {
  if (!category) return list;
  return list.filter((f) => f.category === category);
}

/** 排序：默认按分类+名称；可按热量或 GI 升/降序 */
export type FoodSortKey = 'default' | 'kcal-asc' | 'kcal-desc' | 'gi-asc' | 'gi-desc';

export function sortFoods(list: FoodItem[], key: FoodSortKey): FoodItem[] {
  const arr = [...list];
  switch (key) {
    case 'kcal-asc':
      return arr.sort((a, b) => a.kcalPer100g - b.kcalPer100g);
    case 'kcal-desc':
      return arr.sort((a, b) => b.kcalPer100g - a.kcalPer100g);
    case 'gi-asc':
      return arr.sort((a, b) => (a.gi ?? 999) - (b.gi ?? 999));
    case 'gi-desc':
      return arr.sort((a, b) => (b.gi ?? -1) - (a.gi ?? -1));
    default:
      return arr;
  }
}
