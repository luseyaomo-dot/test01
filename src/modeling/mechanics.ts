import type { ColumnForceProfile, FrameForces, FrameParameters, LoadInputs } from '../types';

// 单位约定:
//   长度 m, 力 kN, 弯矩 kN·m。
// 符号约定:
//   beam M(x): sagging 正 (下侧受拉), x 沿梁中心线由左 (0) 至右 (Lc)。
//   column M(y): "外侧受拉" 正 (左柱外侧 = -x, 右柱外侧 = +x), y 由柱底 (0) 到柱顶 (H)。
//   column N: 压力 正。

const SAMPLES_BEAM = 41;
const SAMPLES_COL = 21;

const sectionInertia = (b_mm: number, h_mm: number) => {
  const b = b_mm / 1000;
  const h = h_mm / 1000;
  return (b * h * h * h) / 12; // m^4
};

export const computeFrameForces = (frame: FrameParameters, loads: LoadInputs): FrameForces => {
  const Lc = (frame.spanLn + frame.columnWidth) / 1000;       // 梁中心线跨度 m
  const Hc = frame.columnHeight / 1000;                       // 柱中心线高度 m
  const Ib = sectionInertia(frame.beamWidth, frame.beamHeight);
  // 柱抗弯惯性矩按 X 方向 (与框架平面一致): width 为 b (X 方向), depth 为 Z 方向
  // 框架平面内的弯曲围绕 Z 轴, 截面惯矩用 b·h^3/12, 此处 h 取 columnDepth 较合常规, 但实际框架平面内取 columnWidth 方向截面.
  // 简化: 取 b·d^3/12, b=columnWidth (沿框架平面外), d=columnDepth (沿框架平面内, 即抗弯方向). 这里我们用 columnDepth 作 d.
  const Ic = sectionInertia(frame.columnWidth, frame.columnDepth);

  // 线刚度 (E 抵消, 用相对值即可)
  const ib = Ib / Lc;
  const ic = Ic / Hc;

  const q = loads.q;
  const H = loads.H;

  // ============ UDL 工况 (对称, 无侧移) ============
  // 梁端弯矩 (sagging 正): M_e_udl < 0 (支座 hogging)
  const M_FEM = (q * Lc * Lc) / 12; // 固端弯矩绝对值 kN·m
  // 推导: M_beam_end = -M_FEM · (2 ic) / (ib + 2 ic)
  const denom = ib + 2 * ic;
  const beam_end_udl = denom > 0 ? -M_FEM * (2 * ic) / denom : -M_FEM;
  // 柱顶弯矩 (外侧受拉 正): 与梁端反号, 因为 |M_col_top| = |M_beam_end|, 物理: 柱外鼓
  const col_top_udl = -beam_end_udl; // = +|beam_end|
  // 柱底 (固端) 弯矩 = 柱顶/2, 同号 (外侧受拉)
  const col_bot_udl = col_top_udl / 2;
  // 梁支座剪力: 由 UDL 对称, V_left = +qLc/2 (向上), V_right = -qLc/2.
  const V_beam_udl_left = (q * Lc) / 2;

  // 柱轴力 (UDL): 每柱承担 qLc/2 (压)
  const N_col_udl = (q * Lc) / 2;

  // ============ 水平荷载 H 工况 (反对称近似, D 值法) ============
  // H 作用于左节点向右, 假设两柱抗侧刚度相等, 各柱剪力 = H/2.
  // 反弯点取 0.5, 各柱端弯矩 = V·Hc/2 = H·Hc/4.
  const V_col_h = H / 2;
  const M_col_h = (Math.abs(H) * Hc) / 4; // 绝对值
  const sgnH = Math.sign(H) || 0;
  // 左柱 (外侧 = -x): 顶部内侧 (右) 受拉 → 外侧受拉为负; 底部外侧受拉 → 正.
  const colL_top_h = -sgnH * M_col_h;
  const colL_bot_h = +sgnH * M_col_h;
  // 右柱 (外侧 = +x): 顶部内侧 (左) 受拉 → 外侧受拉为负; 底部外侧受拉 → 正.
  const colR_top_h = -sgnH * M_col_h;
  const colR_bot_h = +sgnH * M_col_h;
  // 梁端弯矩 (sagging 正) by 节点平衡: H 引起反对称, 左端 hogging, 右端 sagging (H 向右时左节点开角).
  // 量值 = M_col_h, 左端 sagging 值 = -sgnH·M_col_h, 右端 = +sgnH·M_col_h.
  const beam_left_h = -sgnH * M_col_h;
  const beam_right_h = +sgnH * M_col_h;
  // 梁剪力 (常量): V = (M_right - M_left)/Lc
  const V_beam_h = (beam_right_h - beam_left_h) / Lc;

  // 柱轴力 (H): 倾覆力矩 H·Hc → 反力 ±H·Hc/Lc
  const N_col_h_left  = -sgnH * Math.abs(H * Hc / Lc); // 左柱受拉 (压为正 → 负)
  const N_col_h_right = +sgnH * Math.abs(H * Hc / Lc); // 右柱受压增加

  // ============ 叠加 ============
  // 梁
  const beamSamples: { x: number; M: number; V: number }[] = [];
  let M_pos_max = 0;
  let M_neg_max = 0;
  let V_max = 0;
  for (let i = 0; i < SAMPLES_BEAM; i += 1) {
    const x = (Lc * i) / (SAMPLES_BEAM - 1);
    // UDL: M_udl(x) = beam_end_udl + V_left_udl·x - q·x²/2
    const M_udl = beam_end_udl + V_beam_udl_left * x - (q * x * x) / 2;
    // H: linear M_h(x) = beam_left_h + V_beam_h·x
    const M_h = beam_left_h + V_beam_h * x;
    const M = M_udl + M_h;
    // V(x) = dM/dx (左剪力为正): V_udl = V_left_udl - q·x; V_h = V_beam_h
    const V = V_beam_udl_left - q * x + V_beam_h;
    beamSamples.push({ x, M, V });
    if (M > M_pos_max) M_pos_max = M;
    if (-M > M_neg_max) M_neg_max = -M;
    if (Math.abs(V) > V_max) V_max = Math.abs(V);
  }
  const M_left_total = beamSamples[0].M;
  const M_right_total = beamSamples[beamSamples.length - 1].M;
  const M_mid_total = beamSamples[Math.floor((SAMPLES_BEAM - 1) / 2)].M;
  const V_left_total = beamSamples[0].V;
  const V_right_total = beamSamples[beamSamples.length - 1].V;

  // 柱采样
  const buildColumn = (
    side: 'L' | 'R',
    M_top_udl: number,
    M_bot_udl: number,
    M_top_h: number,
    M_bot_h: number,
    V_h_signed: number,
    N_h: number,
  ): ColumnForceProfile => {
    const samples: { y: number; M: number; V: number; N: number }[] = [];
    let M_max = 0;
    for (let i = 0; i < SAMPLES_COL; i += 1) {
      const y = (Hc * i) / (SAMPLES_COL - 1);
      // UDL: 线性插值 (顶部 M_top_udl, 底部 M_bot_udl)
      const M_udl = M_bot_udl + ((M_top_udl - M_bot_udl) * y) / Hc;
      // H: 线性插值
      const M_h = M_bot_h + ((M_top_h - M_bot_h) * y) / Hc;
      const M = M_udl + M_h;
      // V: 柱内剪力近似
      // UDL 工况柱剪力 = (M_top_udl - M_bot_udl)/Hc 取负, 实际不大, 暂记 0;
      // H 工况柱剪力 = V_h_signed (常量, 与符号约定无关).
      const V = V_h_signed;
      const N = N_col_udl + N_h;
      samples.push({ y, M, V, N });
      if (Math.abs(M) > M_max) M_max = Math.abs(M);
    }
    return {
      M_top: samples[samples.length - 1].M,
      M_bot: samples[0].M,
      V: V_h_signed,
      N: N_col_udl + N_h,
      M_max,
      samples,
      height: Hc,
    };
    // 注: side 仅用于将来扩展, 这里未直接使用.
    void side;
  };

  const left = buildColumn('L', col_top_udl, col_bot_udl, colL_top_h, colL_bot_h, V_col_h, N_col_h_left);
  const right = buildColumn('R', col_top_udl, col_bot_udl, colR_top_h, colR_bot_h, V_col_h, N_col_h_right);

  return {
    beam: {
      M_left: M_left_total,
      M_mid: M_mid_total,
      M_right: M_right_total,
      V_left: V_left_total,
      V_right: V_right_total,
      M_max_pos: M_pos_max,
      M_max_neg: M_neg_max,
      V_max,
      samples: beamSamples,
      length: Lc,
    },
    column: { left, right },
    inputs: loads,
  };
};
