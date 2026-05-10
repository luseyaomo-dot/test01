import { useMemo } from 'react';
import { BeamScene } from './components/BeamScene';
import { ControlsPanel } from './components/ControlsPanel';
import { buildBeamGeometry } from './modeling/beam';
import { buildColumnGeometry } from './modeling/column';
import { useBeamStore } from './store/useBeamStore';

function App() {
  const componentType = useBeamStore((state) => state.componentType);
  const parameters = useBeamStore((state) => state.parameters);
  const column = useBeamStore((state) => state.column);
  const display = useBeamStore((state) => state.display);
  const errors = useBeamStore((state) => state.errors);
  const setComponentType = useBeamStore((state) => state.setComponentType);
  const updateParameter = useBeamStore((state) => state.updateParameter);
  const applyParameters = useBeamStore((state) => state.applyParameters);
  const updateColumnParameter = useBeamStore((state) => state.updateColumnParameter);
  const updateDisplay = useBeamStore((state) => state.updateDisplay);
  const reset = useBeamStore((state) => state.reset);
  const geometry = useMemo(
    () => (componentType === 'column' ? buildColumnGeometry(column) : buildBeamGeometry(parameters)),
    [componentType, parameters, column],
  );
  const headerTitle = componentType === 'column' ? '柱构件 KZ 参数化预览' : '梁构件 KL 参数化预览';
  const heroLabel = componentType === 'column' ? '柱高' : '梁长';
  const heroValue = componentType === 'column' ? `${column.height}mm` : `${parameters.length}mm`;

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p>纯前端 3D 钢筋平法可视化 · 22G101 系列</p>
          <h1>{headerTitle}</h1>
          <span>切换构件类型与参数，模型按 22G101 平法构造规则即时重建。</span>
        </div>
        <div className="hero-metrics">
          <strong>{heroValue}</strong>
          <span>{heroLabel}</span>
        </div>
      </section>

      <section className="workspace">
        <ControlsPanel
          componentType={componentType}
          parameters={parameters}
          column={column}
          display={display}
          errors={errors}
          stats={geometry.stats}
          setComponentType={setComponentType}
          updateParameter={updateParameter}
          applyParameters={applyParameters}
          updateColumnParameter={updateColumnParameter}
          updateDisplay={updateDisplay}
          reset={reset}
        />
        <div className="viewport-card">
          <div className="viewport-toolbar">
            <div>
              <p>3D 预览</p>
              <h2>混凝土透明实体 + 纵筋 + 箍筋阵列</h2>
            </div>
            <div className="legend">
              <span><i className="legend-top" />上部筋</span>
              <span><i className="legend-bottom" />下部筋</span>
              <span><i className="legend-stirrup" />箍筋</span>
            </div>
          </div>
          <div className="viewport">
            <BeamScene key={componentType} geometry={geometry} display={display} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
