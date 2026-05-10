import { RotateCcw, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { parseBeamAnnotation } from '../modeling/annotation';
import type { BeamParameters, ColumnParameters, ComponentType, DisplayOptions, FrameParameters, SlabParameters } from '../types';

type ControlsPanelProps = {
  componentType: ComponentType;
  parameters: BeamParameters;
  column: ColumnParameters;
  frame?: FrameParameters;
  slab?: SlabParameters;
  updateFrameParameter?: <K extends keyof FrameParameters>(key: K, value: FrameParameters[K]) => void;
  updateSlabParameter?: <K extends keyof SlabParameters>(key: K, value: SlabParameters[K]) => void;
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
  setComponentType: (type: ComponentType) => void;
  updateParameter: <K extends keyof BeamParameters>(key: K, value: BeamParameters[K]) => void;
  applyParameters: (patch: Partial<BeamParameters>) => void;
  updateColumnParameter: <K extends keyof ColumnParameters>(key: K, value: ColumnParameters[K]) => void;
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

export function ControlsPanel({
  componentType,
  parameters,
  column,
  frame,
  slab,
  display,
  errors,
  stats,
  setComponentType,
  updateParameter,
  applyParameters,
  updateColumnParameter,
  updateFrameParameter,
  updateSlabParameter,
  updateDisplay,
  reset,
}: ControlsPanelProps) {
  const [annotation, setAnnotation] = useState('KL1(2A) 300x700, A10@100/200(4), 4C25; 4C20');
  const [parseFeedback, setParseFeedback] = useState<{ matched: string[]; warnings: string[] } | null>(null);

  const handleParseAnnotation = () => {
    const result = parseBeamAnnotation(annotation);
    if (Object.keys(result.partial).length > 0) {
      applyParameters(result.partial);
    }
    setParseFeedback({ matched: result.matched, warnings: result.warnings });
  };

  return (
    <aside className="panel">
      <div className="panel-header">
        <div>
          <p>平法参数 · 22G101</p>
          <h2>{componentType === 'frame' ? '框架 KL+KZ' : componentType === 'column' ? '柱 KZ' : componentType === 'slab' ? '板 LB' : '梁 KL'} 构件</h2>
        </div>
        <button className="icon-button" type="button" onClick={reset} aria-label="重置参数">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="component-tabs four">
        <button type="button" className={componentType === 'frame' ? 'active' : ''} onClick={() => setComponentType('frame')}>框架</button>
        <button type="button" className={componentType === 'beam' ? 'active' : ''} onClick={() => setComponentType('beam')}>梁 KL</button>
        <button type="button" className={componentType === 'column' ? 'active' : ''} onClick={() => setComponentType('column')}>柱 KZ</button>
        <button type="button" className={componentType === 'slab' ? 'active' : ''} onClick={() => setComponentType('slab')}>板 LB</button>
      </div>

      {componentType === 'slab' && slab && updateSlabParameter && (<>
      <section>
        <h3>板几何</h3>
        <div className="field-grid">
          <NumberField label="X 跨度" unit="mm" value={slab.length} min={1500} max={12000} step={100} onChange={(value) => updateSlabParameter('length', value)} />
          <NumberField label="Z 跨度" unit="mm" value={slab.width} min={1500} max={12000} step={100} onChange={(value) => updateSlabParameter('width', value)} />
          <NumberField label="板厚" unit="mm" value={slab.thickness} min={80} max={400} step={10} onChange={(value) => updateSlabParameter('thickness', value)} />
          <NumberField label="保护层" unit="mm" value={slab.cover} min={10} max={40} step={1} onChange={(value) => updateSlabParameter('cover', value)} />
          <NumberField label="顶筋弯锚 nd" value={slab.anchorageRatio} min={6} max={20} step={1} onChange={(value) => updateSlabParameter('anchorageRatio', value)} />
        </div>
        <p className="note">板厚 ≥ 80mm，保护层一类环境取 15mm。顶部支座负筋两端按 {slab.anchorageRatio}d 90° 弯锚到板底。</p>
      </section>

      <section>
        <h3>下层钢筋网</h3>
        <div className="field-grid">
          <NumberField label="X 向直径" unit="mm" value={slab.bottomBarXDiameter} min={6} max={20} step={1} onChange={(value) => updateSlabParameter('bottomBarXDiameter', value)} />
          <NumberField label="X 向间距" unit="mm" value={slab.bottomBarXSpacing} min={80} max={400} step={10} onChange={(value) => updateSlabParameter('bottomBarXSpacing', value)} />
          <NumberField label="Z 向直径" unit="mm" value={slab.bottomBarZDiameter} min={6} max={20} step={1} onChange={(value) => updateSlabParameter('bottomBarZDiameter', value)} />
          <NumberField label="Z 向间距" unit="mm" value={slab.bottomBarZSpacing} min={80} max={400} step={10} onChange={(value) => updateSlabParameter('bottomBarZSpacing', value)} />
        </div>
      </section>

      <section>
        <h3>上层钢筋网</h3>
        <div className="field-grid">
          <NumberField label="X 向直径" unit="mm" value={slab.topBarXDiameter} min={6} max={20} step={1} onChange={(value) => updateSlabParameter('topBarXDiameter', value)} />
          <NumberField label="X 向间距" unit="mm" value={slab.topBarXSpacing} min={80} max={400} step={10} onChange={(value) => updateSlabParameter('topBarXSpacing', value)} />
          <NumberField label="Z 向直径" unit="mm" value={slab.topBarZDiameter} min={6} max={20} step={1} onChange={(value) => updateSlabParameter('topBarZDiameter', value)} />
          <NumberField label="Z 向间距" unit="mm" value={slab.topBarZSpacing} min={80} max={400} step={10} onChange={(value) => updateSlabParameter('topBarZSpacing', value)} />
        </div>
      </section>
      </>)}

      {componentType === 'frame' && frame && updateFrameParameter && (<>
      <section>
        <h3>框架几何</h3>
        <div className="field-grid">
          <NumberField label="净跨 Ln" unit="mm" value={frame.spanLn} min={2000} max={20000} step={100} onChange={(value) => updateFrameParameter('spanLn', value)} />
          <NumberField label="柱总高 Hn" unit="mm" value={frame.columnHeight} min={1500} max={9000} step={100} onChange={(value) => updateFrameParameter('columnHeight', value)} />
          <NumberField label="梁宽 b" unit="mm" value={frame.beamWidth} min={150} max={1200} step={10} onChange={(value) => updateFrameParameter('beamWidth', value)} />
          <NumberField label="梁高 h" unit="mm" value={frame.beamHeight} min={300} max={2000} step={10} onChange={(value) => updateFrameParameter('beamHeight', value)} />
          <NumberField label="柱截面 b" unit="mm" value={frame.columnWidth} min={300} max={1500} step={10} onChange={(value) => updateFrameParameter('columnWidth', value)} />
          <NumberField label="柱截面 h" unit="mm" value={frame.columnDepth} min={300} max={1500} step={10} onChange={(value) => updateFrameParameter('columnDepth', value)} />
          <NumberField label="保护层" unit="mm" value={frame.cover} min={10} max={120} step={5} onChange={(value) => updateFrameParameter('cover', value)} />
          <label className="field">
            <span>抗震等级</span>
            <select value={frame.seismicGrade} onChange={(event) => updateFrameParameter('seismicGrade', event.target.value as FrameParameters['seismicGrade'])}>
              <option value="none">非抗震</option>
              <option value="1">一级</option>
              <option value="2">二级</option>
              <option value="3">三级</option>
              <option value="4">四级</option>
            </select>
          </label>
        </div>
        <p className="note">梁总长自动 = 净跨 Ln + 2×柱截面 b。柱顶与梁顶平齐，梁主筋两端 15d 弯锚伸入端柱。</p>
      </section>

      <section>
        <h3>梁纵筋 / 箍筋</h3>
        <div className="field-grid">
          <NumberField label="上部根数" value={frame.topBarCount} min={1} max={20} onChange={(value) => updateFrameParameter('topBarCount', value)} />
          <NumberField label="上部直径" unit="mm" value={frame.topBarDiameter} min={10} max={40} onChange={(value) => updateFrameParameter('topBarDiameter', value)} />
          <NumberField label="下部根数" value={frame.bottomBarCount} min={1} max={20} onChange={(value) => updateFrameParameter('bottomBarCount', value)} />
          <NumberField label="下部直径" unit="mm" value={frame.bottomBarDiameter} min={10} max={40} onChange={(value) => updateFrameParameter('bottomBarDiameter', value)} />
          <NumberField label="腰筋根数" value={frame.waistBarCount} min={0} max={10} onChange={(value) => updateFrameParameter('waistBarCount', value)} />
          <NumberField label="梁箍筋直径" unit="mm" value={frame.beamStirrupDiameter} min={6} max={16} onChange={(value) => updateFrameParameter('beamStirrupDiameter', value)} />
          <NumberField label="加密间距" unit="mm" value={frame.beamDenseSpacing} min={50} max={200} step={10} onChange={(value) => updateFrameParameter('beamDenseSpacing', value)} />
          <NumberField label="普通间距" unit="mm" value={frame.beamStirrupSpacing} min={100} max={400} step={10} onChange={(value) => updateFrameParameter('beamStirrupSpacing', value)} />
          <label className="field">
            <span>梁箍筋肢数</span>
            <select value={frame.beamStirrupLegCount} onChange={(event) => updateFrameParameter('beamStirrupLegCount', Number(event.target.value) as FrameParameters['beamStirrupLegCount'])}>
              <option value={2}>2 肢</option>
              <option value={4}>4 肢</option>
              <option value={6}>6 肢</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h3>柱纵筋 / 箍筋</h3>
        <div className="field-grid">
          <NumberField label="角筋直径" unit="mm" value={frame.cornerBarDiameter} min={16} max={40} onChange={(value) => updateFrameParameter('cornerBarDiameter', value)} />
          <NumberField label="中部筋直径" unit="mm" value={frame.sideBarDiameter} min={12} max={40} onChange={(value) => updateFrameParameter('sideBarDiameter', value)} />
          <NumberField label="b 边中部筋" value={frame.sideBarsX} min={0} max={8} onChange={(value) => updateFrameParameter('sideBarsX', value)} />
          <NumberField label="h 边中部筋" value={frame.sideBarsZ} min={0} max={8} onChange={(value) => updateFrameParameter('sideBarsZ', value)} />
          <NumberField label="柱箍筋直径" unit="mm" value={frame.columnStirrupDiameter} min={6} max={16} onChange={(value) => updateFrameParameter('columnStirrupDiameter', value)} />
          <NumberField label="柱加密间距" unit="mm" value={frame.columnDenseSpacing} min={50} max={200} step={10} onChange={(value) => updateFrameParameter('columnDenseSpacing', value)} />
          <NumberField label="柱普通间距" unit="mm" value={frame.columnStirrupSpacing} min={100} max={400} step={10} onChange={(value) => updateFrameParameter('columnStirrupSpacing', value)} />
          <label className="field">
            <span>柱箍筋肢数</span>
            <select value={frame.columnStirrupLegCount} onChange={(event) => updateFrameParameter('columnStirrupLegCount', Number(event.target.value) as FrameParameters['columnStirrupLegCount'])}>
              <option value={2}>2 肢</option>
              <option value={4}>4 肢</option>
              <option value={6}>6 肢</option>
            </select>
          </label>
        </div>
      </section>
      </>)}

      {componentType === 'beam' && (<>
      <section>
        <h3>平法集中标注</h3>
        <label className="field annotation-field">
          <span>标注字符串</span>
          <textarea
            rows={2}
            value={annotation}
            onChange={(event) => setAnnotation(event.target.value)}
            placeholder="例如: KL1(2A) 300x700, A10@100/200(4), 4C25; 4C20"
          />
        </label>
        <button className="primary-button" type="button" onClick={handleParseAnnotation}>
          <Wand2 size={14} /> 解析并应用到模型
        </button>
        {parseFeedback && (
          <div className="parse-feedback">
            {parseFeedback.matched.length > 0 && (
              <p className="match-line">已识别: {parseFeedback.matched.join(' · ')}</p>
            )}
            {parseFeedback.warnings.map((warning, index) => (
              <p key={index} className="warn-line">⚠ {warning}</p>
            ))}
          </div>
        )}
      </section>

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
      </>)}

      {componentType === 'column' && (<>
      <section>
        <h3>柱截面</h3>
        <div className="field-grid">
          <NumberField label="柱总高 Hn" unit="mm" value={column.height} min={1500} max={12000} step={100} onChange={(value) => updateColumnParameter('height', value)} />
          <NumberField label="截面 b" unit="mm" value={column.width} min={200} max={2000} step={10} onChange={(value) => updateColumnParameter('width', value)} />
          <NumberField label="截面 h" unit="mm" value={column.depth} min={200} max={2000} step={10} onChange={(value) => updateColumnParameter('depth', value)} />
          <NumberField label="保护层" unit="mm" value={column.cover} min={10} max={120} step={5} onChange={(value) => updateColumnParameter('cover', value)} />
          <label className="field">
            <span>抗震等级</span>
            <select value={column.seismicGrade} onChange={(event) => updateColumnParameter('seismicGrade', event.target.value as ColumnParameters['seismicGrade'])}>
              <option value="none">非抗震</option>
              <option value="1">一级</option>
              <option value="2">二级</option>
              <option value="3">三级</option>
              <option value="4">四级</option>
            </select>
          </label>
          <NumberField label="净高比 Hn/" value={column.clearHeightRatio} min={3} max={10} step={1} onChange={(value) => updateColumnParameter('clearHeightRatio', value)} />
        </div>
        <p className="note">柱端加密区按 22G101-1 取 max(柱截面较大边, Hn/净高比, 500mm)。一级抗震建议净高比 6，二~四级 6。</p>
      </section>

      <section>
        <h3>柱纵筋</h3>
        <div className="field-grid">
          <NumberField label="角筋直径" unit="mm" value={column.cornerBarDiameter} min={12} max={40} onChange={(value) => updateColumnParameter('cornerBarDiameter', value)} />
          <NumberField label="中部筋直径" unit="mm" value={column.sideBarDiameter} min={10} max={40} onChange={(value) => updateColumnParameter('sideBarDiameter', value)} />
          <NumberField label="b 边中部筋" value={column.sideBarsX} min={0} max={10} onChange={(value) => updateColumnParameter('sideBarsX', value)} />
          <NumberField label="h 边中部筋" value={column.sideBarsZ} min={0} max={10} onChange={(value) => updateColumnParameter('sideBarsZ', value)} />
        </div>
        <p className="note">4 根角筋 + 两侧中部筋按各边均匀分布。柱纵筋总数 = 4 + 2×(b边数) + 2×(h边数)。</p>
      </section>

      <section>
        <h3>柱箍筋</h3>
        <div className="field-grid">
          <NumberField label="箍筋直径" unit="mm" value={column.stirrupDiameter} min={6} max={20} onChange={(value) => updateColumnParameter('stirrupDiameter', value)} />
          <label className="field">
            <span>箍筋肢数</span>
            <select value={column.stirrupLegCount} onChange={(event) => updateColumnParameter('stirrupLegCount', Number(event.target.value) as ColumnParameters['stirrupLegCount'])}>
              <option value={2}>2 肢</option>
              <option value={4}>4 肢 (井字)</option>
              <option value={6}>6 肢</option>
            </select>
          </label>
          <NumberField label="普通间距" unit="mm" value={column.stirrupSpacing} min={50} max={500} step={10} onChange={(value) => updateColumnParameter('stirrupSpacing', value)} />
          <NumberField label="加密间距" unit="mm" value={column.denseZoneSpacing} min={40} max={300} step={10} onChange={(value) => updateColumnParameter('denseZoneSpacing', value)} />
          <NumberField label="首道距底部" unit="mm" value={column.firstStirrupOffset} min={0} max={200} step={5} onChange={(value) => updateColumnParameter('firstStirrupOffset', value)} />
        </div>
      </section>
      </>)}

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
