import { SURROUNDING_BUILDINGS } from '../constants/worldLayout';
import type { BuildingSpec } from '../world.types';

interface SurroundingBuildingsProps {
  enableShadows?: boolean;
}

function ArchitecturalBuilding({
  spec,
  enableShadows,
}: {
  spec: BuildingSpec;
  enableShadows: boolean;
}) {
  const [width, height, depth] = spec.dimensions;
  const floorCount = Math.max(2, Math.floor(height / 3.4));
  const floorBands = Array.from({ length: floorCount }, (_, idx) => idx);

  return (
    <group
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY ?? 0, 0]}
    >
      {/* Concrete plinth foundation */}
      <mesh
        position={[0, 0.25, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width + 1.2, 0.5, depth + 1.2]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>

      {/* Main structural volume */}
      <mesh
        position={[0, height / 2 + 0.5, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={spec.primaryColor}
          roughness={0.7}
          metalness={0.25}
        />
      </mesh>

      {/* Horizontal glazing & concrete spandrel bands */}
      {floorBands.map((floorIdx) => {
        const bandY = 2.2 + floorIdx * 3.2;
        if (bandY + 1.2 > height) return null;
        return (
          <group key={`${spec.id}-floor-${floorIdx}`}>
            {/* Glazed window band */}
            <mesh position={[0, bandY, 0]}>
              <boxGeometry args={[width + 0.14, 1.45, depth + 0.14]} />
              <meshStandardMaterial
                color={spec.glassColor}
                roughness={0.18}
                metalness={0.82}
              />
            </mesh>
            {/* Concrete slab band */}
            <mesh position={[0, bandY - 0.9, 0]}>
              <boxGeometry args={[width + 0.28, 0.32, depth + 0.28]} />
              <meshStandardMaterial
                color={spec.secondaryColor}
                roughness={0.75}
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
        <meshStandardMaterial color={spec.secondaryColor} roughness={0.65} />
      </mesh>

      <mesh position={[0, height + 0.35, 0]}>
        <boxGeometry args={[width + 0.56, 0.16, depth + 0.56]} />
        <meshStandardMaterial
          color={spec.accentColor}
          emissive={spec.accentColor}
          emissiveIntensity={0.45}
        />
      </mesh>

      {/* Test Centre Entrance Canopy on the North-Central main building */}
      {spec.style === 'test-centre' && (
        <group position={[0, 0, depth / 2 + 1.8]}>
          {/* Glass & steel entrance canopy */}
          <mesh position={[0, 3.8, 0]} castShadow={enableShadows}>
            <boxGeometry args={[14, 0.35, 3.6]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.3}
              metalness={0.75}
            />
          </mesh>
          {/* Blue accent fascia on canopy */}
          <mesh position={[0, 3.8, 1.82]}>
            <boxGeometry args={[14.05, 0.22, 0.06]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.75}
            />
          </mesh>
          {/* Canopy support pillars */}
          {[-5.8, 5.8].map((pillarX, idx) => (
            <mesh
              key={`canopy-pillar-${idx}`}
              position={[pillarX, 1.9, 1.2]}
              castShadow={enableShadows}
            >
              <cylinderGeometry args={[0.18, 0.18, 3.8, 12]} />
              <meshStandardMaterial
                color="#94a3b8"
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Renders the surrounding buildings and perimeter walls around the parking facility.
 */
export function SurroundingBuildings({
  enableShadows = true,
}: SurroundingBuildingsProps) {
  return (
    <group name="surrounding-buildings">
      {SURROUNDING_BUILDINGS.map((spec) => (
        <ArchitecturalBuilding
          key={spec.id}
          spec={spec}
          enableShadows={enableShadows}
        />
      ))}
    </group>
  );
}
