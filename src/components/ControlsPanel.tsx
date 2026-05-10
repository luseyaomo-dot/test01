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
    legCount: number;
    denseZoneLength: number;
    hookLength: number;
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
          <label className="field">
            <span>抗震等级</span>
            <select value={parameters.seismicGrade} onChange={(event) => updateParameter('seismicGrade', event.target.value as BeamParameters['seismicGrade'])}>
              <option value="none">非抗震</option>
              <option value="1">一级</option>
              <option value="2">二级</option>
              <option value="3">三级</option>
              <option value="4">四级</option>
            </select>
          </label>
          <NumberField label="锚固长度 La" unit="mm" value={parameters.anchorageLength} min={0} max={2000} step={10} error={errors.anchorageLength} onChange={(value) => updateParameter('anchorageLength', value)} />
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
          <label className="field">
            <span>箍筋肢数</span>
            <select value={parameters.stirrupLegCount} onChange={(event) => updateParameter('stirrupLegCount', Number(event.target.value) as BeamParameters['stirrupLegCount'])}>
              <option value={2}>2 肢</option>
              <option value={4}>4 肢</option>
              <option value={6}>6 肢</option>
            </select>
          </label>
          <NumberField label="普通间距" unit="mm" value={parameters.stirrupSpacing} min={50} max={500} step={10} error={errors.stirrupSpacing} onChange={(value) => updateParameter('stirrupSpacing', value)} />
          <NumberField label="加密间距" unit="mm" value={parameters.denseZoneSpacing} min={40} max={300} step={10} error={errors.denseZoneSpacing} onChange={(value) => updateParameter('denseZoneSpacing', value)} />
          <NumberField label="首道距支座" unit="mm" value={parameters.firstStirrupOffset} min={0} max={200} step={5} error={errors.firstStirrupOffset} onChange={(value) => updateParameter('firstStirrupOffset', value)} />
        </div>
        <p className="note">加密区长度按抗震等级自动计算: 一级取 max(2h, 500mm)，二~四级取 max(1.5h, 500mm); 135° 弯钩长度 = max(10d, 75mm)。</p>
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
          <ToggleField label="复合内箍" checked={display.showInnerStirrups} onChange={(value) => updateDisplay('showInnerStirrups', value)} />
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
          <span>箍筋 {stats.stirrups} 道 / {stats.legCount} 肢</span>
          <span>加密区 {stats.denseZoneLength.toFixed(0)} mm</span>
          <span>弯钩 {stats.hookLength.toFixed(0)} mm</span>
        </div>
      </section>
    </aside>
  );
}
