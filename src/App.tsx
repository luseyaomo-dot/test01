import { useMemo, useState } from 'react';
import { BeamScene, type ViewMode } from './components/BeamScene';
import { BomTable } from './components/BomTable';
import { ControlsPanel } from './components/ControlsPanel';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ViewportTools } from './components/ViewportTools';
import { buildBeamGeometry } from './modeling/beam';
import { computeBom, downloadBomCsv } from './modeling/bom';
import { buildColumnGeometry } from './modeling/column';
import { buildFrameGeometry } from './modeling/frame';
import { buildSlabGeometry } from './modeling/slab';
import { useBeamStore } from './store/useBeamStore';

function App() {
  const componentType = useBeamStore((state) => state.componentType);
  const parameters = useBeamStore((state) => state.parameters);
  const column = useBeamStore((state) => state.column);
  const frame = useBeamStore((state) => state.frame);
  const slab = useBeamStore((state) => state.slab);
  const display = useBeamStore((state) => state.display);
  const errors = useBeamStore((state) => state.errors);
  const setComponentType = useBeamStore((state) => state.setComponentType);
  const updateParameter = useBeamStore((state) => state.updateParameter);
  const applyParameters = useBeamStore((state) => state.applyParameters);
  const updateColumnParameter = useBeamStore((state) => state.updateColumnParameter);
  const updateFrameParameter = useBeamStore((state) => state.updateFrameParameter);
  const updateSlabParameter = useBeamStore((state) => state.updateSlabParameter);
  const updateDisplay = useBeamStore((state) => state.updateDisplay);
  const reset = useBeamStore((state) => state.reset);

  const [viewMode, setViewMode] = useState<ViewMode>('iso');
  const [viewKey, setViewKey] = useState(0);

  const geometry = useMemo(() => {
    if (componentType === 'column') return buildColumnGeometry(column);
    if (componentType === 'frame') return buildFrameGeometry(frame);
    if (componentType === 'slab') return buildSlabGeometry(slab);
    return buildBeamGeometry(parameters);
  }, [componentType, parameters, column, frame, slab]);

  const bomRows = useMemo(() => computeBom(geometry), [geometry]);

  const hints = useMemo(() => {
    const list: string[] = [];
    if (componentType === 'frame') {
      list.push(`框架柱端加密区按抗震 ${frame.seismicGrade === 'none' ? '非抗震' : frame.seismicGrade + '级'} 自动计算。`);
      list.push(`梁通长筋两端 15d 弯锚已生成，弯锚长度 ${15 * frame.topBarDiameter} mm。`);
    } else if (componentType === 'beam') {
      list.push(`梁加密区 ${geometry.stats.denseZoneLength.toFixed(0)} mm，箍筋首道距支座 ${parameters.firstStirrupOffset} mm。`);
    } else if (componentType === 'slab') {
      list.push(`板上下两层双向钢筋网，板厚 ${slab.thickness} mm，保护层 ${slab.cover} mm。`);
      list.push(`顶部支座筋两端 ${slab.anchorageRatio}d 90° 弯锚到板底已生成。`);
    } else {
      list.push(`柱箍筋按 ${column.stirrupLegCount} 肢复合箍布置，加密区 ${geometry.stats.denseZoneLength.toFixed(0)} mm。`);
    }
    if (geometry.stats.hookLength) {
      list.push(`135° 弯钩长度 = max(10d, 75mm) = ${geometry.stats.hookLength.toFixed(0)} mm`);
    }
    return list;
  }, [componentType, frame, parameters, column, slab, geometry]);

  const applyPreset = (id: string) => {
    if (id === 'default') {
      updateFrameParameter('spanLn', 5000);
      updateFrameParameter('beamWidth', 300);
      updateFrameParameter('beamHeight', 600);
    } else if (id === 'small') {
      updateFrameParameter('spanLn', 4000);
      updateFrameParameter('beamWidth', 250);
      updateFrameParameter('beamHeight', 400);
      updateFrameParameter('columnWidth', 400);
      updateFrameParameter('columnDepth', 400);
    } else if (id === 'large') {
      updateFrameParameter('spanLn', 8000);
      updateFrameParameter('beamWidth', 350);
      updateFrameParameter('beamHeight', 800);
      updateFrameParameter('columnWidth', 600);
      updateFrameParameter('columnDepth', 600);
      updateFrameParameter('seismicGrade', '1');
    } else if (id === 'narrow') {
      updateFrameParameter('spanLn', 5000);
      updateFrameParameter('beamWidth', 300);
      updateFrameParameter('beamHeight', 600);
      updateFrameParameter('columnWidth', 400);
    }
    setComponentType('frame');
  };

  const sceneTitle =
    componentType === 'frame' ? '框架梁柱组合体' :
    componentType === 'column' ? '柱构件 KZ' :
    componentType === 'slab' ? '板构件 LB' :
    '梁构件 KL';

  return (
    <div className="app-root">
      <TopBar onExport={() => downloadBomCsv(bomRows)} />
      <div className="app-body">
        <Sidebar componentType={componentType} setComponentType={setComponentType} applyPreset={applyPreset} />
        <main className="workspace">
          <div className="viewport-card">
            <div className="viewport-toolbar">
              <div>
                <span className="viewport-tag">3D 工作台 · {sceneTitle}</span>
                <h2>
                  {componentType === 'frame' && (
                    <>Ln = {frame.spanLn} mm · b×h = {frame.beamWidth}×{frame.beamHeight} · KZ {frame.columnWidth}×{frame.columnDepth}</>
                  )}
                  {componentType === 'beam' && (
                    <>L = {parameters.length} mm · b×h = {parameters.width}×{parameters.height}</>
                  )}
                  {componentType === 'column' && (
                    <>Hn = {column.height} mm · b×h = {column.width}×{column.depth}</>
                  )}
                  {componentType === 'slab' && (
                    <>L×W = {slab.length}×{slab.width} mm · 厚 {slab.thickness} mm</>
                  )}
                </h2>
              </div>
              <div className="legend">
                <span><i className="legend-top" />上部筋</span>
                <span><i className="legend-bottom" />下部筋</span>
                <span><i className="legend-stirrup" />箍筋</span>
              </div>
            </div>
            <div className="viewport">
              <ViewportTools
                viewMode={viewMode}
                setViewMode={(mode) => { setViewMode(mode); setViewKey((k) => k + 1); }}
                onResetView={() => { setViewMode('iso'); setViewKey((k) => k + 1); }}
              />
              <BeamScene
                key={`${componentType}-${viewMode}-${viewKey}`}
                geometry={geometry}
                display={display}
                componentType={componentType}
                frame={frame}
                viewMode={viewMode}
              />
            </div>
          </div>
          <BomTable rows={bomRows} hints={hints} />
        </main>
        <ControlsPanel
          componentType={componentType}
          parameters={parameters}
          column={column}
          frame={frame}
          slab={slab}
          display={display}
          errors={errors}
          stats={geometry.stats}
          setComponentType={setComponentType}
          updateParameter={updateParameter}
          applyParameters={applyParameters}
          updateColumnParameter={updateColumnParameter}
          updateFrameParameter={updateFrameParameter}
          updateSlabParameter={updateSlabParameter}
          updateDisplay={updateDisplay}
          reset={reset}
        />
      </div>
    </div>
  );
}

export default App;
