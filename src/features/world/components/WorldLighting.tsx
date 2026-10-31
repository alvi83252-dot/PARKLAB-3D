import { useCustomization } from '../../../config/customization.config';

interface WorldLightingProps {
  enableShadows?: boolean;
}

/**
 * Dynamic themed lighting & atmospheric sky setup for the PARKLAB 3D environment.
 * Adapts sky backdrop, distance haze, hemisphere bounce, directional sun/neon light,
 * and celestial disc across all 6 Environment Themes (UK Test Centre, Wooden Playset,
 * LEGO Brick City, 2099 Synthwave Neon Grid, Sugar Rush Candy Park, SpaceX Mars Colony).
 */
export function WorldLighting({ enableShadows = true }: WorldLightingProps) {
  const { themeSpec } = useCustomization();
  const isCyber = themeSpec.id === 'cyber-neon-city';
  const isMars = themeSpec.id === 'mars-colony';

  return (
    <group name={`world-lighting-and-atmosphere-${themeSpec.id}`}>
      {/* Dynamic themed sky backdrop and distance haze */}
      <color attach="background" args={[themeSpec.skyColor]} />
      <fog
        attach="fog"
        args={[themeSpec.fogColor, themeSpec.fogNear, themeSpec.fogFar]}
      />

      {/* Base ambient illumination */}
      <ambientLight
        intensity={themeSpec.ambientIntensity}
        color={themeSpec.ambientColor}
      />

      {/* Sky-to-ground hemisphere bounce light */}
      <hemisphereLight
        args={[
          themeSpec.hemiSkyColor,
          themeSpec.hemiGroundColor,
          themeSpec.hemiIntensity,
        ]}
        position={[0, 60, 0]}
      />

      {/* Primary directional sunlight / synthwave light with tuned shadow frustum */}
      <directionalLight
        position={[48, 68, 36]}
        intensity={themeSpec.sunIntensity}
        color={themeSpec.sunColor}
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

      {/* Secondary fill light */}
      <directionalLight
        position={[-40, 32, -30]}
        intensity={isCyber ? 0.85 : 0.38}
        color={isCyber ? '#00f5d4' : isMars ? '#fdba74' : '#93c5fd'}
      />

      {/* Visual sun / synthwave / Martian sun disc */}
      <mesh position={[96, isCyber ? 78 : 130, 72]}>
        <sphereGeometry args={[isCyber ? 14 : 6.2, 24, 24]} />
        <meshBasicMaterial color={themeSpec.sunDiscColor} fog={false} />
      </mesh>
    </group>
  );
}
