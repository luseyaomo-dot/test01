import { Environment, Grid, OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnnotationDisplay, BeamGeometryData, ComponentType, DisplayOptions, FrameForces, FrameParameters, MechanicsDisplayOptions } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { BeamModel } from './BeamModel';
import { SceneAnnotations } from './SceneAnnotations';

export type ViewMode = 'iso' | 'front' | 'top' | 'side';

type BeamSceneProps = {
  geometry: BeamGeometryData;
  display: DisplayOptions;
  componentType?: ComponentType;
  frame?: FrameParameters;
  showAnnotations?: boolean;
  viewMode?: ViewMode;
  forces?: FrameForces;
  mechanicsDisplay?: MechanicsDisplayOptions;
  annotationDisplay?: AnnotationDisplay;
};

const computeCameraPosition = (mode: ViewMode, dist: number): [number, number, number] => {
  switch (mode) {
    case 'front':
      return [0, 0, dist * 1.1];
    case 'top':
      return [0, dist * 1.2, 0.001];
    case 'side':
      return [dist * 1.1, 0, 0];
    case 'iso':
    default:
      return [dist * 0.9, dist * 0.55, dist * 0.7];
  }
};

export function BeamScene({ geometry, display, componentType, frame, showAnnotations = true, viewMode = 'iso', forces, mechanicsDisplay, annotationDisplay }: BeamSceneProps) {
  const isMobile = useIsMobile();
  const maxDim = Math.max(geometry.bounds.length, geometry.bounds.height, geometry.bounds.width);
  const camDist = Math.max(maxDim * (isMobile ? 1.85 : 1.6), 4);
  const gridSize = Math.max(maxDim * 3, 12);
  const camPosition = computeCameraPosition(viewMode, camDist);
  return (
    <Canvas
      shadows={!isMobile}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      gl={{ antialias: true }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => { gl.domElement.style.touchAction = 'none'; }}
    >
      <PerspectiveCamera makeDefault position={camPosition} fov={42} />
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={isMobile ? 1.0 : 0.7} />
      <directionalLight position={[camDist, camDist * 1.2, camDist]} intensity={isMobile ? 1.4 : 1.8} castShadow={!isMobile} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      {isMobile && <directionalLight position={[-camDist, camDist * 0.6, -camDist]} intensity={0.6} />}
      <BeamModel geometry={geometry} display={display} forces={forces} mechanicsDisplay={mechanicsDisplay} />
      {showAnnotations && componentType === 'frame' && frame && <SceneAnnotations frame={frame} display={annotationDisplay} />}
      <Grid position={[0, -geometry.bounds.height / 2 - 0.12, 0]} args={[gridSize, gridSize]} cellSize={0.25} cellThickness={0.5} cellColor="#334155" sectionSize={1} sectionThickness={1.2} sectionColor="#64748b" fadeDistance={gridSize} fadeStrength={1.2} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={maxDim * 6}
        rotateSpeed={isMobile ? 0.65 : 1.0}
        zoomSpeed={isMobile ? 0.9 : 1.0}
        panSpeed={isMobile ? 0.8 : 1.0}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />
      {!isMobile && <Environment preset="city" />}
      {!isMobile && <Stats />}
    </Canvas>
  );
}
