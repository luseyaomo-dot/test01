import { useMemo } from 'react';
import type { FrameForces, MechanicsDisplayOptions } from '../types';

type Props = {
  forces: FrameForces;
  display: MechanicsDisplayOptions;
};

const PAD = 28;
const VIEW_W = 360;
const VIEW_H = 260;

export function MechanicsOverlay({ forces, display }: Props) {
  const Lc = forces.beam.length;             // m
  const Hc = forces.column.left.height;      // m

  const scale = useMemo(() => {
    const sx = (VIEW_W - 2 * PAD) / Lc;
    const sy = (VIEW_H - 2 * PAD) / Hc;
    return Math.min(sx, sy);
  }, [Lc, Hc]);

  // 数据 → SVG 坐标 (x_d in [0,Lc], y_d in [0,Hc])
  const px = (xd: number) => PAD + xd * scale;
  const py = (yd: number) => PAD + (Hc - yd) * scale;

  // 内力图 缩放
  const Mmax = Math.max(forces.beam.M_max_pos, forces.beam.M_max_neg, forces.column.left.M_max, forces.column.right.M_max, 1);
  const Vmax = Math.max(forces.beam.V_max, Math.abs(forces.column.left.V), Math.abs(forces.column.right.V), 1);
  const Nmax = Math.max(Math.abs(forces.column.left.N), Math.abs(forces.column.right.N), 1);
  const M_AMP = 28; // px
  const V_AMP = 22;
  const N_AMP = 18;

  // ===== 梁 弯矩 =====
  // 数据 M>0 sagging (下侧受拉) → 画在梁下方 (SVG y 大方向).
  const beamMomentPath = useMemo(() => {
    const pts = forces.beam.samples.map((s) => {
      const x = px(s.x);
      const y = py(Hc) + (s.M / Mmax) * M_AMP;
      return [x, y] as const;
    });
    const start = `M ${px(0)} ${py(Hc)}`;
    const line = pts.map(([x, y]) => `L ${x} ${y}`).join(' ');
    const end = `L ${px(Lc)} ${py(Hc)} Z`;
    return `${start} ${line} ${end}`;
  }, [forces.beam.samples, Hc, Lc, scale, Mmax]);

  // ===== 梁 剪力 =====
  const beamShearPath = useMemo(() => {
    const pts = forces.beam.samples.map((s) => {
      const x = px(s.x);
      const y = py(Hc) - (s.V / Vmax) * V_AMP;
      return [x, y] as const;
    });
    const start = `M ${px(0)} ${py(Hc)}`;
    const line = pts.map(([x, y]) => `L ${x} ${y}`).join(' ');
    const end = `L ${px(Lc)} ${py(Hc)} Z`;
    return `${start} ${line} ${end}`;
  }, [forces.beam.samples, Hc, Lc, scale, Vmax]);

  // ===== 柱 弯矩 =====
  // 左柱 (x_d=0): M>0 外侧受拉, 外侧 = -x → SVG 向左 (减小 x). 偏移 = -M·amp/Mmax.
  // 右柱 (x_d=Lc): M>0 外侧受拉, 外侧 = +x → SVG 向右 (增大 x). 偏移 = +M·amp/Mmax.
  const buildColumnMomentPath = (xd: number, samples: { y: number; M: number }[], outerSign: -1 | 1) => {
    const pts = samples.map((s) => {
      const offset = (s.M / Mmax) * M_AMP * outerSign;
      const x = px(xd) + offset;
      const y = py(s.y);
      return [x, y] as const;
    });
    const start = `M ${px(xd)} ${py(0)}`;
    const line = pts.map(([x, y]) => `L ${x} ${y}`).join(' ');
    const end = `L ${px(xd)} ${py(Hc)} Z`;
    return `${start} ${line} ${end}`;
  };
  const colLeftMomentPath = useMemo(() => buildColumnMomentPath(0, forces.column.left.samples, -1), [forces.column.left.samples, Hc, scale, Mmax]);
  const colRightMomentPath = useMemo(() => buildColumnMomentPath(Lc, forces.column.right.samples, +1), [forces.column.right.samples, Hc, Lc, scale, Mmax]);

  // ===== 柱 剪力 (常量, 在柱旁画矩形) =====
  const buildColumnShearPath = (xd: number, V: number, outerSign: -1 | 1) => {
    const offset = (V / Vmax) * V_AMP * outerSign;
    return `M ${px(xd)} ${py(0)} L ${px(xd) + offset} ${py(0)} L ${px(xd) + offset} ${py(Hc)} L ${px(xd)} ${py(Hc)} Z`;
  };
  const colLeftShearPath = useMemo(() => buildColumnShearPath(0, forces.column.left.V, -1), [forces.column.left.V, Hc, scale, Vmax]);
  const colRightShearPath = useMemo(() => buildColumnShearPath(Lc, forces.column.right.V, +1), [forces.column.right.V, Hc, Lc, scale, Vmax]);

  // ===== 柱 轴力 =====
  const buildColumnAxialPath = (xd: number, N: number, outerSign: -1 | 1) => {
    const offset = (N / Nmax) * N_AMP * outerSign;
    return `M ${px(xd)} ${py(0)} L ${px(xd) + offset} ${py(0)} L ${px(xd) + offset} ${py(Hc)} L ${px(xd)} ${py(Hc)} Z`;
  };
  const colLeftAxialPath = useMemo(() => buildColumnAxialPath(0, forces.column.left.N, -1), [forces.column.left.N, Hc, scale, Nmax]);
  const colRightAxialPath = useMemo(() => buildColumnAxialPath(Lc, forces.column.right.N, +1), [forces.column.right.N, Hc, Lc, scale, Nmax]);

  if (!display.show) return null;

  return (
    <div className="mechanics-overlay">
      <div className="mechanics-overlay-header">
        <span>内力图 · 单跨单层框架 (近似 D 值法)</span>
        <em>q = {forces.inputs.q} kN/m, H = {forces.inputs.H} kN</em>
      </div>
      <svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        {/* 框架轴线 */}
        <g className="frame-axis">
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(Hc)} />
          <line x1={px(Lc)} y1={py(0)} x2={px(Lc)} y2={py(Hc)} />
          <line x1={px(0)} y1={py(Hc)} x2={px(Lc)} y2={py(Hc)} />
          {/* 基础 */}
          <line x1={px(0) - 14} y1={py(0)} x2={px(0) + 14} y2={py(0)} />
          <line x1={px(Lc) - 14} y1={py(0)} x2={px(Lc) + 14} y2={py(0)} />
        </g>

        {display.showAxial && (
          <g className="diagram-axial">
            <path d={colLeftAxialPath} />
            <path d={colRightAxialPath} />
          </g>
        )}

        {display.showShear && (
          <g className="diagram-shear">
            <path d={colLeftShearPath} />
            <path d={colRightShearPath} />
            <path d={beamShearPath} />
          </g>
        )}

        {display.showMoment && (
          <g className="diagram-moment">
            <path d={beamMomentPath} />
            <path d={colLeftMomentPath} />
            <path d={colRightMomentPath} />
          </g>
        )}

        {display.showLabels && (
          <g className="diagram-labels">
            <text x={px(Lc / 2)} y={py(Hc) + M_AMP + 14} textAnchor="middle">
              M跨中 = {forces.beam.M_mid.toFixed(1)} kN·m
            </text>
            <text x={px(0) - 6} y={py(Hc) - 6} textAnchor="end">
              M端 = {forces.beam.M_left.toFixed(1)}
            </text>
            <text x={px(Lc) + 6} y={py(Hc) - 6} textAnchor="start">
              {forces.beam.M_right.toFixed(1)}
            </text>
            <text x={px(0) - M_AMP - 4} y={py(Hc / 2)} textAnchor="end">
              柱 M_max = {forces.column.left.M_max.toFixed(1)}
            </text>
            <text x={px(Lc) + M_AMP + 4} y={py(Hc / 2)} textAnchor="start">
              {forces.column.right.M_max.toFixed(1)}
            </text>
            <text x={px(Lc / 2)} y={py(Hc) - V_AMP - 6} textAnchor="middle">
              V_max = {forces.beam.V_max.toFixed(1)} kN
            </text>
          </g>
        )}
      </svg>
      <div className="mechanics-overlay-legend">
        {display.showMoment && <span><i className="lg-moment" /> 弯矩 M</span>}
        {display.showShear && <span><i className="lg-shear" /> 剪力 V</span>}
        {display.showAxial && <span><i className="lg-axial" /> 轴力 N</span>}
      </div>
    </div>
  );
}

