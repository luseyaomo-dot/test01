import { useMemo } from 'react';
import { BeamScene } from './components/BeamScene';
import { ControlsPanel } from './components/ControlsPanel';
import { buildBeamGeometry } from './modeling/beam';
import { useBeamStore } from './store/useBeamStore';

function App() {
  const parameters = useBeamStore((state) => state.parameters);
  const display = useBeamStore((state) => state.display);
  const errors = useBeamStore((state) => state.errors);
  const updateParameter = useBeamStore((state) => state.updateParameter);
  const applyParameters = useBeamStore((state) => state.applyParameters);
  const updateDisplay = useBeamStore((state) => state.updateDisplay);
  const reset = useBeamStore((state) => state.reset);
  const geometry = useMemo(() => buildBeamGeometry(parameters), [parameters]);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p>纯前端 3D 钢筋平法可视化</p>
          <h1>参数驱动的梁钢筋与混凝土实时预览</h1>
          <span>输入构件尺寸、纵筋、箍筋与保护层参数，模型会即时重建并保持毫米级工程参数表达。</span>
        </div>
        <div className="hero-metrics">
          <strong>{parameters.length}mm</strong>
          <span>梁长</span>
        </div>
      </section>

      <section className="workspace">
        <ControlsPanel
          parameters={parameters}
          display={display}
          errors={errors}
          stats={geometry.stats}
          updateParameter={updateParameter}
          applyParameters={applyParameters}
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
            <BeamScene geometry={geometry} display={display} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
