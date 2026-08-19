import { useState } from 'react';
import { Apple, BookOpen, Flame, ScanLine, Settings, Leaf } from 'lucide-react';
import { SettingsProvider } from './AppSettingsContext';
import AdditivesPage from './pages/AdditivesPage';
import FoodsPage from './pages/FoodsPage';
import ScanPage from './pages/ScanPage';
import CaloriesPage from './pages/CaloriesPage';
import SettingsPage from './pages/SettingsPage';

type Tab = 'foods' | 'library' | 'scan' | 'calories' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: 'foods', label: '食物库', icon: Apple },
  { id: 'library', label: '添加剂', icon: BookOpen },
  { id: 'scan', label: '扫描', icon: ScanLine },
  { id: 'calories', label: '热量', icon: Flame },
  { id: 'settings', label: '设置', icon: Settings },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('foods');
  // 添加剂详情（从列表或扫描结果点入）
  const [detailId, setDetailId] = useState<string | null>(null);

  const openDetail = (id: string) => setDetailId(id);
  const closeDetail = () => setDetailId(null);

  return (
    <SettingsProvider>
      <div className="app-shell">
        <header className="app-header">
          <Leaf className="logo" />
          <div>
            <h1>食品健康查</h1>
            <div className="subtitle">常见食物 · 添加剂 · 配料扫描 · 热量计算</div>
          </div>
        </header>

        <main className="page">
          {tab === 'foods' && <FoodsPage />}
          {tab === 'library' && (
            <AdditivesPage
              detailId={detailId}
              onOpenDetail={openDetail}
              onBack={closeDetail}
            />
          )}
          {tab === 'scan' && <ScanPage onOpenDetail={openDetail} />}
          {tab === 'calories' && <CaloriesPage />}
          {tab === 'settings' && <SettingsPage />}
        </main>

        <nav className="tabbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => {
                  setTab(t.id);
                  setDetailId(null);
                }}
              >
                <Icon />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </SettingsProvider>
  );
}
