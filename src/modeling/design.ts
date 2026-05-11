import type { DesignAdvice, FrameForces, FrameParameters } from '../types';

// 简化的配筋反算 (GB50010 近似), 仅用于教学/示意, 非施工依据.
// 材料默认: C30 (fc=14.3, ft=1.43 MPa), HRB400 (fy=360 MPa, fyv=360 MPa).
// As = M / (0.9 · fy · h0)
// 箍筋: V_cs = 0.7 · ft · b · h0; 不足部分由箍筋承担: Asv/s = (V - V_cs)/(fyv · h0)

const FY = 360;     // MPa
const FYV = 360;    // MPa
const FT = 1.43;    // MPa
const DIAM_LIB = [16, 18, 20, 22, 25, 28];

const barArea = (d_mm: number) => (Math.PI * d_mm * d_mm) / 4; // mm²

const pickBars = (As_required: number): { count: number; diameter: number; provided: number } => {
  let best: { count: number; diameter: number; provided: number } | null = null;
  for (const d of DIAM_LIB) {
    const a = barArea(d);
    for (let n = 2; n <= 12; n += 1) {
      const provided = n * a;
      if (provided >= As_required) {
        if (!best || provided < best.provided) {
          best = { count: n, diameter: d, provided };
        }
        break;
      }
    }
  }
  if (!best) {
    const d = DIAM_LIB[DIAM_LIB.length - 1];
    best = { count: 12, diameter: d, provided: 12 * barArea(d) };
  }
  return best;
};

export const computeDesignAdvice = (frame: FrameParameters, forces: FrameForces): DesignAdvice => {
  const b = frame.beamWidth;
  const h = frame.beamHeight;
  // h0 ≈ h - 保护层 - 箍筋 - 主筋半径 (粗略)
  const h0_beam = h - frame.cover - frame.beamStirrupDiameter - 0.5 * Math.max(frame.topBarDiameter, frame.bottomBarDiameter);

  // M 转换: kN·m → N·mm
  const M_neg = forces.beam.M_max_neg * 1e6;
  const M_pos = forces.beam.M_max_pos * 1e6;
  const V_beam = Math.max(Math.abs(forces.beam.V_left), Math.abs(forces.beam.V_right)) * 1e3; // N

  const AsTop = M_neg / (0.9 * FY * h0_beam);
  const AsBot = M_pos / (0.9 * FY * h0_beam);
  // 最小配筋率 0.2% bh
  const AsMin = 0.002 * b * h;

  const suggestedTop = pickBars(Math.max(AsTop, AsMin));
  const suggestedBot = pickBars(Math.max(AsBot, AsMin));

  // 箍筋
  const V_cs = 0.7 * FT * b * h0_beam; // N
  const V_required = Math.max(V_beam - V_cs, 0); // N
  const Asv = frame.beamStirrupLegCount * barArea(frame.beamStirrupDiameter); // mm²
  // 需要 s_max = Asv · fyv · h0 / V_required
  let s_dense = frame.beamDenseSpacing;
  let s_normal = frame.beamStirrupSpacing;
  if (V_required > 0) {
    const s_max = (Asv * FYV * h0_beam) / V_required;
    s_dense = Math.min(frame.beamDenseSpacing, Math.floor(s_max / 10) * 10);
    if (s_dense < 50) s_dense = 50;
    s_normal = Math.min(frame.beamStirrupSpacing, Math.floor((s_max * 1.5) / 10) * 10);
    if (s_normal < 100) s_normal = 100;
  }

  const beamNotes: string[] = [];
  if (AsTop < AsMin) beamNotes.push(`支座负筋按最小配筋率 0.2% 控制 (${AsMin.toFixed(0)} mm²).`);
  if (AsBot < AsMin) beamNotes.push(`跨中下部筋按最小配筋率 0.2% 控制 (${AsMin.toFixed(0)} mm²).`);
  if (V_beam > V_cs) beamNotes.push(`剪力 V=${(V_beam / 1e3).toFixed(1)} kN 超 V_cs=${(V_cs / 1e3).toFixed(1)} kN, 需箍筋承担, 建议加密 ≤ ${s_dense} mm.`);
  else beamNotes.push(`剪力可由混凝土承担, 箍筋按构造配置.`);
  if (suggestedTop.diameter > frame.topBarDiameter) beamNotes.push(`建议加大上部筋直径至 ${suggestedTop.diameter} mm.`);
  if (suggestedBot.diameter > frame.bottomBarDiameter) beamNotes.push(`建议加大下部筋直径至 ${suggestedBot.diameter} mm.`);

  // ====== 柱配筋 (按偏压简化, 仅给参考) ======
  const colB = frame.columnWidth;
  const colH = frame.columnDepth;
  const M_col_max = Math.max(forces.column.left.M_max, forces.column.right.M_max) * 1e6; // N·mm
  const N_col = Math.max(Math.abs(forces.column.left.N), Math.abs(forces.column.right.N)) * 1e3; // N
  const h0_col = colH - frame.cover - frame.columnStirrupDiameter - 0.5 * frame.cornerBarDiameter;
  // 简化: 偏压 As ≈ M/(0.9·fy·h0) - 0.5·N/fy (压力分担, 取下限 0)
  const As_col_each = Math.max(M_col_max / (0.9 * FY * h0_col) - 0.5 * N_col / FY, 0);
  // 全截面最小 0.6% (中柱) ~ 0.8% (角柱)
  const As_min_col = 0.006 * colB * colH;
  const As_total = Math.max(As_col_each * 2 + 0.5 * As_col_each * 2, As_min_col);

  const colNotes: string[] = [];
  if (As_col_each * 2 < As_min_col) colNotes.push(`柱纵筋按最小配筋率 0.6% 控制 (${As_min_col.toFixed(0)} mm²).`);
  colNotes.push(`轴压比近似 N/(fc·b·h) = ${(N_col / (14.3 * colB * colH)).toFixed(2)}; 建议 ≤ 0.85.`);

  return {
    beam: {
      AsTop_support: AsTop,
      AsBot_mid: AsBot,
      suggestedTop,
      suggestedBot,
      stirrupSpacingDense: s_dense,
      stirrupSpacingNormal: s_normal,
      notes: beamNotes,
    },
    column: {
      As_total,
      suggestedCorner: { diameter: Math.max(frame.cornerBarDiameter, As_min_col / colB / colH > 0.008 ? 25 : frame.cornerBarDiameter) },
      stirrupSpacingDense: frame.columnDenseSpacing,
      notes: colNotes,
    },
  };
};
