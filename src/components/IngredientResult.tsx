import { ChevronRight, FlaskConical } from 'lucide-react';
import type { IngredientScanResult, MatchedAdditive } from '@/lib/types';
import { evaluateNutrition } from '@/lib/nutritionEvaluator';
import HealthLabels from './HealthLabels';
import NutritionTable from './NutritionTable';

interface Props {
  result: IngredientScanResult;
  matched: MatchedAdditive[];
  isSample?: boolean;
  onOpenDetail: (id: string) => void;
}

export default function IngredientResult({ result, matched, isSample, onOpenDetail }: Props) {
  const labels = result.nutritionPer100g
    ? evaluateNutrition(result.nutritionPer100g, result.isLiquid)
    : [];

  return (
    <div>
      {isSample && (
        <div className="alert alert-info">
          <span>这是示例演示数据。配置 API Key 后即可扫描真实图片。</span>
        </div>
      )}

      <div className="card">
        <p className="card-title">
          {result.productName ?? '未识别到产品名称'}
          {result.isLiquid && (
            <span className="badge gray" style={{ marginLeft: 8 }}>液体</span>
          )}
        </p>

        <div className="detail-section">
          <h3>健康评估（依据 GB 28050 阈值）</h3>
          <HealthLabels labels={labels} />
        </div>

        {result.nutritionPer100g ? (
          <div className="detail-section">
            <h3>营养成分</h3>
            <NutritionTable nutrition={result.nutritionPer100g} isLiquid={result.isLiquid} />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            图片中未识别到营养成分表
          </p>
        )}
      </div>

      <div className="card">
        <p className="card-title">
          <FlaskConical style={{ width: 15, height: 15, verticalAlign: -2, marginRight: 5 }} />
          食品添加剂（{matched.length} 种）
        </p>
        {matched.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
            未识别到食品添加剂，或该产品配料表中不含添加剂
          </p>
        ) : (
          matched.map((m, i) => (
            <MatchedAdditiveRow key={`${m.scannedName}-${i}`} matched={m} onOpenDetail={onOpenDetail} />
          ))
        )}
      </div>

      <div className="card">
        <p className="card-title">全部配料</p>
        {result.ingredients.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>未识别到配料表</p>
        ) : (
          <div className="ingredient-list">
            {result.ingredients.map((ing, i) => (
              <span key={`${ing}-${i}`}>{ing}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchedAdditiveRow({
  matched,
  onOpenDetail,
}: {
  matched: MatchedAdditive;
  onOpenDetail: (id: string) => void;
}) {
  const a = matched.additive;
  if (!a) {
    return (
      <div className="additive-item" style={{ cursor: 'default' }}>
        <div className="row">
          <p className="name">{matched.scannedName}</p>
          <span className="badge gray">本地库未收录</span>
        </div>
        <p className="func">该添加剂暂不在本地数据库中，可尝试直接搜索名称了解</p>
      </div>
    );
  }

  return (
    <button className="additive-item" onClick={() => onOpenDetail(a.id)}>
      <div className="row">
        <p className="name">
          {a.name}
          {a.name !== matched.scannedName && (
            <span style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 400 }}>
              （识别为：{matched.scannedName}）
            </span>
          )}
        </p>
        <span className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span className="badge">{a.category}</span>
          <ChevronRight style={{ width: 15, height: 15, color: 'var(--gray-500)' }} />
        </span>
      </div>
      <p className="func">{a.function}</p>
    </button>
  );
}
