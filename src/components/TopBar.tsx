import { Bell, Cloud, Download, Save, Search } from 'lucide-react';

const tabs = ['工作台', '项目文件', '模型', '分析', '报表'];

type TopBarProps = {
  activeTab?: string;
  onExport?: () => void;
};

export function TopBar({ activeTab = '工作台', onExport }: TopBarProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-logo">RV</div>
        <div>
          <p className="brand-title">RebarVis Pro</p>
          <span className="brand-subtitle">V0.1.0 · 22G101 平法</span>
        </div>
      </div>

      <nav className="top-nav">
        <span className="nav-engine">结构引擎</span>
        {tabs.map((tab) => (
          <button key={tab} type="button" className={tab === activeTab ? 'active' : ''}>
            {tab}
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <div className="search-box">
          <Search size={14} />
          <input type="text" placeholder="搜索构件 / 标注..." />
        </div>
        <button className="icon-action" type="button" aria-label="通知"><Bell size={16} /></button>
        <button className="icon-action" type="button" aria-label="云"><Cloud size={16} /></button>
        <button className="ghost-action" type="button"><Save size={14} /> 保存参数</button>
        <button className="primary-action" type="button" onClick={onExport}><Download size={14} /> 导出下料表</button>
      </div>
    </header>
  );
}
