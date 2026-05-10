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
import { buildColumnGeometry } from './column';

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
  const column = buildColumnGeometry(frameToColumnParameters(parameters));

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

  const stirrups: StirrupPath[] = [
    ...beam.stirrups.map((stirrup) => shiftStirrup(stirrup, 0, beamCenterY, 0, 'beam')),
    ...column.stirrups.map((stirrup) => shiftStirrup(stirrup, -colCenterX, 0, 0, 'col-l')),
    ...column.stirrups.map((stirrup) => shiftStirrup(stirrup, colCenterX, 0, 0, 'col-r')),
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
