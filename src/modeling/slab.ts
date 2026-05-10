import type { BeamGeometryData, ConcreteBox, RebarHook, RebarLine, SlabParameters } from '../types';

const MM_TO_M = 0.001;
const toMeters = (value: number) => value * MM_TO_M;

const distributeAlong = (span: number, spacing: number): number[] => {
  if (span <= 0 || spacing <= 0) return [0];
  const count = Math.max(2, Math.floor(span / spacing) + 1);
  const result: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    result.push(-span / 2 + t * span);
  }
  return result;
};

type LayerSpec = {
  layer: 'top' | 'bottom';
  axis: 'x' | 'z';
  diameter: number;
  spacing: number;
  yCenter: number;
};

const buildLayerBars = (
  parameters: SlabParameters,
  spec: LayerSpec,
  prefix: string,
): RebarLine[] => {
  const lengthM = toMeters(parameters.length);
  const widthM = toMeters(parameters.width);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(spec.diameter) / 2;
  const bars: RebarLine[] = [];

  if (spec.axis === 'x') {
    // bars run in X, distributed along Z
    const zSpan = widthM - 2 * cover - 2 * radius;
    const zPositions = distributeAlong(zSpan, toMeters(spec.spacing));
    const xStart = -lengthM / 2 + cover;
    const xEnd = lengthM / 2 - cover;
    zPositions.forEach((z, index) => {
      bars.push({
        id: `${prefix}-${index + 1}`,
        category: spec.layer === 'top' ? 'top' : 'bottom',
        diameter: spec.diameter,
        start: [xStart, spec.yCenter, z],
        end: [xEnd, spec.yCenter, z],
      });
    });
  } else {
    // bars run in Z, distributed along X
    const xSpan = lengthM - 2 * cover - 2 * radius;
    const xPositions = distributeAlong(xSpan, toMeters(spec.spacing));
    const zStart = -widthM / 2 + cover;
    const zEnd = widthM / 2 - cover;
    xPositions.forEach((x, index) => {
      bars.push({
        id: `${prefix}-${index + 1}`,
        category: spec.layer === 'top' ? 'top' : 'bottom',
        diameter: spec.diameter,
        start: [x, spec.yCenter, zStart],
        end: [x, spec.yCenter, zEnd],
      });
    });
  }
  return bars;
};

const buildTopHooks = (
  bars: RebarLine[],
  thicknessM: number,
  coverM: number,
  anchorageRatio: number,
): RebarHook[] => {
  const hooks: RebarHook[] = [];
  bars.forEach((bar) => {
    if (bar.category !== 'top') return;
    const dia = toMeters(bar.diameter);
    const hookLen = dia * anchorageRatio;
    // 顶筋两端 90° 弯锚向下，长度 ≈ anchorageRatio * d，但不超过板厚 - 2*cover
    const maxDown = thicknessM - 2 * coverM - dia;
    const drop = Math.min(hookLen, maxDown);
    const yEnd = bar.start[1] - drop;
    hooks.push({
      id: `${bar.id}-hook-start`,
      category: bar.category,
      diameter: bar.diameter,
      points: [
        [bar.start[0], bar.start[1], bar.start[2]],
        [bar.start[0], yEnd, bar.start[2]],
      ],
    });
    hooks.push({
      id: `${bar.id}-hook-end`,
      category: bar.category,
      diameter: bar.diameter,
      points: [
        [bar.end[0], bar.end[1], bar.end[2]],
        [bar.end[0], yEnd, bar.end[2]],
      ],
    });
  });
  return hooks;
};

export const buildSlabGeometry = (parameters: SlabParameters): BeamGeometryData => {
  const lengthM = toMeters(parameters.length);
  const widthM = toMeters(parameters.width);
  const thicknessM = toMeters(parameters.thickness);
  const cover = toMeters(parameters.cover);

  // 下层 X 方向钢筋 (最底层)
  const botXR = toMeters(parameters.bottomBarXDiameter) / 2;
  const botX_y = -thicknessM / 2 + cover + botXR;

  // 下层 Z 方向钢筋 (压在 X 方向上)
  const botZR = toMeters(parameters.bottomBarZDiameter) / 2;
  const botZ_y = botX_y + botXR + botZR + 0.001;

  // 上层 X 方向钢筋 (上层下排)
  const topXR = toMeters(parameters.topBarXDiameter) / 2;
  const topX_y = thicknessM / 2 - cover - topXR;

  // 上层 Z 方向钢筋 (上层上排，压在 X 上)
  const topZR = toMeters(parameters.topBarZDiameter) / 2;
  const topZ_y = topX_y - topXR - topZR - 0.001;

  const layers: { spec: LayerSpec; prefix: string }[] = [
    { spec: { layer: 'bottom', axis: 'x', diameter: parameters.bottomBarXDiameter, spacing: parameters.bottomBarXSpacing, yCenter: botX_y }, prefix: 'slab-bot-x' },
    { spec: { layer: 'bottom', axis: 'z', diameter: parameters.bottomBarZDiameter, spacing: parameters.bottomBarZSpacing, yCenter: botZ_y }, prefix: 'slab-bot-z' },
    { spec: { layer: 'top', axis: 'x', diameter: parameters.topBarXDiameter, spacing: parameters.topBarXSpacing, yCenter: topX_y }, prefix: 'slab-top-x' },
    { spec: { layer: 'top', axis: 'z', diameter: parameters.topBarZDiameter, spacing: parameters.topBarZSpacing, yCenter: topZ_y }, prefix: 'slab-top-z' },
  ];

  const rebars: RebarLine[] = [];
  layers.forEach(({ spec, prefix }) => {
    rebars.push(...buildLayerBars(parameters, spec, prefix));
  });

  const rebarHooks = buildTopHooks(rebars, thicknessM, cover, parameters.anchorageRatio);

  const concretes: ConcreteBox[] = [
    {
      id: 'slab',
      label: `LB ${parameters.length}×${parameters.width}×${parameters.thickness}`,
      size: [lengthM, thicknessM, widthM],
      position: [0, 0, 0],
    },
  ];

  const topBars = rebars.filter((bar) => bar.category === 'top').length;
  const bottomBars = rebars.filter((bar) => bar.category === 'bottom').length;

  return {
    concretes,
    rebars,
    rebarHooks,
    stirrups: [],
    bounds: { length: lengthM, height: thicknessM, width: widthM },
    stats: {
      topBars,
      bottomBars,
      waistBars: 0,
      stirrups: 0,
      legCount: 0,
      denseZoneLength: 0,
      hookLength: parameters.anchorageRatio * Math.max(parameters.topBarXDiameter, parameters.topBarZDiameter),
    },
  };
};
