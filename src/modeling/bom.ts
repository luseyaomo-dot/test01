import type { BeamGeometryData, RebarLine, StirrupPath } from '../types';

export type BomRow = {
  id: string;
  type: string;
  diameter: number;
  count: number;
  singleLength: number;   // m
  totalLength: number;    // m
  weight: number;         // kg
  note?: string;
  status: 'ok' | 'info' | 'warn';
};

const STEEL_KG_PER_M_PER_MM2 = 0.00617; // 简化 0.00617*d² kg/m

const computeWeight = (diameter: number, totalLengthM: number) =>
  totalLengthM * STEEL_KG_PER_M_PER_MM2 * diameter * diameter;

const polylineLength = (points: [number, number, number][]) => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  }
  return total;
};

const stirrupLength = (stirrup: StirrupPath) => {
  const main = polylineLength(stirrup.points);
  const hooks = stirrup.hooks.reduce((sum, leg) => sum + polylineLength(leg), 0);
  return main + hooks;
};

const segmentLength = (bar: RebarLine) =>
  Math.hypot(bar.end[0] - bar.start[0], bar.end[1] - bar.start[1], bar.end[2] - bar.start[2]);

type BarGroupKey = string;

const categoryLabel = (bar: RebarLine, isBeamScope: boolean) => {
  if (bar.id.startsWith('slab-bot-x')) return '板下层 X 向筋';
  if (bar.id.startsWith('slab-bot-z')) return '板下层 Z 向筋';
  if (bar.id.startsWith('slab-top-x')) return '板上层 X 向筋';
  if (bar.id.startsWith('slab-top-z')) return '板上层 Z 向筋';
  if (bar.id.includes('corner')) return '柱角筋';
  if (bar.id.includes('side-x')) return '柱 b 边中部筋';
  if (bar.id.includes('side-z')) return '柱 h 边中部筋';
  if (bar.id.startsWith('beam-')) {
    if (bar.category === 'top') return '梁上部通长筋';
    if (bar.category === 'bottom') return '梁下部通长筋';
    return '梁腰筋';
  }
  if (isBeamScope) {
    if (bar.category === 'top') return '上部通长筋';
    if (bar.category === 'bottom') return '下部通长筋';
    return '腰筋';
  }
  return bar.category;
};

const stirrupLabel = (stirrup: StirrupPath) => {
  if (stirrup.kind === 'joint') return '节点核心区箍筋';
  if (stirrup.id.startsWith('beam-')) return stirrup.kind === 'outer' ? '梁箍筋' : '梁复合内箍';
  if (stirrup.id.startsWith('col-')) return stirrup.kind === 'outer' ? '柱箍筋' : '柱复合内箍';
  return stirrup.kind === 'outer' ? '箍筋' : '复合内箍';
};

export const computeBom = (geometry: BeamGeometryData): BomRow[] => {
  const isBeamScope = geometry.rebars.every((bar) => !bar.id.startsWith('col-') && !bar.id.includes('corner'));

  // 纵筋分组
  const groups = new Map<BarGroupKey, { type: string; diameter: number; lengths: number[] }>();
  geometry.rebars.forEach((bar) => {
    const baseLength = segmentLength(bar);
    const hookExtras = geometry.rebarHooks
      .filter((hook) => hook.id.startsWith(`${bar.id}-hook`))
      .reduce((sum, hook) => sum + polylineLength(hook.points), 0);
    const len = baseLength + hookExtras;
    const type = categoryLabel(bar, isBeamScope);
    const key = `${type}-${bar.diameter}`;
    const existing = groups.get(key);
    if (existing) existing.lengths.push(len);
    else groups.set(key, { type, diameter: bar.diameter, lengths: [len] });
  });

  // 箍筋分组
  geometry.stirrups.forEach((stirrup) => {
    const len = stirrupLength(stirrup);
    const type = stirrupLabel(stirrup);
    const key = `${type}-${stirrup.diameter}`;
    const existing = groups.get(key);
    if (existing) existing.lengths.push(len);
    else groups.set(key, { type, diameter: stirrup.diameter, lengths: [len] });
  });

  let index = 1;
  const rows: BomRow[] = [];
  const order = [
    '梁上部通长筋',
    '梁下部通长筋',
    '梁腰筋',
    '上部通长筋',
    '下部通长筋',
    '腰筋',
    '柱角筋',
    '柱 b 边中部筋',
    '柱 h 边中部筋',
    '板下层 X 向筋',
    '板下层 Z 向筋',
    '板上层 X 向筋',
    '板上层 Z 向筋',
    '梁箍筋',
    '梁复合内箍',
    '柱箍筋',
    '柱复合内箍',
    '节点核心区箍筋',
    '箍筋',
    '复合内箍',
  ];

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const ta = groups.get(a)!.type;
    const tb = groups.get(b)!.type;
    return order.indexOf(ta) - order.indexOf(tb);
  });

  sortedKeys.forEach((key) => {
    const group = groups.get(key)!;
    const totalLength = group.lengths.reduce((sum, n) => sum + n, 0);
    const singleLength = totalLength / group.lengths.length;
    const weight = computeWeight(group.diameter, totalLength);
    rows.push({
      id: `RB-${String(index).padStart(2, '0')}`,
      type: group.type,
      diameter: group.diameter,
      count: group.lengths.length,
      singleLength,
      totalLength,
      weight,
      status: 'ok',
    });
    index += 1;
  });

  return rows;
};

export const bomToCsv = (rows: BomRow[]): string => {
  const header = ['ID', '类型', '直径(mm)', '根数', '单长(m)', '总长(m)', '重量(kg)', '备注', '状态'];
  const lines = [header.join(',')];
  rows.forEach((row) => {
    lines.push([
      row.id,
      row.type,
      row.diameter,
      row.count,
      row.singleLength.toFixed(3),
      row.totalLength.toFixed(3),
      row.weight.toFixed(2),
      row.note ?? (row.type.includes('箍') ? '弯钩' : '通长'),
      row.status,
    ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  });
  return '\uFEFF' + lines.join('\r\n');
};

export const downloadBomCsv = (rows: BomRow[], filename = 'rebar-bom.csv') => {
  const csv = bomToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const summariseBom = (rows: BomRow[]) => {
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const totalLength = rows.reduce((sum, row) => sum + row.totalLength, 0);
  const types = rows.length;
  return { totalWeight, totalLength, types };
};
