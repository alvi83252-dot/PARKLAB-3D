interface WorldLightingProps {
  enableShadows?: boolean;
}

/**
 * Daytime lighting & atmospheric sky setup for the PARKLAB 3D environment.
 * Combines hemisphere sky-ground bounce, directional sunlight with shadows,
 * cool sky fill light, and distant atmospheric horizon fog.
 */
export function WorldLighting({ enableShadows = true }: WorldLightingProps) {
  return (
    <group name="world-lighting-and-atmosphere">
      {/* Crisp daytime sky backdrop and distance haze */}
      <color attach="background" args={['#b8d4f0']} />
      <fog attach="fog" args={['#b8d4f0', 95, 235]} />

      {/* Base ambient illumination */}
      <ambientLight intensity={0.55} color="#f8fafc" />

      {/* Sky-to-asphalt hemisphere bounce light */}
      <hemisphereLight
        args={['#bae6fd', '#334155', 0.58]}
        position={[0, 60, 0]}
      />

      {/* Primary directional sunlight with tuned shadow frustum */}
      <directionalLight
        position={[48, 68, 36]}
        intensity={1.68}
        color="#fffbeb"
        castShadow={enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={185}
        shadow-camera-left={-58}
        shadow-camera-right={58}
        shadow-camera-top={58}
        shadow-camera-bottom={-58}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      {/* Cool anti-solar sky fill light to soften dark shadow sides */}
      <directionalLight
        position={[-40, 32, -30]}
        intensity={0.38}
        color="#93c5fd"
      />

      {/* Visual sun disc high in the daytime sky */}
      <mesh position={[96, 130, 72]}>
        <sphereGeometry args={[5.5, 16, 16]} />
        <meshBasicMaterial color="#fef9c3" fog={false} />
      </mesh>
    </group>
  );
}
