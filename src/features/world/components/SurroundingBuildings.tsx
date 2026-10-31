import { SURROUNDING_BUILDINGS } from '../constants/worldLayout';
import type { BuildingSpec } from '../world.types';
import {
  useCustomization,
  type EnvironmentThemeDefinition,
} from '../../../config/customization.config';

interface SurroundingBuildingsProps {
  enableShadows?: boolean;
}

function ArchitecturalBuilding({
  spec,
  index,
  themeSpec,
  enableShadows,
}: {
  spec: BuildingSpec;
  index: number;
  themeSpec: EnvironmentThemeDefinition;
  enableShadows: boolean;
}) {
  const [width, height, depth] = spec.dimensions;
  const floorCount = Math.max(2, Math.floor(height / 3.4));
  const floorBands = Array.from({ length: floorCount }, (_, idx) => idx);

  const isDefault = themeSpec.id === 'uk-test-centre';
  const isWooden = themeSpec.id === 'wooden-playset';
  const isLego = themeSpec.id === 'lego-brick-city';
  const isCyber = themeSpec.id === 'cyber-neon-city';
  const isCandy = themeSpec.id === 'candy-wonderland';

  const primaryColor = isDefault
    ? spec.primaryColor
    : themeSpec.buildingPalette[index % themeSpec.buildingPalette.length];
  const secondaryColor = isDefault
    ? spec.secondaryColor
    : themeSpec.buildingPalette[(index + 1) % themeSpec.buildingPalette.length];
  const glassColor = isDefault ? spec.glassColor : themeSpec.buildingGlassColor;
  const accentColor = isDefault
    ? spec.accentColor
    : themeSpec.buildingAccentColor;

  const studCols = [-width * 0.3, 0, width * 0.3];
  const studRows = [-depth * 0.25, depth * 0.25];

  return (
    <group
      name={`${spec.id}-${themeSpec.id}`}
      position={spec.position}
      rotation={[0, spec.rotationY ?? 0, 0]}
    >
      {/* Plinth foundation */}
      <mesh
        position={[0, 0.25, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width + 1.2, 0.5, depth + 1.2]} />
        <meshStandardMaterial
          color={isLego ? '#16a34a' : isWooden ? '#78350f' : '#334155'}
          roughness={themeSpec.surfaceRoughness}
        />
      </mesh>

      {/* Main structural volume */}
      <mesh
        position={[0, height / 2 + 0.5, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={primaryColor}
          roughness={isLego ? 0.16 : isWooden ? 0.68 : 0.7}
          metalness={isCyber ? 0.78 : isWooden || isLego ? 0.06 : 0.25}
        />
      </mesh>

      {/* Horizontal glazing & spandrel bands */}
      {floorBands.map((floorIdx) => {
        const bandY = 2.2 + floorIdx * 3.2;
        if (bandY + 1.2 > height) return null;
        return (
          <group key={`${spec.id}-floor-${floorIdx}`}>
            {/* Glazed window band */}
            <mesh position={[0, bandY, 0]}>
              <boxGeometry args={[width + 0.14, 1.45, depth + 0.14]} />
              <meshStandardMaterial
                color={glassColor}
                emissive={isCyber ? glassColor : '#000000'}
                emissiveIntensity={isCyber ? 1.15 : 0}
                roughness={isWooden ? 0.55 : 0.18}
                metalness={isWooden ? 0.1 : 0.82}
              />
            </mesh>
            {/* Slab / brick band */}
            <mesh position={[0, bandY - 0.9, 0]}>
              <boxGeometry args={[width + 0.28, 0.32, depth + 0.28]} />
              <meshStandardMaterial
                color={secondaryColor}
                roughness={isLego ? 0.18 : 0.75}
                metalness={0.15}
              />
            </mesh>
          </group>
        );
      })}

      {/* Roof parapet and illuminated architectural accent strip */}
      <mesh
        position={[0, height + 0.75, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width + 0.5, 0.5, depth + 0.5]} />
        <meshStandardMaterial
          color={isCandy ? '#fff1f2' : secondaryColor}
          roughness={0.65}
        />
      </mesh>

      <mesh position={[0, height + 0.35, 0]}>
        <boxGeometry args={[width + 0.56, 0.16, depth + 0.56]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={isCyber ? 2.2 : 0.45}
        />
      </mesh>

      {/* LEGO BRICK CITY: Giant 3D Interlocking Roof Studs on every building */}
      {isLego && (
        <group position={[0, height + 1.25, 0]} name="lego-building-roof-studs">
          {studCols.map((sx, cIdx) =>
            studRows.map((sz, rIdx) => (
              <mesh
                key={`roof-stud-${cIdx}-${rIdx}`}
                position={[sx, 0, sz]}
                castShadow={enableShadows}
              >
                <cylinderGeometry args={[1.25, 1.25, 0.55, 20]} />
                <meshStandardMaterial
                  color={primaryColor}
                  roughness={0.15}
                  metalness={0.08}
                />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* WOODEN PLAYSET: Pitched Carved Beechwood Toy Roof Gable */}
      {isWooden && (
        <mesh
          position={[0, height + 2.4, 0]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow={enableShadows}
        >
          <coneGeometry args={[Math.min(width, depth) * 0.62, 3.2, 4]} />
          <meshStandardMaterial
            color="#9a3412"
            roughness={0.7}
            metalness={0.04}
          />
        </mesh>
      )}

      {/* Test Centre Entrance Canopy on the North-Central main building */}
      {spec.style === 'test-centre' && (
        <group position={[0, 0, depth / 2 + 1.8]}>
          <mesh position={[0, 3.8, 0]} castShadow={enableShadows}>
            <boxGeometry args={[14, 0.35, 3.6]} />
            <meshStandardMaterial
              color={isWooden ? '#78350f' : isLego ? '#ef4444' : '#0f172a'}
              roughness={0.3}
              metalness={isWooden || isLego ? 0.1 : 0.75}
            />
          </mesh>
          <mesh position={[0, 3.8, 1.82]}>
            <boxGeometry args={[14.05, 0.22, 0.06]} />
            <meshStandardMaterial
              color={accentColor}
              emissive={accentColor}
              emissiveIntensity={0.85}
            />
          </mesh>
          {[-5.8, 5.8].map((pillarX, idx) => (
            <mesh
              key={`canopy-pillar-${idx}`}
              position={[pillarX, 1.9, 1.2]}
              castShadow={enableShadows}
            >
              <cylinderGeometry args={[0.18, 0.18, 3.8, 12]} />
              <meshStandardMaterial
                color={isWooden ? '#deb887' : isLego ? '#facc15' : '#94a3b8'}
                roughness={0.3}
                metalness={isWooden || isLego ? 0.1 : 0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Renders the surrounding buildings and perimeter walls around the parking facility,
 * dynamically adapting to the active 3D Environment Theme.
 */
export function SurroundingBuildings({
  enableShadows = true,
}: SurroundingBuildingsProps) {
  const { themeSpec } = useCustomization();

  return (
    <group name="surrounding-buildings">
      {SURROUNDING_BUILDINGS.map((spec, index) => (
        <ArchitecturalBuilding
          key={spec.id}
          spec={spec}
          index={index}
          themeSpec={themeSpec}
          enableShadows={enableShadows}
        />
      ))}
    </group>
  );
}
