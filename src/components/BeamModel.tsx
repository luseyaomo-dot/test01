import { Edges, Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { BeamGeometryData, DisplayOptions, RebarHook, RebarLine, StirrupPath } from '../types';

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

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function LongitudinalBar({ bar }: LongitudinalBarProps) {
  const { radius, length, position, quaternion } = useMemo(() => {
    const start = new THREE.Vector3(...bar.start);
    const end = new THREE.Vector3(...bar.end);
    const dir = end.clone().sub(start);
    const len = dir.length();
    const center = start.clone().add(end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir.normalize());
    return {
      radius: mmToMeters(bar.diameter) / 2,
      length: len,
      position: center.toArray() as [number, number, number],
      quaternion: quat,
    };
  }, [bar]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
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
  const mainColor = stirrup.kind === 'outer' ? '#7f1d1d' : '#9a3412';
  const hookColor = stirrup.kind === 'outer' ? '#dc2626' : '#f97316';
  return (
    <group>
      <TubePath points={stirrup.points} diameter={stirrup.diameter} color={mainColor} radialSegments={stirrup.kind === 'outer' ? 14 : 12} />
      {stirrup.hooks.map((hook, index) => (
        <TubePath key={`${stirrup.id}-hook-${index}`} points={hook} diameter={stirrup.diameter} color={hookColor} radialSegments={10} />
      ))}
    </group>
  );
}

type RebarHookProps = { hook: RebarHook };
function RebarEndHook({ hook }: RebarHookProps) {
  return <TubePath points={hook.points} diameter={hook.diameter} color={rebarColors[hook.category]} radialSegments={14} />;
}

export function BeamModel({ geometry, display }: BeamModelProps) {
  const visibleBars = geometry.rebars.filter((bar) => {
    if (bar.category === 'top') return display.showTopBars;
    if (bar.category === 'bottom') return display.showBottomBars;
    return display.showWaistBars;
  });

  return (
    <group>
      {display.showConcrete && geometry.concretes.map((box) => (
        <mesh key={`concrete-${box.id}`} position={box.position} receiveShadow>
          <boxGeometry args={box.size} />
          <meshPhysicalMaterial color="#d7dde2" transparent opacity={display.concreteOpacity} roughness={0.82} metalness={0} depthWrite={false} />
          {display.showWireframe && <Edges color="#64748b" threshold={15} />}
        </mesh>
      ))}

      {!display.showConcrete && display.showWireframe && geometry.concretes.map((box) => (
        <mesh key={`wf-${box.id}`} position={box.position}>
          <boxGeometry args={box.size} />
          <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.5} />
        </mesh>
      ))}

      {display.showStirrups && geometry.stirrups
        .filter((stirrup) => stirrup.kind === 'outer' || display.showInnerStirrups)
        .map((stirrup) => <Stirrup key={stirrup.id} stirrup={stirrup} />)}

      {visibleBars.map((bar) => (
        <LongitudinalBar key={bar.id} bar={bar} />
      ))}

      {geometry.rebarHooks
        .filter((hook) => (hook.category === 'top' ? display.showTopBars : display.showBottomBars))
        .map((hook) => (
          <RebarEndHook key={hook.id} hook={hook} />
        ))}

      <Line
        points={[
          [-geometry.bounds.length / 2, -geometry.bounds.height / 2 - 0.08, -geometry.bounds.width / 2],
          [geometry.bounds.length / 2, -geometry.bounds.height / 2 - 0.08, -geometry.bounds.width / 2],
        ]}
        color="#38bdf8"
        lineWidth={2}
      />
    </group>
  );
}
