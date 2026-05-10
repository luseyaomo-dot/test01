import type { BeamGeometryData, ColumnParameters, RebarLine, StirrupPath } from '../types';

const MM_TO_M = 0.001;
const toMeters = (value: number) => value * MM_TO_M;

const computeHookLength = (stirrupDiameter: number) => Math.max(10 * stirrupDiameter, 75);

const computeColumnDenseZoneLength = (parameters: ColumnParameters) => {
  if (parameters.seismicGrade === 'none') return 0;
  const sectionMax = Math.max(parameters.width, parameters.depth);
  const fromClearHeight = parameters.height / Math.max(parameters.clearHeightRatio, 1);
  return Math.max(sectionMax, fromClearHeight, 500);
};

const distributeAlong = (count: number, span: number) => {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const step = span / (count + 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + step * (index + 1));
};

const buildColumnLongitudinalBars = (parameters: ColumnParameters): RebarLine[] => {
  const heightM = toMeters(parameters.height);
  const widthM = toMeters(parameters.width);
  const depthM = toMeters(parameters.depth);
  const cover = toMeters(parameters.cover);
  const stirrupDia = toMeters(parameters.stirrupDiameter);
  const cornerRadius = toMeters(parameters.cornerBarDiameter) / 2;
  const sideRadius = toMeters(parameters.sideBarDiameter) / 2;
  const clearance = 0.008;

  // 钢筋中心线相对柱中心的偏移
  const cornerInsetX = cover + stirrupDia + cornerRadius + clearance;
  const cornerInsetZ = cover + stirrupDia + cornerRadius + clearance;
  const xCorner = widthM / 2 - cornerInsetX;
  const zCorner = depthM / 2 - cornerInsetZ;

  const yBottom = -heightM / 2 + cover;
  const yTop = heightM / 2 - cover;

  const bars: RebarLine[] = [];

  // 4 个角筋
  const corners: [number, number][] = [
    [-xCorner, -zCorner],
    [xCorner, -zCorner],
    [xCorner, zCorner],
    [-xCorner, zCorner],
  ];
  corners.forEach(([x, z], index) => {
    bars.push({
      id: `corner-${index + 1}`,
      category: 'bottom', // 复用 RebarLine 类别仅用于颜色映射
      diameter: parameters.cornerBarDiameter,
      start: [x, yBottom, z],
      end: [x, yTop, z],
    });
  });

  // X 方向两条边上的中间纵筋 (z = ±zCorner)，沿 X 分布
  const sideInsetX = cover + stirrupDia + sideRadius + clearance;
  const insideSpanX = widthM - 2 * sideInsetX;
  const sideXPositions = distributeAlong(parameters.sideBarsX, insideSpanX);
  sideXPositions.forEach((x, index) => {
    bars.push({
      id: `side-x-front-${index + 1}`,
      category: 'top',
      diameter: parameters.sideBarDiameter,
      start: [x, yBottom, -zCorner],
      end: [x, yTop, -zCorner],
    });
    bars.push({
      id: `side-x-back-${index + 1}`,
      category: 'top',
      diameter: parameters.sideBarDiameter,
      start: [x, yBottom, zCorner],
      end: [x, yTop, zCorner],
    });
  });

  // Z 方向两条边上的中间纵筋 (x = ±xCorner)，沿 Z 分布
  const sideInsetZ = cover + stirrupDia + sideRadius + clearance;
  const insideSpanZ = depthM - 2 * sideInsetZ;
  const sideZPositions = distributeAlong(parameters.sideBarsZ, insideSpanZ);
  sideZPositions.forEach((z, index) => {
    bars.push({
      id: `side-z-left-${index + 1}`,
      category: 'waist',
      diameter: parameters.sideBarDiameter,
      start: [-xCorner, yBottom, z],
      end: [-xCorner, yTop, z],
    });
    bars.push({
      id: `side-z-right-${index + 1}`,
      category: 'waist',
      diameter: parameters.sideBarDiameter,
      start: [xCorner, yBottom, z],
      end: [xCorner, yTop, z],
    });
  });

  return bars;
};

const createColumnStirrupYStations = (parameters: ColumnParameters, denseLen: number) => {
  const total = parameters.height;
  const offset = parameters.firstStirrupOffset;
  const stations: number[] = [];
  const push = (y: number) => {
    const r = Math.round(y);
    if (r >= offset && r <= total - offset && !stations.includes(r)) stations.push(r);
  };

  if (denseLen > 0) {
    for (let y = offset; y <= offset + denseLen; y += parameters.denseZoneSpacing) push(y);
    for (let y = total - offset - denseLen; y <= total - offset; y += parameters.denseZoneSpacing) push(y);
  }
  const midStart = offset + denseLen;
  const midEnd = total - offset - denseLen;
  if (midEnd > midStart) {
    for (let y = midStart + parameters.stirrupSpacing; y < midEnd; y += parameters.stirrupSpacing) push(y);
  } else {
    for (let y = offset; y <= total - offset; y += parameters.stirrupSpacing) push(y);
  }
  if (denseLen <= 0) {
    push(offset);
    push(total - offset);
  }
  return stations.sort((a, b) => a - b).map((y) => toMeters(y - total / 2));
};

const buildColumnOuterStirrup = (y: number, parameters: ColumnParameters, hookLenMm: number, index: number): StirrupPath => {
  const widthM = toMeters(parameters.width);
  const depthM = toMeters(parameters.depth);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(parameters.stirrupDiameter) / 2;
  const hook = toMeters(hookLenMm);
  const x = widthM / 2 - cover - radius;
  const z = depthM / 2 - cover - radius;
  const hookH = hook * Math.SQRT1_2;
  const hookV = hook * Math.SQRT1_2;
  return {
    id: `col-stirrup-${index + 1}`,
    diameter: parameters.stirrupDiameter,
    kind: 'outer',
    points: [
      [-x, y, -z],
      [x, y, -z],
      [x, y, z],
      [-x, y, z],
      [-x, y, -z],
      [x, y, -z],
    ],
    hooks: [
      [
        [x, y, -z],
        [x - hookH, y - hookV, -z + hookH],
      ],
      [
        [-x, y, z],
        [-x + hookH, y - hookV, z - hookH],
      ],
    ],
  };
};

const buildColumnInnerStirrups = (y: number, parameters: ColumnParameters, hookLenMm: number, baseIndex: number): StirrupPath[] => {
  const innerCount = Math.max(0, (parameters.stirrupLegCount - 2) / 2);
  if (innerCount <= 0) return [];

  const widthM = toMeters(parameters.width);
  const depthM = toMeters(parameters.depth);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(parameters.stirrupDiameter) / 2;
  const hook = toMeters(hookLenMm);
  const halfX = widthM / 2 - cover - radius;
  const halfZ = depthM / 2 - cover - radius;
  const hookH = hook * Math.SQRT1_2;
  const hookV = hook * Math.SQRT1_2;

  const stirrups: StirrupPath[] = [];
  // 4 肢: 加一个 90° 旋转的内箍 (沿 X 轴方向，缩小宽度)
  if (innerCount >= 1) {
    const innerHalfX = halfX / 2;
    stirrups.push({
      id: `col-stirrup-${baseIndex + 1}-inner-1`,
      diameter: parameters.stirrupDiameter,
      kind: 'inner',
      points: [
        [-innerHalfX, y, -halfZ],
        [innerHalfX, y, -halfZ],
        [innerHalfX, y, halfZ],
        [-innerHalfX, y, halfZ],
        [-innerHalfX, y, -halfZ],
        [innerHalfX, y, -halfZ],
      ],
      hooks: [
        [
          [innerHalfX, y, -halfZ],
          [innerHalfX - hookH, y - hookV, -halfZ + hookH],
        ],
        [
          [-innerHalfX, y, halfZ],
          [-innerHalfX + hookH, y - hookV, halfZ - hookH],
        ],
      ],
    });
  }
  // 6 肢: 再加一个 Z 方向缩小的内箍
  if (innerCount >= 2) {
    const innerHalfZ = halfZ / 2;
    stirrups.push({
      id: `col-stirrup-${baseIndex + 1}-inner-2`,
      diameter: parameters.stirrupDiameter,
      kind: 'inner',
      points: [
        [-halfX, y, -innerHalfZ],
        [halfX, y, -innerHalfZ],
        [halfX, y, innerHalfZ],
        [-halfX, y, innerHalfZ],
        [-halfX, y, -innerHalfZ],
        [halfX, y, -innerHalfZ],
      ],
      hooks: [
        [
          [halfX, y, -innerHalfZ],
          [halfX - hookH, y - hookV, -innerHalfZ + hookH],
        ],
        [
          [-halfX, y, innerHalfZ],
          [-halfX + hookH, y - hookV, innerHalfZ - hookH],
        ],
      ],
    });
  }
  return stirrups;
};

export const buildColumnGeometry = (parameters: ColumnParameters): BeamGeometryData => {
  const denseZoneLength = computeColumnDenseZoneLength(parameters);
  const hookLength = computeHookLength(parameters.stirrupDiameter);
  const ys = createColumnStirrupYStations(parameters, denseZoneLength);
  const stirrups: StirrupPath[] = [];
  ys.forEach((y, index) => {
    stirrups.push(buildColumnOuterStirrup(y, parameters, hookLength, index));
    stirrups.push(...buildColumnInnerStirrups(y, parameters, hookLength, index));
  });

  const rebars = buildColumnLongitudinalBars(parameters);

  return {
    concrete: {
      length: toMeters(parameters.width),   // 渲染时 X 维度
      height: toMeters(parameters.height),  // Y 维度
      width: toMeters(parameters.depth),    // Z 维度
    },
    rebars,
    rebarHooks: [],
    stirrups,
    stats: {
      topBars: rebars.filter((r) => r.category === 'top').length,
      bottomBars: rebars.filter((r) => r.category === 'bottom').length,
      waistBars: rebars.filter((r) => r.category === 'waist').length,
      stirrups: stirrups.filter((s) => s.kind === 'outer').length,
      legCount: parameters.stirrupLegCount,
      denseZoneLength,
      hookLength,
    },
  };
};
