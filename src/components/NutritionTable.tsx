import type { NutritionPer100g } from '@/lib/types';
import { toKcal } from '@/lib/nutritionEvaluator';

interface Props {
  nutrition: NutritionPer100g;
  isLiquid: boolean;
}

function fmt(v: number | null, unit: string): string {
  if (v == null) return '未标注';
  return `${v} ${unit}`;
}

export default function NutritionTable({ nutrition, isLiquid }: Props) {
  const kcal = toKcal(nutrition);
  const basis = isLiquid ? '每 100mL' : '每 100g';

  const rows: { label: string; value: string }[] = [
    {
      label: '能量',
      value:
        kcal != null
          ? `${Math.round(kcal)} 千卡${nutrition.energyKj != null ? `（${nutrition.energyKj} kJ）` : ''}`
          : '未标注',
    },
    { label: '蛋白质', value: fmt(nutrition.proteinG, 'g') },
    { label: '脂肪', value: fmt(nutrition.fatG, 'g') },
    { label: '碳水化合物', value: fmt(nutrition.carbohydrateG, 'g') },
    { label: '钠', value: fmt(nutrition.sodiumMg, 'mg') },
  ];

  return (
    <div>
      <table className="nutrition-table">
        <tbody>
          <tr>
            <td style={{ fontWeight: 700 }}>项目</td>
            <td style={{ fontWeight: 700 }}>{basis}</td>
          </tr>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nutrition-note">
        注：中国营养成分表通常不强制标注「糖」，低糖/高糖按碳水化合物近似评估；
        1 千卡 = 4.184 kJ。
      </p>
    </div>
  );
}
