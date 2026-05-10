import { Box, Eye, Move3D, RefreshCw, Square } from 'lucide-react';
import type { ViewMode } from './BeamScene';

type ViewportToolsProps = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onResetView: () => void;
};

const tools: { mode: ViewMode; label: string; icon: typeof Box; tip: string }[] = [
  { mode: 'iso', label: '透视', icon: Move3D, tip: '等轴测视图 (默认)' },
  { mode: 'front', label: '前视', icon: Square, tip: '正立面 (沿 Z 轴看)' },
  { mode: 'top', label: '俯视', icon: Eye, tip: '俯视图 (沿 Y 轴看)' },
  { mode: 'side', label: '侧视', icon: Box, tip: '侧立面 (沿 X 轴看)' },
];

export function ViewportTools({ viewMode, setViewMode, onResetView }: ViewportToolsProps) {
  return (
    <div className="viewport-tools">
      {tools.map(({ mode, label, icon: Icon, tip }) => (
        <button
          key={mode}
          type="button"
          className={`viewport-tool ${viewMode === mode ? 'active' : ''}`}
          onClick={() => setViewMode(mode)}
          title={tip}
        >
          <Icon size={14} />
          <span>{label}</span>
        </button>
      ))}
      <button type="button" className="viewport-tool" onClick={onResetView} title="重新框选模型">
        <RefreshCw size={14} />
        <span>重置</span>
      </button>
    </div>
  );
}
