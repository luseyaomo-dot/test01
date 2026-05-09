import { Environment, Grid, OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { BeamGeometryData, DisplayOptions } from '../types';
import { BeamModel } from './BeamModel';

type BeamSceneProps = {
  geometry: BeamGeometryData;
  display: DisplayOptions;
};

export function BeamScene({ geometry, display }: BeamSceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <PerspectiveCamera makeDefault position={[5.5, 2.6, 3.6]} fov={42} />
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <BeamModel geometry={geometry} display={display} />
      <Grid position={[0, -geometry.concrete.height / 2 - 0.12, 0]} args={[12, 12]} cellSize={0.25} cellThickness={0.5} cellColor="#334155" sectionSize={1} sectionThickness={1.2} sectionColor="#64748b" fadeDistance={14} fadeStrength={1.2} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={1.2} maxDistance={18} />
      <Environment preset="city" />
      <Stats />
    </Canvas>
  );
}
