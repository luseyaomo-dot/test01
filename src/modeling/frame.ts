import type {
  BeamGeometryData,
  BeamParameters,
  ColumnParameters,
  ConcreteBox,
  FrameParameters,
  RebarHook,
  RebarLine,
  StirrupPath,
} from '../types';
import { buildBeamGeometry } from './beam';
import {
  buildColumnGeometry,
  buildColumnInnerStirrups,
  buildColumnOuterStirrup,
  computeHookLength,
} from './column';

const MM_TO_M = 0.001;
const toMeters = (value: number) => value * MM_TO_M;

const shiftRebar = (bar: RebarLine, dx: number, dy: number, dz: number, idPrefix: string): RebarLine => ({
  ...bar,
  id: `${idPrefix}-${bar.id}`,
  start: [bar.start[0] + dx, bar.start[1] + dy, bar.start[2] + dz],
  end: [bar.end[0] + dx, bar.end[1] + dy, bar.end[2] + dz],
});

const shiftHook = (hook: RebarHook, dx: number, dy: number, dz: number, idPrefix: string): RebarHook => ({
  ...hook,
  id: `${idPrefix}-${hook.id}`,
  points: hook.points.map(([x, y, z]) => [x + dx, y + dy, z + dz]),
});

const shiftStirrup = (stirrup: StirrupPath, dx: number, dy: number, dz: number, idPrefix: string): StirrupPath => ({
  ...stirrup,
  id: `${idPrefix}-${stirrup.id}`,
  points: stirrup.points.map(([x, y, z]) => [x + dx, y + dy, z + dz]),
  hooks: stirrup.hooks.map((leg) => leg.map(([x, y, z]) => [x + dx, y + dy, z + dz])),
});

const shiftConcrete = (box: ConcreteBox, dx: number, dy: number, dz: number, idPrefix: string): ConcreteBox => ({
  ...box,
  id: `${idPrefix}-${box.id}`,
  position: [box.position[0] + dx, box.position[1] + dy, box.position[2] + dz],
});

const createJointCoreStations = (bottom: number, top: number, spacing: number, inset: number) => {
  const stations: number[] = [];
  const start = bottom + inset;
  const end = top - inset;
  if (end < start) return [(bottom + top) / 2];
  for (let y = start; y <= end + 0.0001; y += spacing) {
    stations.push(y);
  }
  if (stations.length === 0 || Math.abs(stations[stations.length - 1] - end) > spacing * 0.4) {
    stations.push(end);
  }
  return Array.from(new Set(stations.map((y) => Number(y.toFixed(4))))).sort((a, b) => a - b);
};

const detourJointPath = (
  points: [number, number, number][],
  avoidHalfZ: number,
  detour: number,
): [number, number, number][] => {
  const result: [number, number, number][] = [];
  const push = (point: [number, number, number]) => {
    const last = result[result.length - 1];
    if (!last || Math.abs(last[0] - point[0]) > 0.0001 || Math.abs(last[1] - point[1]) > 0.0001 || Math.abs(last[2] - point[2]) > 0.0001) {
      result.push(point);
    }
  };

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    push(from);
    const sameX = Math.abs(from[0] - to[0]) < 0.0001;
    const spansAvoidZone = Math.min(from[2], to[2]) < -avoidHalfZ && Math.max(from[2], to[2]) > avoidHalfZ;
    if (sameX && spansAvoidZone && Math.abs(from[0]) > detour) {
      const direction = to[2] > from[2] ? 1 : -1;
      const zA = direction > 0 ? -avoidHalfZ : avoidHalfZ;
      const zB = direction > 0 ? avoidHalfZ : -avoidHalfZ;
      const xOffset = from[0] + Math.sign(from[0]) * detour;
      push([from[0], from[1], zA]);
      push([xOffset, from[1], zA]);
      push([xOffset, from[1], zB]);
      push([from[0], from[1], zB]);
    }
    push(to);
  }
  return result;
};

const asJointStirrup = (
  stirrup: StirrupPath,
  id: string,
  avoidHalfZ: number,
  detour: number,
): StirrupPath => ({
  ...stirrup,
  id,
  kind: 'joint',
  points: detourJointPath(stirrup.points, avoidHalfZ, detour),
});

const buildJointCoreStirrups = (
  parameters: FrameParameters,
  columnParameters: ColumnParameters,
  jointBottom: number,
  jointTop: number,
): StirrupPath[] => {
  const spacing = toMeters(parameters.jointCoreSpacing);
  const inset = Math.min(toMeters(parameters.firstStirrupOffset), Math.max((jointTop - jointBottom) / 4, 0.02));
  const stations = createJointCoreStations(jointBottom, jointTop, spacing, inset);
  const hookLength = computeHookLength(parameters.columnStirrupDiameter);
  const avoidHalfZ = toMeters(parameters.beamWidth) / 2 + toMeters(Math.max(parameters.topBarDiameter, parameters.bottomBarDiameter, parameters.waistBarDiameter)) / 2 + 0.012;
  const detour = Math.max(toMeters(parameters.columnStirrupDiameter * 2), 0.012);
  const stirrups: StirrupPath[] = [];
  stations.forEach((y, index) => {
    stirrups.push(asJointStirrup(buildColumnOuterStirrup(y, columnParameters, hookLength, index), `joint-stirrup-${index + 1}`, avoidHalfZ, detour));
    buildColumnInnerStirrups(y, columnParameters, hookLength, index).forEach((stirrup, innerIndex) => {
      stirrups.push(asJointStirrup(stirrup, `joint-stirrup-${index + 1}-inner-${innerIndex + 1}`, avoidHalfZ, detour));
    });
  });
  return stirrups;
};

export const frameToBeamParameters = (parameters: FrameParameters): BeamParameters => ({
  length: parameters.spanLn + 2 * parameters.columnWidth,
  width: parameters.beamWidth,
  height: parameters.beamHeight,
  cover: parameters.cover,
  seismicGrade: parameters.seismicGrade,
  topBarCount: parameters.topBarCount,
  topBarDiameter: parameters.topBarDiameter,
  bottomBarCount: parameters.bottomBarCount,
  bottomBarDiameter: parameters.bottomBarDiameter,
  waistBarCount: parameters.waistBarCount,
  waistBarDiameter: parameters.waistBarDiameter,
  stirrupDiameter: parameters.beamStirrupDiameter,
  stirrupLegCount: parameters.beamStirrupLegCount,
  stirrupSpacing: parameters.beamStirrupSpacing,
  denseZoneSpacing: parameters.beamDenseSpacing,
  anchorageLength: 35 * parameters.topBarDiameter,
  firstStirrupOffset: parameters.firstStirrupOffset,
});

export const frameToColumnParameters = (parameters: FrameParameters): ColumnParameters => ({
  height: parameters.columnHeight,
  width: parameters.columnWidth,
  depth: parameters.columnDepth,
  cover: parameters.cover,
  seismicGrade: parameters.seismicGrade,
  cornerBarDiameter: parameters.cornerBarDiameter,
  sideBarsX: parameters.sideBarsX,
  sideBarsZ: parameters.sideBarsZ,
  sideBarDiameter: parameters.sideBarDiameter,
  stirrupDiameter: parameters.columnStirrupDiameter,
  stirrupLegCount: parameters.columnStirrupLegCount,
  stirrupSpacing: parameters.columnStirrupSpacing,
  denseZoneSpacing: parameters.columnDenseSpacing,
  firstStirrupOffset: parameters.firstStirrupOffset,
  clearHeightRatio: 6,
});

export const buildFrameGeometry = (parameters: FrameParameters): BeamGeometryData => {
  const beam = buildBeamGeometry(frameToBeamParameters(parameters));
  const columnParameters = frameToColumnParameters(parameters);
  const column = buildColumnGeometry(columnParameters);

  const beamHeightM = toMeters(parameters.beamHeight);
  const columnHeightM = toMeters(parameters.columnHeight);
  const spanLnM = toMeters(parameters.spanLn);
  const colWidthM = toMeters(parameters.columnWidth);

  // Place beam so its top sits flush with the column top
  // Beam center y = columnTop - beamHeight/2  (with column centered at origin originally, columnTop = columnHeight/2)
  const beamCenterY = columnHeightM / 2 - beamHeightM / 2;

  // Column positions: outer faces at x = ±(spanLn/2 + columnWidth)
  const colCenterX = spanLnM / 2 + colWidthM / 2;

  const concretes: ConcreteBox[] = [
    ...beam.concretes.map((box) => shiftConcrete(box, 0, beamCenterY, 0, 'beam')),
    ...column.concretes.map((box) => shiftConcrete(box, -colCenterX, 0, 0, 'col-l')),
    ...column.concretes.map((box) => shiftConcrete(box, colCenterX, 0, 0, 'col-r')),
  ];

  const rebars: RebarLine[] = [
    ...beam.rebars.map((bar) => shiftRebar(bar, 0, beamCenterY, 0, 'beam')),
    ...column.rebars.map((bar) => shiftRebar(bar, -colCenterX, 0, 0, 'col-l')),
    ...column.rebars.map((bar) => shiftRebar(bar, colCenterX, 0, 0, 'col-r')),
  ];

  const rebarHooks: RebarHook[] = [
    ...beam.rebarHooks.map((hook) => shiftHook(hook, 0, beamCenterY, 0, 'beam')),
  ];

  // 节点核心区裁剪：
  //  - 梁箍筋只保留净跨范围 [-spanLn/2, spanLn/2]
  //  - 柱箍筋去掉位于梁高度范围内的（即节点核心区内的箍筋，由梁箍筋贯通）
  const halfSpan = spanLnM / 2;
  const jointTop = columnHeightM / 2;
  const jointBottom = jointTop - beamHeightM;

  const beamStirrupsTrimmed = beam.stirrups.filter((stirrup) => {
    const x = stirrup.points[0]?.[0] ?? 0;
    return x >= -halfSpan && x <= halfSpan;
  });
  const columnStirrupsTrimmed = column.stirrups.filter((stirrup) => {
    const y = stirrup.points[0]?.[1] ?? 0;
    return y < jointBottom;
  });
  const jointCoreStirrups = buildJointCoreStirrups(parameters, columnParameters, jointBottom, jointTop);

  const stirrups: StirrupPath[] = [
    ...beamStirrupsTrimmed.map((stirrup) => shiftStirrup(stirrup, 0, beamCenterY, 0, 'beam')),
    ...columnStirrupsTrimmed.map((stirrup) => shiftStirrup(stirrup, -colCenterX, 0, 0, 'col-l')),
    ...columnStirrupsTrimmed.map((stirrup) => shiftStirrup(stirrup, colCenterX, 0, 0, 'col-r')),
    ...jointCoreStirrups.map((stirrup) => shiftStirrup(stirrup, -colCenterX, 0, 0, 'col-l')),
    ...jointCoreStirrups.map((stirrup) => shiftStirrup(stirrup, colCenterX, 0, 0, 'col-r')),
  ];

  const totalLength = spanLnM + 2 * colWidthM;
  const totalHeight = columnHeightM; // 已包含梁顶
  const totalWidth = Math.max(toMeters(parameters.beamWidth), toMeters(parameters.columnDepth));

  return {
    concretes,
    rebars,
    rebarHooks,
    stirrups,
    bounds: { length: totalLength, height: totalHeight, width: totalWidth },
    stats: {
      topBars: rebars.filter((bar) => bar.id.startsWith('beam-') && bar.category === 'top').length,
      bottomBars: rebars.filter((bar) => bar.id.startsWith('beam-') && bar.category === 'bottom').length,
      waistBars: rebars.filter((bar) => bar.id.startsWith('beam-') && bar.category === 'waist').length,
      stirrups: stirrups.filter((s) => s.kind === 'outer').length,
      legCount: parameters.beamStirrupLegCount,
      denseZoneLength: beam.stats.denseZoneLength,
      hookLength: beam.stats.hookLength,
    },
  };
};
