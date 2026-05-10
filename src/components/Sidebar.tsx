import { Box, Columns3, Frame, Layers, Plus, Settings, HelpCircle } from 'lucide-react';
import type { ComponentType } from '../types';

const componentItems: { key: ComponentType; label: string; icon: typeof Box }[] = [
  { key: 'frame', label: '框架 KL+KZ', icon: Frame },
  { key: 'beam', label: '梁 KL', icon: Box },
  { key: 'column', label: '柱 KZ', icon: Columns3 },
  { key: 'slab', label: '板 LB', icon: Layers },
];

type Preset = {
  id: string;
  title: string;
  subtitle: string;
};

const presets: Preset[] = [
  { id: 'default', title: '默认 KL · 5m / 300×600', subtitle: 'Hn 3600 · KZ 500×500' },
  { id: 'small', title: '小型次梁 · 4m / 250×400', subtitle: 'KZ 400×400 · 抗震二级' },
  { id: 'large', title: '大跨主梁 · 8m / 350×800', subtitle: 'KZ 600×600 · 一级' },
  { id: 'narrow', title: '窄支座弯锚 · 5m / 300×600', subtitle: '弯锚 0.4laE+15d' },
];

type SidebarProps = {
  componentType: ComponentType;
  setComponentType: (type: ComponentType) => void;
  applyPreset: (id: string) => void;
};

export function Sidebar({ componentType, setComponentType, applyPreset }: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <h4>构件库</h4>
        <ul className="component-list">
          {componentItems.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                type="button"
                className={key === componentType ? 'active' : ''}
                onClick={() => setComponentType(key)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="sidebar-section">
        <h4>预设方案</h4>
        <ul className="preset-list">
          {presets.map((preset) => (
            <li key={preset.id}>
              <button type="button" onClick={() => applyPreset(preset.id)}>
                <strong>{preset.title}</strong>
                <span>{preset.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="sidebar-footer">
        <button type="button" className="primary-button"><Plus size={14} /> 新建构件</button>
        <div className="footer-row">
          <button type="button"><Settings size={14} /> 设置</button>
          <button type="button"><HelpCircle size={14} /> 帮助</button>
        </div>
      </div>
    </aside>
  );
}
