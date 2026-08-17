import { useMemo, useState } from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import {
  ADDITIVE_CATEGORIES,
  type Additive,
} from '@/lib/types';
import {
  filterByCategory,
  getAllAdditives,
  getAdditiveById,
  searchAdditives,
} from '@/lib/additives';
import AdditiveDetail from '@/components/AdditiveDetail';

interface Props {
  detailId: string | null;
  onOpenDetail: (id: string) => void;
  onBack: () => void;
}

export default function AdditivesPage({ detailId, onOpenDetail, onBack }: Props) {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const results = useMemo(
    () => filterByCategory(searchAdditives(keyword), category),
    [keyword, category]
  );

  if (detailId) {
    const additive = getAdditiveById(detailId);
    return (
      <div>
        <button className="back-btn" onClick={onBack}>
          <ChevronLeft /> 返回列表
        </button>
        {additive ? (
          <AdditiveDetail additive={additive} />
        ) : (
          <div className="empty-text">未找到该添加剂记录</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">食品添加剂库</h2>
      <p className="page-desc">
        收录 {getAllAdditives().length} 种常见食品添加剂，可查看作用与潜在危害
      </p>

      <div className="search-box">
        <Search />
        <input
          className="input"
          placeholder="搜索名称 / 别名 / INS 号，如「苯甲酸钠」"
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
        {ADDITIVE_CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="empty-text">
          没有找到匹配的添加剂
          {keyword && <p>试试更短的关键词，如「柠檬黄」</p>}
        </div>
      ) : (
        results.map((a) => (
          <AdditiveListItem key={a.id} additive={a} onOpen={() => onOpenDetail(a.id)} />
        ))
      )}
    </div>
  );
}

function AdditiveListItem({ additive, onOpen }: { additive: Additive; onOpen: () => void }) {
  return (
    <button className="additive-item" onClick={onOpen}>
      <div className="row">
        <p className="name">{additive.name}</p>
        <span className="badge">{additive.category}</span>
      </div>
      <p className="func">{additive.function}</p>
    </button>
  );
}
