import type { BeamGeometryData, BeamParameters, RebarLine, StirrupPath } from '../types';

const MM_TO_M = 0.001;

const toMeters = (value: number) => value * MM_TO_M;

const distributeAcrossWidth = (count: number, innerWidth: number) => {
  if (count <= 1) {
    return [0];
  }

  const step = innerWidth / (count - 1);
  return Array.from({ length: count }, (_, index) => -innerWidth / 2 + step * index);
};

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

const createStirrupStations = (parameters: BeamParameters) => {
  const length = parameters.length;
  const dense = Math.min(parameters.denseZoneLength, length / 2);
  const stations = new Set<number>();

  for (let x = parameters.cover; x <= length - parameters.cover; x += parameters.stirrupSpacing) {
    stations.add(Math.round(x));
  }

  if (dense > 0) {
    for (let x = parameters.cover; x <= dense; x += parameters.denseZoneSpacing) {
      stations.add(Math.round(x));
    }
    for (let x = length - dense; x <= length - parameters.cover; x += parameters.denseZoneSpacing) {
      stations.add(Math.round(x));
    }
  }

  return Array.from(stations)
    .filter((x) => x >= parameters.cover && x <= length - parameters.cover)
    .sort((a, b) => a - b)
    .map((x) => toMeters(x - length / 2));
};

const buildStirrups = (parameters: BeamParameters): StirrupPath[] => {
  const width = toMeters(parameters.width);
  const height = toMeters(parameters.height);
  const cover = toMeters(parameters.cover);
  const radius = toMeters(parameters.stirrupDiameter) / 2;
  const hook = toMeters(parameters.stirrupHookLength);
  const z = width / 2 - cover - radius;
  const y = height / 2 - cover - radius;
  const hookOffset = Math.min(hook, Math.max(width - 2 * (cover + radius), 0.02) * 0.36);

  return createStirrupStations(parameters).map((x, index) => ({
    id: `stirrup-${index + 1}`,
    diameter: parameters.stirrupDiameter,
    points: [
      [x, -y, -z],
      [x, y, -z],
      [x, y, z],
      [x, -y, z],
      [x, -y, -z],
    ],
    hooks: [
      [
        [x, y, -z],
        [x, y - hookOffset * 0.72, -z + hookOffset],
      ],
      [
        [x, -y, z],
        [x, -y + hookOffset * 0.72, z - hookOffset],
      ],
    ],
  }));
};

export const buildBeamGeometry = (parameters: BeamParameters): BeamGeometryData => {
  const rebars = buildLongitudinalBars(parameters);
  const stirrups = buildStirrups(parameters);

  return {
    concrete: {
      length: toMeters(parameters.length),
      width: toMeters(parameters.width),
      height: toMeters(parameters.height),
    },
    rebars,
    stirrups,
    stats: {
      topBars: rebars.filter((bar) => bar.category === 'top').length,
      bottomBars: rebars.filter((bar) => bar.category === 'bottom').length,
      waistBars: rebars.filter((bar) => bar.category === 'waist').length,
      stirrups: stirrups.length,
    },
  };
};
