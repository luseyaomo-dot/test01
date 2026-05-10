import type { BeamParameters, StirrupLegCount } from '../types';

// 22G101 钢种字母: A=HPB300 B=HRB335 C=HRB400 D=HRB500 E=HRBF500
const SUPPORTED_LEGS: StirrupLegCount[] = [2, 4, 6];

export type AnnotationParseResult = {
  partial: Partial<BeamParameters>;
  warnings: string[];
  matched: string[];
};

export function parseBeamAnnotation(raw: string): AnnotationParseResult {
  const text = raw.replace(/\s+/g, ' ').trim();
  const partial: Partial<BeamParameters> = {};
  const warnings: string[] = [];
  const matched: string[] = [];

  if (!text) {
    return { partial, warnings: ['请输入集中标注'], matched };
  }

  // 截面尺寸 b x h  例如 300x700 / 300×700 / 300*700
  const section = text.match(/(\d{3,4})\s*[x×*]\s*(\d{3,4})/i);
  if (section) {
    partial.width = Number(section[1]);
    partial.height = Number(section[2]);
    matched.push(`截面 ${section[1]}×${section[2]}`);
  }

  // 箍筋  A10@100/200(4)  或  A10@200(2)
  const stirrup = text.match(/([A-Ea-e])\s*(\d+)\s*@\s*(\d+)\s*(?:\/\s*(\d+))?\s*(?:\((\d+)\))?/);
  if (stirrup) {
    partial.stirrupDiameter = Number(stirrup[2]);
    if (stirrup[4]) {
      partial.denseZoneSpacing = Number(stirrup[3]);
      partial.stirrupSpacing = Number(stirrup[4]);
    } else {
      const spacing = Number(stirrup[3]);
      partial.stirrupSpacing = spacing;
      partial.denseZoneSpacing = spacing;
    }
    if (stirrup[5]) {
      const legs = Number(stirrup[5]) as StirrupLegCount;
      if (SUPPORTED_LEGS.includes(legs)) {
        partial.stirrupLegCount = legs;
      } else {
        warnings.push(`暂不支持 ${legs} 肢箍，已沿用原值`);
      }
    }
    matched.push(`箍筋 ${stirrup[0]}`);
  }

  // 上下纵筋  4C25; 4C20   或   2C25;3C20
  const reinforcement = text.match(/(\d+)\s*([A-Ea-e])\s*(\d+)\s*[;；]\s*(\d+)\s*([A-Ea-e])\s*(\d+)/);
  if (reinforcement) {
    partial.topBarCount = Number(reinforcement[1]);
    partial.topBarDiameter = Number(reinforcement[3]);
    partial.bottomBarCount = Number(reinforcement[4]);
    partial.bottomBarDiameter = Number(reinforcement[6]);
    matched.push(`上 ${reinforcement[1]}${reinforcement[2].toUpperCase()}${reinforcement[3]} / 下 ${reinforcement[4]}${reinforcement[5].toUpperCase()}${reinforcement[6]}`);
  }

  // 腰筋 G2C12 / N2C12  (G构造腰筋, N抗扭腰筋)
  const waist = text.match(/[GN]\s*(\d+)\s*([A-Ea-e])\s*(\d+)/);
  if (waist) {
    partial.waistBarCount = Number(waist[1]);
    partial.waistBarDiameter = Number(waist[3]);
    matched.push(`腰筋 ${waist[0]}`);
  }

  if (matched.length === 0) {
    warnings.push('未识别到有效字段，请检查格式: 例如 KL1(2A) 300x700, A10@100/200(4), 4C25; 4C20');
  }

  return { partial, warnings, matched };
}
