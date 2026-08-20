import { useMemo, useState } from 'react';
import { Apple, ChevronLeft, Search } from 'lucide-react';
import {
  FOOD_CATEGORIES,
  GI_LEVEL_TEXT,
  giLevel,
  type FoodItem,
} from '@/lib/types';
import { filterFoodsByCategory, getAllFoods, searchFoods, sortFoods, type FoodSortKey } from '@/lib/foods';

export default function FoodsPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<FoodSortKey>('default');
  const [detailId, setDetailId] = useState<string | null>(null);

  const results = useMemo(
    () => sortFoods(filterFoodsByCategory(searchFoods(keyword), category), sortKey),
    [keyword, category, sortKey]
  );

  const detail = detailId ? getAllFoods().find((f) => f.id === detailId) ?? null : null;

  if (detail) {
    return (
      <div>
        <button className="back-btn" onClick={() => setDetailId(null)}>
          <ChevronLeft /> 返回列表
        </button>
        <FoodDetail food={detail} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">常见食物库</h2>
      <p className="page-desc">
        瓜果蔬菜、肉蛋水产等常见食物每 100g 热量与升糖指数（GI），点进去查看营养素含量
      </p>

      <div className="search-box">
        <Search />
        <input
          className="input"
          placeholder="搜索食物，如「苹果」「鸡胸肉」"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="chip-row">
        <button
          className={`chip ${category === null ? 'active' : ''}`}
          onClick={() => setCategory(null)}
        >
          全部
        </button>
        {FOOD_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>排序</span>
        <select
          className="select"
          style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as FoodSortKey)}
        >
          <option value="default">默认</option>
          <option value="kcal-asc">热量 低→高</option>
          <option value="kcal-desc">热量 高→低</option>
          <option value="gi-asc">GI 低→高</option>
          <option value="gi-desc">GI 高→低</option>
        </select>
      </div>

      {results.length === 0 ? (
        <div className="empty-text">没有找到匹配的食物</div>
      ) : (
        results.map((f) => <FoodRow key={f.id} food={f} onOpen={() => setDetailId(f.id)} />)
      )}

      <p className="nutrition-note" style={{ margin: '12px 4px' }}>
        GI 分级（国际通用）：低 GI ≤ 55 · 中 GI 56–69 · 高 GI ≥ 70。
        肉蛋水产等几乎不含碳水的食物「GI 不适用」。数据为常见平均值，
        实际因品种、成熟度、烹饪方式而异，仅供参考。
      </p>
    </div>
  );
}

function FoodRow({ food, onOpen }: { food: FoodItem; onOpen: () => void }) {
  const level = giLevel(food.gi);
  const badgeClass =
    level === 'low' ? 'badge' : level === 'medium' ? 'badge warn-mid' : level === 'high' ? 'badge warn' : 'badge gray';

  return (
    <button className="food-item" onClick={onOpen}>
      <div className="row">
        <p className="name">
          <Apple className="food-icon" />
          {food.name}
        </p>
        <span className={badgeClass}>{GI_LEVEL_TEXT[level]}</span>
      </div>
      <div className="metrics">
        <span className="metric">
          <b>{food.kcalPer100g}</b> 千卡/100g
        </span>
        <span className="metric">
          GI <b>{food.gi ?? '—'}</b>
        </span>
        <span className="badge gray">{food.category}</span>
      </div>
      {food.note && <p className="note">{food.note}</p>}
    </button>
  );
}

function FoodDetail({ food }: { food: FoodItem }) {
  const level = giLevel(food.gi);
  const badgeClass =
    level === 'low' ? 'badge' : level === 'medium' ? 'badge warn-mid' : level === 'high' ? 'badge warn' : 'badge gray';

  return (
    <div>
      <div className="card">
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{food.name}</h2>
          <span className={badgeClass}>{GI_LEVEL_TEXT[level]}</span>
        </div>
        <div className="metrics" style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <span className="metric">
            <b>{food.kcalPer100g}</b> 千卡/100g
          </span>
          <span className="metric">
            GI <b>{food.gi ?? '—'}</b>
          </span>
          <span className="badge gray">{food.category}</span>
        </div>
        {food.note && <p className="note" style={{ marginTop: 8 }}>{food.note}</p>}
      </div>

      <div className="card">
        <p className="card-title">营养素含量（每 100g 可食部）</p>
        {food.nutrients && food.nutrients.length > 0 ? (
          <table className="nutrition-table">
            <tbody>
              {food.nutrients.map((n) => (
                <tr key={n.name}>
                  <td>{n.name}</td>
                  <td>
                    {n.amount} {n.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>暂无营养素数据</p>
        )}
      </div>

      {food.benefits && food.benefits.length > 0 && (
        <div className="card">
          <p className="card-title">主要营养元素及功能</p>
          {food.benefits.map((b, i) => (
            <div className="benefit-row" key={b.name}>
              <span className="benefit-idx">{i + 1}</span>
              <div>
                <p className="benefit-name">{b.name}</p>
                <p className="benefit-desc">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {food.advice && (
        <div className="card">
          <p className="card-title">食用建议与注意事项</p>
          {food.advice.cooking.length > 0 && (
            <div className="advice-block">
              <h4>烹饪方式</h4>
              {food.advice.cooking.map((t) => (
                <p key={t}>• {t}</p>
              ))}
            </div>
          )}
          {food.advice.pairing.length > 0 && (
            <div className="advice-block">
              <h4>搭配建议</h4>
              {food.advice.pairing.map((t) => (
                <p key={t}>• {t}</p>
              ))}
            </div>
          )}
          {food.advice.caution.length > 0 && (
            <div className="advice-block">
              <h4>注意人群</h4>
              {food.advice.caution.map((t) => (
                <p key={t} className="caution">• {t}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {food.myths && food.myths.length > 0 && (
        <div className="card">
          <p className="card-title">常见误区</p>
          {food.myths.map((m) => (
            <div className="myth-block" key={m.q}>
              <p className="myth-q">❓ {m.q}</p>
              <p className="myth-a">{m.a}</p>
            </div>
          ))}
        </div>
      )}

      <p className="nutrition-note" style={{ margin: '4px 4px 0' }}>
        数据为常见平均值，实际因品种、成熟度、烹饪方式而异，仅供参考。
      </p>
    </div>
  );
}
