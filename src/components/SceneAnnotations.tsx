import { Html } from '@react-three/drei';
import type { FrameParameters } from '../types';

const MM_TO_M = 0.001;
const m = (mm: number) => mm * MM_TO_M;

type SceneAnnotationsProps = {
  frame: FrameParameters;
};

type LabelProps = {
  position: [number, number, number];
  variant?: 'span' | 'support' | 'anchor' | 'dense' | 'section';
  children: React.ReactNode;
};

function Label({ position, variant = 'section', children }: LabelProps) {
  return (
    <Html position={position} center distanceFactor={8} occlude={false} zIndexRange={[20, 0]}>
      <div className={`scene-label scene-label-${variant}`}>{children}</div>
    </Html>
  );
}

export function SceneAnnotations({ frame }: SceneAnnotationsProps) {
  const spanLn = m(frame.spanLn);
  const colW = m(frame.columnWidth);
  const colH = m(frame.columnHeight);
  const beamH = m(frame.beamHeight);
  const beamW = m(frame.beamWidth);

  const halfSpan = spanLn / 2;
  const colCenterX = halfSpan + colW / 2;
  const beamCenterY = colH / 2 - beamH / 2;
  const beamTop = colH / 2;
  const beamBottom = colH / 2 - beamH;
  const colTop = colH / 2;

  // 加密区长度估算 (与 column dense zone 一致): max(柱较大边, Hn/6, 500)
  const denseZoneMm = Math.max(Math.max(frame.columnWidth, frame.columnDepth), frame.columnHeight / 6, 500);
  // 梁加密区: 一级 max(2h,500), 二~四级 max(1.5h,500)
  const beamDenseMm = frame.seismicGrade === '1'
    ? Math.max(2 * frame.beamHeight, 500)
    : frame.seismicGrade === 'none'
    ? 0
    : Math.max(1.5 * frame.beamHeight, 500);

  const anchorMm = 15 * frame.topBarDiameter;
  const labZ = beamW / 2 + 0.05; // 标注稍靠前以避免被遮挡

  return (
    <group>
      {/* Ln 净跨 */}
      <Label position={[0, beamBottom - 0.2, labZ]} variant="span">
        Ln = {frame.spanLn} mm
      </Label>

      {/* b×h 梁截面 */}
      <Label position={[0, beamTop + 0.18, labZ]} variant="section">
        b×h = {frame.beamWidth}×{frame.beamHeight}
      </Label>

      {/* 支座 (左右柱) */}
      <Label position={[-colCenterX, beamBottom - 0.12, labZ]} variant="support">
        支座 {frame.columnWidth}
      </Label>
      <Label position={[colCenterX, beamBottom - 0.12, labZ]} variant="support">
        支座 {frame.columnWidth}
      </Label>

      {/* KZ 截面 */}
      <Label position={[colCenterX, colTop * 0.45, labZ]} variant="section">
        KZ {frame.columnWidth}×{frame.columnDepth}
      </Label>

      {/* 锚固 (15d) */}
      <Label position={[-colCenterX + 0.05, beamCenterY + beamH * 0.2, labZ]} variant="anchor">
        锚固 0.4laE+15d ({anchorMm} mm)
      </Label>

      {/* 加密区 (柱) */}
      <Label position={[-colCenterX, beamBottom - m(denseZoneMm) / 2, labZ]} variant="dense">
        柱加密区 {denseZoneMm.toFixed(0)} mm
      </Label>
      <Label position={[colCenterX, beamBottom - m(denseZoneMm) / 2, labZ]} variant="dense">
        柱加密区 {denseZoneMm.toFixed(0)} mm
      </Label>

      {/* 加密区 (梁) - 仅抗震时 */}
      {beamDenseMm > 0 && (
        <>
          <Label position={[-halfSpan + m(beamDenseMm) / 2, beamTop + 0.05, labZ]} variant="dense">
            梁加密区 {beamDenseMm.toFixed(0)} mm
          </Label>
          <Label position={[halfSpan - m(beamDenseMm) / 2, beamTop + 0.05, labZ]} variant="dense">
            梁加密区 {beamDenseMm.toFixed(0)} mm
          </Label>
        </>
      )}
    </group>
  );
}
