import {
  STREETLIGHTS,
  TRAFFIC_SIGNS,
  TREE_PLANTERS,
} from '../constants/worldLayout';
import type {
  StreetlightSpec,
  TrafficSignSpec,
  TreePlanterSpec,
} from '../world.types';

interface StreetFurnitureProps {
  enableShadows?: boolean;
}

/**
 * UK Road & Traffic Sign (Parking "P", Speed Limit 10, Give Way triangle, One-Way, EV Bay)
 */
function UKTrafficSign({
  spec,
  enableShadows,
}: {
  spec: TrafficSignSpec;
  enableShadows: boolean;
}) {
  return (
    <group
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
    >
      {/* Galvanised steel sign post */}
      <mesh position={[0, 1.35, 0]} castShadow={enableShadows}>
        <cylinderGeometry args={[0.045, 0.05, 2.7, 10]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.75} />
      </mesh>

      {/* Sign face by kind */}
      {spec.kind === 'speed-limit-10' && (
        <group position={[0, 2.45, 0.06]}>
          {/* Red circular border */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={enableShadows}>
            <cylinderGeometry args={[0.38, 0.38, 0.04, 24]} />
            <meshStandardMaterial color="#dc2626" roughness={0.35} />
          </mesh>
          {/* White inner roundel */}
          <mesh
            position={[0, 0, 0.015]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.27, 0.27, 0.03, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
          {/* "10" numeral bars */}
          <mesh position={[-0.08, 0, 0.035]}>
            <boxGeometry args={[0.045, 0.22, 0.015]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.07, 0, 0.035]}>
            <boxGeometry args={[0.13, 0.22, 0.015]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.07, 0, 0.042]}>
            <boxGeometry args={[0.055, 0.13, 0.015]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}

      {spec.kind === 'give-way' && (
        <group position={[0, 2.45, 0.06]}>
          {/* Inverted red triangle */}
          <mesh
            rotation={[Math.PI / 2, Math.PI, 0]}
            castShadow={enableShadows}
          >
            <cylinderGeometry args={[0.42, 0.42, 0.04, 3]} />
            <meshStandardMaterial color="#dc2626" roughness={0.35} />
          </mesh>
          {/* White inner triangle */}
          <mesh
            position={[0, 0, 0.015]}
            rotation={[Math.PI / 2, Math.PI, 0]}
          >
            <cylinderGeometry args={[0.29, 0.29, 0.03, 3]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
        </group>
      )}

      {(spec.kind === 'parking-zone' ||
        spec.kind === 'one-way-arrow' ||
        spec.kind === 'ev-charging') && (
        <group position={[0, 2.45, 0.06]}>
          {/* White outer border plate */}
          <mesh castShadow={enableShadows}>
            <boxGeometry args={[0.68, 0.68, 0.04]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.35} />
          </mesh>
          {/* UK Information Blue inner plate */}
          <mesh position={[0, 0, 0.015]}>
            <boxGeometry args={[0.58, 0.58, 0.03]} />
            <meshStandardMaterial
              color={spec.kind === 'ev-charging' ? '#0284c7' : '#1d4ed8'}
              roughness={0.35}
            />
          </mesh>
          {/* White "P" or directional symbol */}
          <mesh position={[-0.08, 0, 0.035]}>
            <boxGeometry args={[0.07, 0.34, 0.015]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.04, 0.08, 0.035]}>
            <boxGeometry args={[0.18, 0.18, 0.015]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Modern Architectural LED Streetlight
 */
function StreetlightColumn({
  spec,
  enableShadows,
}: {
  spec: StreetlightSpec;
  enableShadows: boolean;
}) {
  return (
    <group
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
    >
      {/* Base plinth */}
      <mesh position={[0, 0.35, 0]} castShadow={enableShadows}>
        <cylinderGeometry args={[0.18, 0.24, 0.7, 12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Tapered vertical column */}
      <mesh position={[0, 4.1, 0]} castShadow={enableShadows}>
        <cylinderGeometry args={[0.08, 0.14, 7.5, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.7} />
      </mesh>

      {/* Primary luminaire arm (+Z local forward) */}
      <mesh
        position={[0, 7.75, 0.85]}
        rotation={[0.2, 0, 0]}
        castShadow={enableShadows}
      >
        <boxGeometry args={[0.12, 0.1, 1.8]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.75} />
      </mesh>

      {/* LED lamp head */}
      <mesh position={[0, 7.88, 1.65]}>
        <boxGeometry args={[0.38, 0.08, 0.65]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef08a"
          emissiveIntensity={0.95}
        />
      </mesh>

      {/* Optional twin arm for wide avenue columns */}
      {spec.twinArm && (
        <>
          <mesh
            position={[0, 7.75, -0.85]}
            rotation={[-0.2, 0, 0]}
            castShadow={enableShadows}
          >
            <boxGeometry args={[0.12, 0.1, 1.8]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.4}
              metalness={0.75}
            />
          </mesh>
          <mesh position={[0, 7.88, -1.65]}>
            <boxGeometry args={[0.38, 0.08, 0.65]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#fef08a"
              emissiveIntensity={0.95}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Landscaped Tree & Stone Planter Box
 */
function TreePlanter({
  spec,
  enableShadows,
}: {
  spec: TreePlanterSpec;
  enableShadows: boolean;
}) {
  const scale = spec.scale ?? 1;
  return (
    <group
      name={spec.id}
      position={spec.position}
      scale={[scale, scale, scale]}
    >
      {/* Concrete planter bed */}
      <mesh
        position={[0, 0.28, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[2.4, 0.42, 2.4]} />
        <meshStandardMaterial color="#64748b" roughness={0.85} />
      </mesh>
      {/* Topsoil */}
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[2.1, 0.06, 2.1]} />
        <meshStandardMaterial color="#3f2e21" roughness={0.95} />
      </mesh>
      {/* Tree trunk */}
      <mesh position={[0, 1.85, 0]} castShadow={enableShadows}>
        <cylinderGeometry args={[0.18, 0.26, 2.8, 10]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      {/* Layered foliage canopy */}
      {spec.treeType === 'conical' ? (
        <>
          <mesh position={[0, 3.6, 0]} castShadow={enableShadows}>
            <coneGeometry args={[1.65, 2.8, 12]} />
            <meshStandardMaterial color="#15803d" roughness={0.82} />
          </mesh>
          <mesh position={[0, 4.9, 0]} castShadow={enableShadows}>
            <coneGeometry args={[1.2, 2.2, 12]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 3.8, 0]} castShadow={enableShadows}>
            <dodecahedronGeometry args={[1.65, 1]} />
            <meshStandardMaterial color="#15803d" roughness={0.82} />
          </mesh>
          <mesh position={[0.45, 4.5, -0.25]} castShadow={enableShadows}>
            <dodecahedronGeometry args={[1.15, 1]} />
            <meshStandardMaterial color="#16a34a" roughness={0.8} />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Renders UK traffic signs, LED streetlights, EV Supercharger pedestals,
 * landscaped trees, and safety bollards around the parking facility.
 */
export function StreetFurniture({
  enableShadows = true,
}: StreetFurnitureProps) {
  return (
    <group name="street-furniture-and-signage">
      {/* UK Road & Traffic Signs */}
      {TRAFFIC_SIGNS.map((spec) => (
        <UKTrafficSign
          key={spec.id}
          spec={spec}
          enableShadows={enableShadows}
        />
      ))}

      {/* Architectural LED Streetlights */}
      {STREETLIGHTS.map((spec) => (
        <StreetlightColumn
          key={spec.id}
          spec={spec}
          enableShadows={enableShadows}
        />
      ))}

      {/* Landscaped Trees & Planters */}
      {TREE_PLANTERS.map((spec) => (
        <TreePlanter
          key={spec.id}
          spec={spec}
          enableShadows={enableShadows}
        />
      ))}

      {/* EV Supercharger Pedestals next to the parked Tesla Roadster at [-39.6, 0, -14.0] */}
      {[-15.2, -12.8].map((zCoord, idx) => (
        <group
          key={`supercharger-stall-${idx}`}
          position={[-39.6, 0, zCoord]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <mesh position={[0, 1.05, 0]} castShadow={enableShadows}>
            <boxGeometry args={[0.58, 1.9, 0.24]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.25}
              metalness={0.5}
            />
          </mesh>
          <mesh position={[0, 1.15, 0.02]}>
            <boxGeometry args={[0.32, 1.25, 0.22]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.65, 0.13]}>
            <boxGeometry args={[0.26, 0.08, 0.02]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.85}
            />
          </mesh>
        </group>
      ))}

      {/* Perimeter Illuminated Bollards along the North Test Centre Walkway */}
      {[-16, -10, -4, 4, 10, 16].map((xPos) => (
        <group key={`bollard-north-${xPos}`} position={[xPos, 0, -40.8]}>
          <mesh position={[0, 0.48, 0]} castShadow={enableShadows}>
            <cylinderGeometry args={[0.09, 0.1, 0.96, 12]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.4}
              metalness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <cylinderGeometry args={[0.094, 0.094, 0.1, 12]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0284c7"
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
