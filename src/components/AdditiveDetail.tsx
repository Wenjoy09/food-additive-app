import { Utensils, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import type { Additive } from '@/lib/types';

export default function AdditiveDetail({ additive }: { additive: Additive }) {
  return (
    <div>
      <div className="card">
        <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{additive.name}</h2>
          <span className="badge">{additive.category}</span>
        </div>
        {additive.aliases.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '8px 0 0' }}>
            别名 / 编号：{additive.aliases.join(' · ')}
          </p>
        )}
      </div>

      <div className="card">
        <div className="detail-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Info style={{ width: 14, height: 14 }} /> 主要作用
          </h3>
          <p>{additive.function}</p>
        </div>

        <div className="detail-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle style={{ width: 14, height: 14 }} /> 潜在危害 / 安全说明
          </h3>
          <p>{additive.hazards}</p>
        </div>

        {additive.commonFoods.length > 0 && (
          <div className="detail-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Utensils style={{ width: 14, height: 14 }} /> 常见于
            </h3>
            <div className="ingredient-list">
              {additive.commonFoods.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="alert alert-success" style={{ marginTop: 4 }}>
        <ShieldCheck />
        <span>
          以上信息仅供参考。在中国，食品添加剂的使用范围和限量由 GB 2760
          规定，合规使用通常是安全的；如有过敏史或特殊健康状况，请以医生或营养师建议为准。
        </span>
      </div>
    </div>
  );
}
