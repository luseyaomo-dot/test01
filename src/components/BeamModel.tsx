import { Edges, Line } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import type { BeamGeometryData, DisplayOptions, FrameForces, MechanicsDisplayOptions, RebarHook, RebarLine, StirrupPath } from '../types';

const rebarColors = {
  top: '#b82922',
  bottom: '#d75a24',
  waist: '#f0a02f',
};

const tensionColor = '#facc15';      // 受拉高亮: 亮黄
const compressionColor = '#3b82f6';  // 受压高亮: 蓝

const mmToMeters = (value: number) => value * 0.001;

type BeamModelProps = {
  geometry: BeamGeometryData;
  display: DisplayOptions;
  forces?: FrameForces;
  mechanicsDisplay?: MechanicsDisplayOptions;
};

type LongitudinalBarProps = {
  bar: RebarLine;
  color?: string;
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

function LongitudinalBar({ bar, color }: LongitudinalBarProps) {
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

  const finalColor = color ?? rebarColors[bar.category];
  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 28]} />
      <meshStandardMaterial color={finalColor} metalness={0.25} roughness={0.34} emissive={color ? finalColor : '#000'} emissiveIntensity={color ? 0.35 : 0} />
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
  const mainColor = stirrup.kind === 'joint' ? '#7c3aed' : stirrup.kind === 'outer' ? '#7f1d1d' : '#9a3412';
  const hookColor = stirrup.kind === 'joint' ? '#a78bfa' : stirrup.kind === 'outer' ? '#dc2626' : '#f97316';
  return (
    <group>
      <TubePath points={stirrup.points} diameter={stirrup.diameter} color={mainColor} radialSegments={stirrup.kind === 'outer' || stirrup.kind === 'joint' ? 14 : 12} />
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

export function BeamModel({ geometry, display, forces, mechanicsDisplay }: BeamModelProps) {
  const visibleBars = geometry.rebars.filter((bar) => {
    if (bar.category === 'top') return display.showTopBars;
    if (bar.category === 'bottom') return display.showBottomBars;
    return display.showWaistBars;
  });

  const highlightOn = !!(forces && mechanicsDisplay && mechanicsDisplay.highlightTension);
  const beamHasHogging = !!(forces && forces.beam.M_max_neg > 0.5);
  const beamHasSagging = !!(forces && forces.beam.M_max_pos > 0.5);
  const colHasMoment = !!(forces && Math.max(forces.column.left.M_max, forces.column.right.M_max) > 0.5);

  const highlightFor = (bar: RebarLine): string | undefined => {
    if (!highlightOn) return undefined;
    if (bar.id.startsWith('beam-')) {
      if (bar.category === 'top' && beamHasHogging) return tensionColor;
      if (bar.category === 'bottom' && beamHasSagging) return tensionColor;
    } else if (bar.id.startsWith('col-') && colHasMoment) {
      // 简化: 角筋统一标记为受拉/压区可能存在的钢筋, 用蓝色提示压力主导
      if (bar.id.includes('corner')) return compressionColor;
    }
    return undefined;
  };

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
        .filter((stirrup) => stirrup.kind === 'outer' || stirrup.kind === 'joint' || display.showInnerStirrups)
        .map((stirrup) => <Stirrup key={stirrup.id} stirrup={stirrup} />)}

      {visibleBars.map((bar) => (
        <LongitudinalBar key={bar.id} bar={bar} color={highlightFor(bar)} />
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
