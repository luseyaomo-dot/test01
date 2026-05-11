import { Box, Download, Layers, Settings2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type MobileTab = 'view' | 'params' | 'bom';

type MobileShellProps = {
  activeTab: MobileTab;
  setActiveTab: (t: MobileTab) => void;
  view: ReactNode;     // 3D viewport content (full bleed)
  params: ReactNode;   // sidebar + controls panel
  bom: ReactNode;      // bom table + hints
  onExport?: () => void;
};

const TABS: { key: MobileTab; label: string; icon: typeof Box }[] = [
  { key: 'view', label: '3D', icon: Box },
  { key: 'params', label: '参数', icon: Settings2 },
  { key: 'bom', label: '下料', icon: Layers },
];

const TAB_TITLE: Record<MobileTab, string> = {
  view: '3D 可视化',
  params: '参数面板',
  bom: '下料表',
};

export function MobileShell({ activeTab, setActiveTab, view, params, bom, onExport }: MobileShellProps) {
  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <span className="mobile-logo">RV</span>
          <span className="mobile-title">{TAB_TITLE[activeTab]}</span>
        </div>
        <button type="button" className="mobile-export" onClick={onExport} aria-label="导出下料表">
          <Download size={16} />
        </button>
      </header>

      <main className={`mobile-main mobile-main-${activeTab}`}>
        <div className={`mobile-page ${activeTab === 'view' ? 'active' : ''}`} aria-hidden={activeTab !== 'view'}>
          {view}
        </div>
        <div className={`mobile-page mobile-page-scroll ${activeTab === 'params' ? 'active' : ''}`} aria-hidden={activeTab !== 'params'}>
          {params}
        </div>
        <div className={`mobile-page mobile-page-scroll ${activeTab === 'bom' ? 'active' : ''}`} aria-hidden={activeTab !== 'bom'}>
          {bom}
        </div>
      </main>

      <nav className="mobile-tabbar">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`mobile-tab ${key === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
