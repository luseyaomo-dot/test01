import type { BeamGeometryData, BeamParameters, RebarHook, RebarLine, StirrupPath } from '../types';

const MM_TO_M = 0.001;

const toMeters = (value: number) => value * MM_TO_M;

const distributeAcrossWidth = (count: number, innerWidth: number) => {
  if (count <= 1) {
    return [0];
  }

  const step = innerWidth / (count - 1);
  return Array.from({ length: count }, (_, index) => -innerWidth / 2 + step * index);
};

const computeDenseZoneLength = (parameters: BeamParameters) => {
  if (parameters.seismicGrade === 'none') {
    return 0;
  }
  const factor = parameters.seismicGrade === '1' ? 2.0 : 1.5;
  return Math.max(factor * parameters.height, 500);
};

const computeHookLength = (stirrupDiameter: number) => Math.max(10 * stirrupDiameter, 75);

const buildLongitudinalBars = (parameters: BeamParameters): RebarLine[] => {
  const length = toMeters(parameters.length);
  const width = toMeters(parameters.width);
  const height = toMeters(parameters.height);
  const cover = toMeters(parameters.cover);
  const stirrupDiameter = toMeters(parameters.stirrupDiameter);
  const clearance = 0.008;
  const topRadius = toMeters(parameters.topBarDiameter) / 2;
  const bottomRadius = toMeters(parameters.bottomBarDiameter) / 2;
  const waistRadius = toMeters(parameters.waistBarDiameter) / 2;
  const startX = -length / 2 + cover + stirrupDiameter;
  const endX = length / 2 - cover - stirrupDiameter;
  const bars: RebarLine[] = [];

  const topInset = cover + stirrupDiameter + topRadius + clearance;
  const bottomInset = cover + stirrupDiameter + bottomRadius + clearance;
  const waistInset = cover + stirrupDiameter + waistRadius + clearance;
  const topZ = distributeAcrossWidth(parameters.topBarCount, Math.max(width - 2 * topInset, 0.01));
  topZ.forEach((z, index) => {
    bars.push({
      id: `top-${index + 1}`,
      category: 'top',
      diameter: parameters.topBarDiameter,
      start: [startX, height / 2 - topInset, z],
      end: [endX, height / 2 - topInset, z],
    });
  });

  const bottomZ = distributeAcrossWidth(parameters.bottomBarCount, Math.max(width - 2 * bottomInset, 0.01));
  bottomZ.forEach((z, index) => {
    bars.push({
      id: `bottom-${index + 1}`,
      category: 'bottom',
      diameter: parameters.bottomBarDiameter,
      start: [startX, -height / 2 + bottomInset, z],
      end: [endX, -height / 2 + bottomInset, z],
    });
  });

  if (parameters.waistBarCount > 0) {
    const sideCount = Math.ceil(parameters.waistBarCount / 2);
    const usableHeight = Math.max(height - 2 * waistInset - 0.16, 0.05);
    const yPositions = sideCount === 1 ? [0] : Array.from({ length: sideCount }, (_, index) => -usableHeight / 2 + (usableHeight / (sideCount - 1)) * index);
    yPositions.forEach((y, index) => {
      const zOffset = width / 2 - waistInset;
      bars.push({
        id: `waist-left-${index + 1}`,
        category: 'waist',
        diameter: parameters.waistBarDiameter,
        start: [startX, y, -zOffset],
        end: [endX, y, -zOffset],
      });
      if (bars.filter((bar) => bar.category === 'waist').length < parameters.waistBarCount) {
        bars.push({
          id: `waist-right-${index + 1}`,
          category: 'waist',
          diameter: parameters.waistBarDiameter,
          start: [startX, y, zOffset],
          end: [endX, y, zOffset],
        });
      }
    });
  }

  return bars;
};

const createStirrupStations = (parameters: BeamParameters, denseZoneLength: number) => {
  const length = parameters.length;
  const offset = parameters.firstStirrupOffset;
  const stations: number[] = [];
  const push = (x: number) => {
    const rounded = Math.round(x);
    if (rounded >= offset && rounded <= length - offset && !stations.includes(rounded)) {
      stations.push(rounded);
    }
  };

  if (denseZoneLength > 0) {
    for (let x = offset; x <= offset + denseZoneLength; x += parameters.denseZoneSpacing) {
      push(x);
    }
    for (let x = length - offset - denseZoneLength; x <= length - offset; x += parameters.denseZoneSpacing) {
      push(x);
    }
  }

  const middleStart = offset + denseZoneLength;
  const middleEnd = length - offset - denseZoneLength;
  if (middleEnd > middleStart) {
    for (let x = middleStart + parameters.stirrupSpacing; x < middleEnd; x += parameters.stirrupSpacing) {
      push(x);
    }
  } else {
    for (let x = offset; x <= length - offset; x += parameters.stirrupSpacing) {
      push(x);
    }
  }

  if (denseZoneLength <= 0) {
    push(offset);
    push(length - offset);
  }

  return stations
    .sort((a, b) => a - b)
    .map((x) => toMeters(x - length / 2));
};

const buildOuterStirrupAt = (x: number, parameters: BeamParameters, hookLengthMm: number, index: number): StirrupPath => {
  const width = toMeters(parameters.width);
  const height = toMeters(parameters.height);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(parameters.stirrupDiameter) / 2;
  const hook = toMeters(hookLengthMm);
  const z = width / 2 - cover - radius;
  const y = height / 2 - cover - radius;
  // 135° hook: bend 45° inward from corner
  const hookHoriz = hook * Math.SQRT1_2;
  const hookVert = hook * Math.SQRT1_2;
  return {
    id: `stirrup-${index + 1}`,
    diameter: parameters.stirrupDiameter,
    kind: 'outer',
    points: [
      [x, -y, -z],
      [x, y, -z],
      [x, y, z],
      [x, -y, z],
      [x, -y, -z],
      [x, y, -z],
    ],
    hooks: [
      [
        [x, y, -z],
        [x, y - hookVert, -z + hookHoriz],
      ],
      [
        [x, y, -z],
        [x, y - hookVert, -z - hookHoriz * 0.4],
      ],
    ],
  };
};

const buildInnerStirrupsAt = (x: number, parameters: BeamParameters, hookLengthMm: number, baseIndex: number): StirrupPath[] => {
  const innerCount = Math.max(0, (parameters.stirrupLegCount - 2) / 2);
  if (innerCount <= 0) return [];

  const width = toMeters(parameters.width);
  const height = toMeters(parameters.height);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(parameters.stirrupDiameter) / 2;
  const hook = toMeters(hookLengthMm);
  const halfInner = width / 2 - cover - radius;
  const y = height / 2 - cover - radius;
  const hookHoriz = hook * Math.SQRT1_2;
  const hookVert = hook * Math.SQRT1_2;

  const stirrups: StirrupPath[] = [];
  // 内箍 y 方向缩进 2*radius+gap，避免与外箍上下边线重合
  const yInner = y - 2 * radius - 0.003;
  if (innerCount === 1) {
    const halfWidth = halfInner / 2;
    stirrups.push(buildSmallStirrup(x, 0, halfWidth, yInner, parameters.stirrupDiameter, hookHoriz, hookVert, `stirrup-${baseIndex + 1}-inner-1`));
  } else if (innerCount === 2) {
    const halfWidth = halfInner / 3;
    const offsetZ = halfInner * 2 / 3;
    stirrups.push(buildSmallStirrup(x, -offsetZ, halfWidth, yInner, parameters.stirrupDiameter, hookHoriz, hookVert, `stirrup-${baseIndex + 1}-inner-1`));
    stirrups.push(buildSmallStirrup(x, offsetZ, halfWidth, yInner, parameters.stirrupDiameter, hookHoriz, hookVert, `stirrup-${baseIndex + 1}-inner-2`));
  }
  return stirrups;
};

const buildSmallStirrup = (
  x: number,
  centerZ: number,
  halfWidth: number,
  y: number,
  diameter: number,
  hookHoriz: number,
  hookVert: number,
  id: string,
): StirrupPath => {
  const zLeft = centerZ - halfWidth;
  const zRight = centerZ + halfWidth;
  return {
    id,
    diameter,
    kind: 'inner',
    points: [
      [x, -y, zLeft],
      [x, y, zLeft],
      [x, y, zRight],
      [x, -y, zRight],
      [x, -y, zLeft],
      [x, y, zLeft],
    ],
    hooks: [
      [
        [x, y, zLeft],
        [x, y - hookVert, zLeft + hookHoriz],
      ],
      [
        [x, -y, zRight],
        [x, -y + hookVert, zRight - hookHoriz],
      ],
    ],
  };
};

const buildStirrups = (parameters: BeamParameters, denseZoneLength: number): StirrupPath[] => {
  const hookLengthMm = computeHookLength(parameters.stirrupDiameter);
  const stations = createStirrupStations(parameters, denseZoneLength);
  const all: StirrupPath[] = [];
  stations.forEach((x, index) => {
    all.push(buildOuterStirrupAt(x, parameters, hookLengthMm, index));
    all.push(...buildInnerStirrupsAt(x, parameters, hookLengthMm, index));
  });
  return all;
};

const buildEndHooks = (parameters: BeamParameters, bars: RebarLine[]): RebarHook[] => {
  // Top/bottom bars get a 15d 90° bend at each end (visualization of 弯锚 into supports)
  const hooks: RebarHook[] = [];
  bars.forEach((bar) => {
    if (bar.category === 'waist') return;
    const bendLength = toMeters(15 * bar.diameter);
    const direction = bar.category === 'top' ? -1 : 1; // top bends down, bottom bends up
    const yEnd = bar.start[1] + direction * bendLength;
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

export const buildBeamGeometry = (parameters: BeamParameters): BeamGeometryData => {
  const rebars = buildLongitudinalBars(parameters);
  const denseZoneLength = computeDenseZoneLength(parameters);
  const stirrups = buildStirrups(parameters, denseZoneLength);
  const rebarHooks = buildEndHooks(parameters, rebars);
  const hookLength = computeHookLength(parameters.stirrupDiameter);

  const len = toMeters(parameters.length);
  const w = toMeters(parameters.width);
  const h = toMeters(parameters.height);
  return {
    concretes: [
      {
        id: 'beam',
        label: `KL ${parameters.width}×${parameters.height}`,
        size: [len, h, w],
        position: [0, 0, 0],
      },
    ],
    rebars,
    rebarHooks,
    stirrups,
    bounds: { length: len, height: h, width: w },
    stats: {
      topBars: rebars.filter((bar) => bar.category === 'top').length,
      bottomBars: rebars.filter((bar) => bar.category === 'bottom').length,
      waistBars: rebars.filter((bar) => bar.category === 'waist').length,
      stirrups: stirrups.filter((s) => s.kind === 'outer').length,
      legCount: parameters.stirrupLegCount,
      denseZoneLength,
      hookLength,
    },
  };
};
