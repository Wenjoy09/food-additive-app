import { useMemo, useState } from 'react';
import { Apple, Search } from 'lucide-react';
import {
  FOOD_CATEGORIES,
  GI_LEVEL_TEXT,
  giLevel,
  type FoodItem,
} from '@/lib/types';
import { filterFoodsByCategory, searchFoods, sortFoods, type FoodSortKey } from '@/lib/foods';

export default function FoodsPage() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<FoodSortKey>('default');

  const results = useMemo(
    () => sortFoods(filterFoodsByCategory(searchFoods(keyword), category), sortKey),
    [keyword, category, sortKey]
  );

  return (
    <div>
      <h2 className="page-title">常见食物库</h2>
      <p className="page-desc">
        瓜果蔬菜、肉蛋水产等常见食物每 100g 热量与升糖指数（GI）
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
        results.map((f) => <FoodRow key={f.id} food={f} />)
      )}

      <p className="nutrition-note" style={{ margin: '12px 4px' }}>
        GI 分级（国际通用）：低 GI ≤ 55 · 中 GI 56–69 · 高 GI ≥ 70。
        肉蛋水产等几乎不含碳水的食物「GI 不适用」。数据为常见平均值，
        实际因品种、成熟度、烹饪方式而异，仅供参考。
      </p>
    </div>
  );
}

function FoodRow({ food }: { food: FoodItem }) {
  const level = giLevel(food.gi);
  const badgeClass =
    level === 'low' ? 'badge' : level === 'medium' ? 'badge warn-mid' : level === 'high' ? 'badge warn' : 'badge gray';

  return (
    <div className="food-item">
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
    </div>
  );
}
