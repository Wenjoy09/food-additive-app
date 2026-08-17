import type { HealthLabel } from '@/lib/types';

export default function HealthLabels({ labels }: { labels: HealthLabel[] }) {
  if (labels.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
        未触发明显的高/低标签（数据不足时部分标签不会显示）
      </p>
    );
  }
  return (
    <div className="label-row">
      {labels.map((l) => (
        <span key={l.text} className={`health-tag ${l.tone}`}>
          {l.tone === 'good' ? '✓' : '⚠'} {l.text}
        </span>
      ))}
    </div>
  );
}
