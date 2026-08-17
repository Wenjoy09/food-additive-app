import type { HealthLabel, NutritionPer100g } from './types';

/**
 * 依据 GB 28050-2011《预包装食品营养标签通则》附录 C 的含量声称阈值
 * 计算健康标签。固体按每 100g、液体按每 100mL 计。
 *
 * 注意：中国营养成分表通常不强制标注"糖"，此处用碳水化合物近似
 * （标签页会注明该近似）。警示类标签（高脂/高糖/高钠）为自定义启发式，
 * 非 GB 官方声称。
 */

const KJ_PER_KCAL = 4.184;

/** 将每 100g 能量统一换算为千卡（kcal），缺失则返回 null */
export function toKcal(n: NutritionPer100g): number | null {
  if (n.energyKcal != null) return n.energyKcal;
  if (n.energyKj != null) return n.energyKj / KJ_PER_KCAL;
  return null;
}

export function evaluateNutrition(
  n: NutritionPer100g,
  isLiquid: boolean
): HealthLabel[] {
  const labels: HealthLabel[] = [];

  // —— 加分项（GB 含量声称阈值） ——
  if (n.sodiumMg != null && n.sodiumMg <= 120) {
    labels.push({ text: '低钠', tone: 'good' });
  }
  if (n.fatG != null && n.fatG <= (isLiquid ? 1.5 : 3)) {
    labels.push({ text: '低脂', tone: 'good' });
  }
  if (n.carbohydrateG != null) {
    if (n.carbohydrateG <= 0.5) {
      labels.push({ text: '无糖', tone: 'good' });
    } else if (n.carbohydrateG <= 5) {
      labels.push({ text: '低糖', tone: 'good' });
    }
  }
  if (n.proteinG != null && n.proteinG >= (isLiquid ? 6 : 12)) {
    labels.push({ text: '高蛋白', tone: 'good' });
  }

  // —— 警示项（启发式阈值） ——
  if (n.fatG != null && n.fatG > 20) {
    labels.push({ text: '高脂', tone: 'warn' });
  }
  if (n.carbohydrateG != null && n.carbohydrateG > 15) {
    labels.push({ text: '高糖', tone: 'warn' });
  }
  // NRV 钠 = 2000mg，≥600mg 即达到 30% NRV，提示注意
  if (n.sodiumMg != null && n.sodiumMg >= 600) {
    labels.push({ text: '高钠', tone: 'warn' });
  }

  return labels;
}

/**
 * 计算指定克数的总热量。
 * @param kcalPer100g 每 100g 千卡
 * @param totalGrams 总克数
 */
export function totalCalories(kcalPer100g: number, totalGrams: number): number {
  return (kcalPer100g * totalGrams) / 100;
}

/** 把千卡换算成直观参照（一碗米饭 ≈ 200 kcal） */
export function caloriesToRiceBowls(kcal: number): number {
  return kcal / 200;
}
