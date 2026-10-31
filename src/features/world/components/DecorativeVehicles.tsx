import { DECORATIVE_PARKED_VEHICLES } from '../constants/worldLayout';
import type { DecorativeVehicleSpec } from '../world.types';

interface DecorativeVehiclesProps {
  enableShadows?: boolean;
}

interface SingleDecorativeVehicleProps {
  spec: DecorativeVehicleSpec;
  enableShadows: boolean;
}

/**
 * Sporty multi-spoke wheel assembly used on decorative parked vehicles.
 */
function DecorativeWheel({
  position,
  radius = 0.34,
  width = 0.24,
  isSport = false,
  enableShadows,
}: {
  position: [number, number, number];
  radius?: number;
  width?: number;
  isSport?: boolean;
  enableShadows: boolean;
}) {
  return (
    <group position={position}>
      {/* Tyre */}
      <mesh
        rotation={[0, 0, Math.PI / 2]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <cylinderGeometry args={[radius, radius, width, 20]} />
        <meshStandardMaterial color="#111827" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Alloy rim */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry
          args={[radius * 0.68, radius * 0.68, width + 0.012, 16]}
        />
        <meshStandardMaterial
          color={isSport ? '#1e293b' : '#94a3b8'}
          roughness={0.25}
          metalness={0.82}
        />
      </mesh>
      {/* Performance red brake calliper on Roadster */}
      {isSport && (
        <mesh position={[0, radius * 0.32, 0.05]}>
          <boxGeometry args={[width + 0.018, 0.11, 0.14]} />
          <meshStandardMaterial color="#dc2626" roughness={0.35} metalness={0.5} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Recognisable New Tesla Roadster environmental model.
 * Features low-slung aerodynamic bodywork, tapered nose, swept glass canopy,
 * wide rear haunches, carbon rear diffuser, LED light blade, and sporty wheels.
 */
function DecorativeTeslaRoadster({
  spec,
  enableShadows,
}: SingleDecorativeVehicleProps) {
  const { length, width, height } = spec.dimensions;
  const halfW = width * 0.48;
  const wheelZ = length * 0.31;

  return (
    <group
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
    >
      {/* Lower carbon-fibre aerodynamic splitter & floorpan */}
      <mesh
        position={[0, 0.19, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.96, 0.12, length * 0.98]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Main low-slung sculpted Roadster lower body */}
      <mesh
        position={[0, 0.42, 0.05]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width, 0.42, length * 0.88]} />
        <meshStandardMaterial
          color={spec.bodyColor}
          roughness={0.18}
          metalness={0.78}
        />
      </mesh>

      {/* Tapered aerodynamic front nose hood (sloped toward -Z forward) */}
      <mesh
        position={[0, 0.38, -length * 0.34]}
        rotation={[0.16, 0, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.92, 0.32, length * 0.32]} />
        <meshStandardMaterial
          color={spec.bodyColor}
          roughness={0.16}
          metalness={0.8}
        />
      </mesh>

      {/* Muscular wide rear haunches (+Z rear) */}
      <mesh
        position={[0, 0.52, length * 0.28]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width * 1.02, 0.34, length * 0.38]} />
        <meshStandardMaterial
          color={spec.bodyColor}
          roughness={0.18}
          metalness={0.78}
        />
      </mesh>

      {/* Swept-back tinted panoramic glass canopy */}
      <mesh
        position={[0, height * 0.72, -0.02]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.76, height * 0.38, length * 0.48]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.08}
          metalness={0.92}
        />
      </mesh>

      {/* Sloped front windscreen plane */}
      <mesh
        position={[0, height * 0.68, -length * 0.22]}
        rotation={[0.52, 0, 0]}
        castShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.74, 0.08, length * 0.26]} />
        <meshStandardMaterial
          color="#0b1324"
          roughness={0.06}
          metalness={0.94}
        />
      </mesh>

      {/* Fastback rear glass deck */}
      <mesh
        position={[0, height * 0.69, length * 0.2]}
        rotation={[-0.42, 0, 0]}
        castShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.72, 0.08, length * 0.28]} />
        <meshStandardMaterial
          color="#0b1324"
          roughness={0.08}
          metalness={0.92}
        />
      </mesh>

      {/* Active carbon rear spoiler wing */}
      <mesh position={[0, 0.73, length * 0.45]} castShadow={enableShadows}>
        <boxGeometry args={[width * 0.88, 0.04, 0.22]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.75} />
      </mesh>

      {/* Futuristic sharp LED headlights (local -Z front) */}
      {[-width * 0.34, width * 0.34].map((xPos, idx) => (
        <mesh
          key={`roadster-headlight-${idx}`}
          position={[xPos, 0.42, -length * 0.485]}
        >
          <boxGeometry args={[0.34, 0.055, 0.05]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#bae6fd"
            emissiveIntensity={0.85}
          />
        </mesh>
      ))}

      {/* Full-width rear LED taillight strip (local +Z rear) */}
      <mesh position={[0, 0.56, length * 0.48]}>
        <boxGeometry args={[width * 0.88, 0.06, 0.04]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* UK Front (white) & Rear (yellow) registration plates */}
      <mesh position={[0, 0.26, -length * 0.492]}>
        <boxGeometry args={[0.52, 0.11, 0.02]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.36, length * 0.485]}>
        <boxGeometry args={[0.52, 0.11, 0.02]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>

      {/* Four low-profile performance wheels */}
      <DecorativeWheel
        position={[-halfW, 0.33, -wheelZ]}
        radius={0.33}
        width={0.26}
        isSport
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[halfW, 0.33, -wheelZ]}
        radius={0.33}
        width={0.26}
        isSport
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[-halfW, 0.35, wheelZ]}
        radius={0.35}
        width={0.28}
        isSport
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[halfW, 0.35, wheelZ]}
        radius={0.35}
        width={0.28}
        isSport
        enableShadows={enableShadows}
      />
    </group>
  );
}

/**
 * Standard decorative parked car (Hatchback, Executive Sedan, or Large SUV)
 */
function DecorativeStandardVehicle({
  spec,
  enableShadows,
}: SingleDecorativeVehicleProps) {
  const { length, width, height } = spec.dimensions;
  const isSuv = spec.kind === 'suv';
  const isHatchback = spec.kind === 'hatchback';

  const lowerBodyHeight = isSuv ? height * 0.52 : height * 0.46;
  const cabinHeight = height - lowerBodyHeight - 0.18;
  const cabinLength = isHatchback
    ? length * 0.56
    : isSuv
    ? length * 0.62
    : length * 0.48;
  const cabinOffsetZ = isHatchback ? length * 0.06 : isSuv ? length * 0.05 : 0;

  const wheelRadius = isSuv ? 0.38 : 0.32;
  const halfW = width * 0.47;
  const wheelZ = length * 0.31;

  return (
    <group
      name={spec.id}
      position={spec.position}
      rotation={[0, spec.rotationY, 0]}
    >
      {/* Main lower chassis body */}
      <mesh
        position={[0, 0.22 + lowerBodyHeight / 2, 0]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width, lowerBodyHeight, length]} />
        <meshStandardMaterial
          color={spec.bodyColor}
          roughness={0.32}
          metalness={0.58}
        />
      </mesh>

      {/* Upper cabin greenhouse */}
      <mesh
        position={[
          0,
          0.22 + lowerBodyHeight + cabinHeight / 2 - 0.02,
          cabinOffsetZ,
        ]}
        castShadow={enableShadows}
        receiveShadow={enableShadows}
      >
        <boxGeometry args={[width * 0.84, cabinHeight, cabinLength]} />
        <meshStandardMaterial
          color={spec.bodyColor}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Dark tinted window band around cabin */}
      <mesh
        position={[
          0,
          0.22 + lowerBodyHeight + cabinHeight * 0.46,
          cabinOffsetZ,
        ]}
      >
        <boxGeometry
          args={[width * 0.855, cabinHeight * 0.68, cabinLength * 0.92]}
        />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.12}
          metalness={0.88}
        />
      </mesh>

      {/* Headlights (-Z forward) */}
      {[-width * 0.34, width * 0.34].map((xPos, idx) => (
        <mesh
          key={`headlight-${idx}`}
          position={[xPos, 0.24 + lowerBodyHeight * 0.55, -length * 0.502]}
        >
          <boxGeometry args={[0.28, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#e0f2fe"
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}

      {/* Taillights (+Z rear) */}
      {[-width * 0.34, width * 0.34].map((xPos, idx) => (
        <mesh
          key={`taillight-${idx}`}
          position={[xPos, 0.24 + lowerBodyHeight * 0.58, length * 0.502]}
        >
          <boxGeometry args={[0.32, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#b91c1c"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Front (white) & Rear (yellow) UK number plates */}
      <mesh position={[0, 0.32, -length * 0.503]}>
        <boxGeometry args={[0.52, 0.11, 0.02]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.36, length * 0.503]}>
        <boxGeometry args={[0.52, 0.11, 0.02]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>

      {/* Four wheels */}
      <DecorativeWheel
        position={[-halfW, wheelRadius, -wheelZ]}
        radius={wheelRadius}
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[halfW, wheelRadius, -wheelZ]}
        radius={wheelRadius}
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[-halfW, wheelRadius, wheelZ]}
        radius={wheelRadius}
        enableShadows={enableShadows}
      />
      <DecorativeWheel
        position={[halfW, wheelRadius, wheelZ]}
        radius={wheelRadius}
        enableShadows={enableShadows}
      />
    </group>
  );
}

/**
 * Renders all stationary decorative parked vehicles around the perimeter bays,
 * including the showcase New Tesla Roadster.
 */
export function DecorativeVehicles({
  enableShadows = true,
}: DecorativeVehiclesProps) {
  return (
    <group name="decorative-parked-vehicles">
      {DECORATIVE_PARKED_VEHICLES.map((spec) =>
        spec.kind === 'tesla-roadster' ? (
          <DecorativeTeslaRoadster
            key={spec.id}
            spec={spec}
            enableShadows={enableShadows}
          />
        ) : (
          <DecorativeStandardVehicle
            key={spec.id}
            spec={spec}
            enableShadows={enableShadows}
          />
        )
      )}
    </group>
  );
}
