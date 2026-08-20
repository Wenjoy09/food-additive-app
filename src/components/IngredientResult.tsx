import { useState } from 'react';
import { Check, ChevronRight, FlaskConical, Pencil, X } from 'lucide-react';
import type { IngredientScanResult, MatchedAdditive, NutritionPer100g } from '@/lib/types';
import { evaluateNutrition } from '@/lib/nutritionEvaluator';
import HealthLabels from './HealthLabels';
import NutritionTable from './NutritionTable';

interface Props {
  result: IngredientScanResult;
  matched: MatchedAdditive[];
  isSample?: boolean;
  onOpenDetail: (id: string) => void;
  /** 用户修正识别结果后回调（健康标签会随之重新计算） */
  onChange?: (result: IngredientScanResult) => void;
}

interface Draft {
  energyKj: string;
  energyKcal: string;
  proteinG: string;
  fatG: string;
  carbohydrateG: string;
  sodiumMg: string;
  isLiquid: boolean;
  additives: string;
  ingredients: string;
}

function toDraft(r: IngredientScanResult): Draft {
  const n = r.nutritionPer100g;
  return {
    energyKj: n?.energyKj?.toString() ?? '',
    energyKcal: n?.energyKcal?.toString() ?? '',
    proteinG: n?.proteinG?.toString() ?? '',
    fatG: n?.fatG?.toString() ?? '',
    carbohydrateG: n?.carbohydrateG?.toString() ?? '',
    sodiumMg: n?.sodiumMg?.toString() ?? '',
    isLiquid: r.isLiquid,
    additives: r.additives.join('\n'),
    ingredients: r.ingredients.join('\n'),
  };
}

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

function fromDraft(r: IngredientScanResult, d: Draft): IngredientScanResult {
  const nutrition: NutritionPer100g = {
    energyKj: numOrNull(d.energyKj),
    energyKcal: numOrNull(d.energyKcal),
    proteinG: numOrNull(d.proteinG),
    fatG: numOrNull(d.fatG),
    carbohydrateG: numOrNull(d.carbohydrateG),
    sodiumMg: numOrNull(d.sodiumMg),
  };
  return {
    ...r,
    isLiquid: d.isLiquid,
    additives: d.additives.split('\n').map((s) => s.trim()).filter(Boolean),
    ingredients: d.ingredients.split('\n').map((s) => s.trim()).filter(Boolean),
    nutritionPer100g: nutrition,
  };
}

export default function IngredientResult({ result, matched, isSample, onOpenDetail, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(result));

  const labels = result.nutritionPer100g
    ? evaluateNutrition(result.nutritionPer100g, result.isLiquid)
    : [];

  function startEdit() {
    setDraft(toDraft(result));
    setEditing(true);
  }

  function save() {
    onChange?.(fromDraft(result, draft));
    setEditing(false);
  }

  return (
    <div>
      {isSample && (
        <div className="alert alert-info">
          <span>这是示例演示数据。配置 API Key 后即可扫描真实图片。</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p className="card-title" style={{ margin: 0 }}>
            {result.productName ?? '未识别到产品名称'}
            {result.isLiquid && (
              <span className="badge gray" style={{ marginLeft: 8 }}>液体</span>
            )}
          </p>
          {onChange && !editing && (
            <button className="edit-btn" onClick={startEdit}>
              <Pencil style={{ width: 13, height: 13 }} /> 修正
            </button>
          )}
        </div>

        {editing ? (
          <EditForm draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setEditing(false)} />
        ) : (
          <>
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
                图片中未识别到营养成分表，可点「修正」手动补录
              </p>
            )}
          </>
        )}
      </div>

      {!editing && (
        <>
          <div className="card">
            <p className="card-title">
              <FlaskConical style={{ width: 15, height: 15, verticalAlign: -2, marginRight: 5 }} />
              食品添加剂（{matched.length} 种）
            </p>
            {matched.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
                未识别到食品添加剂，或该产品配料表中不含添加剂。可点「修正」手动补充
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
        </>
      )}
    </div>
  );
}

function EditForm({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const fields: { key: keyof Draft; label: string }[] = [
    { key: 'energyKj', label: '能量 (kJ)' },
    { key: 'energyKcal', label: '能量 (千卡)' },
    { key: 'proteinG', label: '蛋白质 (g)' },
    { key: 'fatG', label: '脂肪 (g)' },
    { key: 'carbohydrateG', label: '碳水 (g)' },
    { key: 'sodiumMg', label: '钠 (mg)' },
  ];

  return (
    <div>
      <div className="edit-grid">
        {fields.map((f) => (
          <label key={f.key} className="edit-field">
            <span>{f.label}</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={draft[f.key] as string}
              onChange={(e) => set({ [f.key]: e.target.value } as Partial<Draft>)}
            />
          </label>
        ))}
      </div>
      <label className="edit-check">
        <input
          type="checkbox"
          checked={draft.isLiquid}
          onChange={(e) => set({ isLiquid: e.target.checked })}
        />
        液体食品（按每 100mL 评估）
      </label>
      <label className="edit-field" style={{ marginTop: 8 }}>
        <span>食品添加剂（每行一个）</span>
        <textarea
          className="input"
          rows={4}
          value={draft.additives}
          onChange={(e) => set({ additives: e.target.value })}
        />
      </label>
      <label className="edit-field" style={{ marginTop: 8 }}>
        <span>配料（每行一个）</span>
        <textarea
          className="input"
          rows={4}
          value={draft.ingredients}
          onChange={(e) => set({ ingredients: e.target.value })}
        />
      </label>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={onSave}>
          <Check style={{ width: 16, height: 16 }} /> 保存并重算
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>
          <X style={{ width: 16, height: 16 }} /> 取消
        </button>
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
