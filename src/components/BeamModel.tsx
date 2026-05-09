import { Edges, Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { BeamGeometryData, DisplayOptions, RebarLine, StirrupPath } from '../types';

const rebarColors = {
  top: '#b82922',
  bottom: '#d75a24',
  waist: '#f0a02f',
};

const mmToMeters = (value: number) => value * 0.001;

type BeamModelProps = {
  geometry: BeamGeometryData;
  display: DisplayOptions;
};

type LongitudinalBarProps = {
  bar: RebarLine;
};

type StirrupProps = {
  stirrup: StirrupPath;
};

type TubePathProps = {
  points: [number, number, number][];
  diameter: number;
  color: string;
  radialSegments?: number;
};

function LongitudinalBar({ bar }: LongitudinalBarProps) {
  const radius = mmToMeters(bar.diameter) / 2;
  const length = Math.abs(bar.end[0] - bar.start[0]);
  const position: [number, number, number] = [
    (bar.start[0] + bar.end[0]) / 2,
    (bar.start[1] + bar.end[1]) / 2,
    (bar.start[2] + bar.end[2]) / 2,
  ];

  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 28]} />
      <meshStandardMaterial color={rebarColors[bar.category]} metalness={0.25} roughness={0.34} />
    </mesh>
  );
}

function TubePath({ points, diameter, color, radialSegments = 12 }: TubePathProps) {
  const geometry = useMemo(() => {
    const vectors = points.map((point) => new THREE.Vector3(...point));
    const path = new THREE.CurvePath<THREE.Vector3>();

    for (let index = 0; index < vectors.length - 1; index += 1) {
      path.add(new THREE.LineCurve3(vectors[index], vectors[index + 1]));
    }

    return new THREE.TubeGeometry(path, Math.max(points.length * 8, 32), mmToMeters(diameter) / 2, radialSegments, false);
  }, [diameter, points, radialSegments]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.22} roughness={0.32} />
    </mesh>
  );
}

function Stirrup({ stirrup }: StirrupProps) {
  return (
    <group>
      <TubePath points={stirrup.points} diameter={stirrup.diameter} color="#7f1d1d" radialSegments={14} />
      {stirrup.hooks.map((hook, index) => (
        <TubePath key={`${stirrup.id}-hook-${index}`} points={hook} diameter={stirrup.diameter} color="#dc2626" radialSegments={12} />
      ))}
    </group>
  );
}

export function BeamModel({ geometry, display }: BeamModelProps) {
  const visibleBars = geometry.rebars.filter((bar) => {
    if (bar.category === 'top') return display.showTopBars;
    if (bar.category === 'bottom') return display.showBottomBars;
    return display.showWaistBars;
  });

  return (
    <group>
      {display.showConcrete && (
        <mesh receiveShadow>
          <boxGeometry args={[geometry.concrete.length, geometry.concrete.height, geometry.concrete.width]} />
          <meshPhysicalMaterial color="#d7dde2" transparent opacity={display.concreteOpacity} roughness={0.82} metalness={0} depthWrite={false} />
          {display.showWireframe && <Edges color="#64748b" threshold={15} />}
        </mesh>
      )}

      {!display.showConcrete && display.showWireframe && (
        <mesh>
          <boxGeometry args={[geometry.concrete.length, geometry.concrete.height, geometry.concrete.width]} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {display.showStirrups && geometry.stirrups.map((stirrup) => <Stirrup key={stirrup.id} stirrup={stirrup} />)}

      {visibleBars.map((bar) => (
        <LongitudinalBar key={bar.id} bar={bar} />
      ))}

      <Line
        points={[
          [-geometry.concrete.length / 2, -geometry.concrete.height / 2 - 0.08, -geometry.concrete.width / 2],
          [geometry.concrete.length / 2, -geometry.concrete.height / 2 - 0.08, -geometry.concrete.width / 2],
        ]}
        color="#38bdf8"
        lineWidth={2}
      />
    </group>
  );
}
