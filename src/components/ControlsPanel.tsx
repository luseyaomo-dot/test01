import { RotateCcw } from 'lucide-react';
import type { BeamParameters, DisplayOptions } from '../types';

type ControlsPanelProps = {
  parameters: BeamParameters;
  display: DisplayOptions;
  errors: Partial<Record<keyof BeamParameters, string>>;
  stats: {
    topBars: number;
    bottomBars: number;
    waistBars: number;
    stirrups: number;
  };
  updateParameter: <K extends keyof BeamParameters>(key: K, value: BeamParameters[K]) => void;
  updateDisplay: <K extends keyof DisplayOptions>(key: K, value: DisplayOptions[K]) => void;
  reset: () => void;
};

type NumberFieldProps = {
  label: string;
  unit?: string;
  value: number;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
};

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function NumberField({ label, unit, value, error, min, max, step = 1, onChange }: NumberFieldProps) {
  return (
    <label className="field">
      <span>
        {label}
        {unit && <em>{unit}</em>}
      </span>
      <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
      {error && <strong>{error}</strong>}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="toggle-field">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function ControlsPanel({ parameters, display, errors, stats, updateParameter, updateDisplay, reset }: ControlsPanelProps) {
  return (
    <aside className="panel">
      <div className="panel-header">
        <div>
          <p>平法参数</p>
          <h2>梁构件 MVP</h2>
        </div>
        <button className="icon-button" type="button" onClick={reset} aria-label="重置参数">
          <RotateCcw size={18} />
        </button>
      </div>

      <section>
        <h3>混凝土尺寸</h3>
        <div className="field-grid">
          <NumberField label="梁长" unit="mm" value={parameters.length} min={1000} max={30000} step={100} error={errors.length} onChange={(value) => updateParameter('length', value)} />
          <NumberField label="梁宽" unit="mm" value={parameters.width} min={120} max={2000} step={10} error={errors.width} onChange={(value) => updateParameter('width', value)} />
          <NumberField label="梁高" unit="mm" value={parameters.height} min={200} max={3000} step={10} error={errors.height} onChange={(value) => updateParameter('height', value)} />
          <NumberField label="保护层" unit="mm" value={parameters.cover} min={10} max={120} step={5} error={errors.cover} onChange={(value) => updateParameter('cover', value)} />
        </div>
      </section>

      <section>
        <h3>纵筋</h3>
        <div className="field-grid">
          <NumberField label="上部根数" value={parameters.topBarCount} min={1} max={20} error={errors.topBarCount} onChange={(value) => updateParameter('topBarCount', value)} />
          <NumberField label="上部直径" unit="mm" value={parameters.topBarDiameter} min={6} max={50} error={errors.topBarDiameter} onChange={(value) => updateParameter('topBarDiameter', value)} />
          <NumberField label="下部根数" value={parameters.bottomBarCount} min={1} max={20} error={errors.bottomBarCount} onChange={(value) => updateParameter('bottomBarCount', value)} />
          <NumberField label="下部直径" unit="mm" value={parameters.bottomBarDiameter} min={6} max={50} error={errors.bottomBarDiameter} onChange={(value) => updateParameter('bottomBarDiameter', value)} />
          <NumberField label="腰筋根数" value={parameters.waistBarCount} min={0} max={20} error={errors.waistBarCount} onChange={(value) => updateParameter('waistBarCount', value)} />
          <NumberField label="腰筋直径" unit="mm" value={parameters.waistBarDiameter} min={6} max={40} error={errors.waistBarDiameter} onChange={(value) => updateParameter('waistBarDiameter', value)} />
        </div>
      </section>

      <section>
        <h3>箍筋</h3>
        <div className="field-grid">
          <NumberField label="箍筋直径" unit="mm" value={parameters.stirrupDiameter} min={4} max={20} error={errors.stirrupDiameter} onChange={(value) => updateParameter('stirrupDiameter', value)} />
          <NumberField label="普通间距" unit="mm" value={parameters.stirrupSpacing} min={50} max={500} step={10} error={errors.stirrupSpacing} onChange={(value) => updateParameter('stirrupSpacing', value)} />
          <NumberField label="加密区长" unit="mm" value={parameters.denseZoneLength} min={0} max={5000} step={50} error={errors.denseZoneLength} onChange={(value) => updateParameter('denseZoneLength', value)} />
          <NumberField label="加密间距" unit="mm" value={parameters.denseZoneSpacing} min={40} max={300} step={10} error={errors.denseZoneSpacing} onChange={(value) => updateParameter('denseZoneSpacing', value)} />
          <NumberField label="弯钩长度" unit="mm" value={parameters.stirrupHookLength} min={30} max={300} step={10} error={errors.stirrupHookLength} onChange={(value) => updateParameter('stirrupHookLength', value)} />
        </div>
      </section>

      <section>
        <h3>显示控制</h3>
        <div className="toggle-grid">
          <ToggleField label="混凝土" checked={display.showConcrete} onChange={(value) => updateDisplay('showConcrete', value)} />
          <ToggleField label="边线" checked={display.showWireframe} onChange={(value) => updateDisplay('showWireframe', value)} />
          <ToggleField label="上部筋" checked={display.showTopBars} onChange={(value) => updateDisplay('showTopBars', value)} />
          <ToggleField label="下部筋" checked={display.showBottomBars} onChange={(value) => updateDisplay('showBottomBars', value)} />
          <ToggleField label="腰筋" checked={display.showWaistBars} onChange={(value) => updateDisplay('showWaistBars', value)} />
          <ToggleField label="箍筋" checked={display.showStirrups} onChange={(value) => updateDisplay('showStirrups', value)} />
        </div>
        <label className="range-field">
          <span>混凝土透明度</span>
          <input type="range" min="0.05" max="0.75" step="0.01" value={display.concreteOpacity} onChange={(event) => updateDisplay('concreteOpacity', Number(event.target.value))} />
        </label>
      </section>

      <section className="stats-card">
        <h3>当前模型</h3>
        <div>
          <span>上部筋 {stats.topBars}</span>
          <span>下部筋 {stats.bottomBars}</span>
          <span>腰筋 {stats.waistBars}</span>
          <span>箍筋 {stats.stirrups}</span>
        </div>
      </section>
    </aside>
  );
}
