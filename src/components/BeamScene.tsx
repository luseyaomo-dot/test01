import { Environment, Grid, OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { BeamGeometryData, ComponentType, DisplayOptions, FrameParameters } from '../types';
import { BeamModel } from './BeamModel';
import { SceneAnnotations } from './SceneAnnotations';

type BeamSceneProps = {
  geometry: BeamGeometryData;
  display: DisplayOptions;
  componentType?: ComponentType;
  frame?: FrameParameters;
  showAnnotations?: boolean;
};

export function BeamScene({ geometry, display, componentType, frame, showAnnotations = true }: BeamSceneProps) {
  const maxDim = Math.max(geometry.bounds.length, geometry.bounds.height, geometry.bounds.width);
  const camDist = Math.max(maxDim * 1.6, 4);
  const gridSize = Math.max(maxDim * 3, 12);
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[camDist * 0.9, camDist * 0.55, camDist * 0.7]} fov={42} />
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[camDist, camDist * 1.2, camDist]} intensity={1.8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <BeamModel geometry={geometry} display={display} />
      {showAnnotations && componentType === 'frame' && frame && <SceneAnnotations frame={frame} />}
      <Grid position={[0, -geometry.bounds.height / 2 - 0.12, 0]} args={[gridSize, gridSize]} cellSize={0.25} cellThickness={0.5} cellColor="#334155" sectionSize={1} sectionThickness={1.2} sectionColor="#64748b" fadeDistance={gridSize} fadeStrength={1.2} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={1.2} maxDistance={maxDim * 6} />
      <Environment preset="city" />
      <Stats />
    </Canvas>
  );
}
