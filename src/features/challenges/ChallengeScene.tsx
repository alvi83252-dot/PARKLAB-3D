/**
 * PARKLAB 3D — ChallengeScene Component
 *
 * Reusable React Three Fiber scene component that renders:
 * - Target parking bay markings, corner brackets, directional heading arrows,
 *   and subtle corner beacon markers.
 * - Spawn zone ground indicator.
 * - Challenge-specific manoeuvre guides (e.g., Stage 1 pull-up zone for
 *   `pull-up-right`).
 * - All static obstacles (`parked-car`, `cone`, `kerb`) directly from
 *   `challenge.obstacles` so visual geometry and collision boxes match 1:1.
 *
 * Designed to mount inside the existing Canvas alongside `ParkingEnvironment`
 * and `VehicleController`. Does NOT create its own Canvas.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, MeshBasicMaterial } from 'three';
import type {
  ObstacleDefinition,
  ParkingChallengeDefinition,
  ParkingTarget,
  Vec3,
} from './types';

export interface ChallengeSceneProps {
  challenge: ParkingChallengeDefinition;
  /** Optional flag to toggle auxiliary approach/alignment floor guides */
  showGuides?: boolean;
}

const PARKED_CAR_PALETTE = [
  '#2563eb', // Sapphire Blue
  '#475569', // Slate Metallic
  '#dc2626', // Crimson Red
  '#0f766e', // Deep Teal
  '#7c3aed', // Midnight Violet
  '#d97706', // Amber Bronze
] as const;

function getCarColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PARKED_CAR_PALETTE.length;
  return PARKED_CAR_PALETTE[index];
}

interface TargetBayMarkingsProps {
  target: ParkingTarget;
}

function TargetBayMarkings({ target }: TargetBayMarkingsProps) {
  const pulseMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const beaconGroupRef = useRef<Group | null>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pulseMaterialRef.current) {
      pulseMaterialRef.current.opacity = 0.14 + Math.sin(t * 2.6) * 0.06;
    }
    if (beaconGroupRef.current) {
      beaconGroupRef.current.position.y = Math.sin(t * 2.2) * 0.04;
    }
  });

  const { width, length, position, rotationY } = target;
  const halfW = width / 2;
  const halfL = length / 2;
  const lineThickness = 0.09;
  const cornerArm = Math.min(0.65, width * 0.26);

  const corners: Array<[number, number, number, number]> = [
    [-halfW, -halfL, 1, 1],
    [halfW, -halfL, -1, 1],
    [-halfW, halfL, 1, -1],
    [halfW, halfL, -1, -1],
  ];

  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotationY, 0]}
    >
      {/* Translucent illuminated bay floor */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width - lineThickness, length - lineThickness]} />
        <meshBasicMaterial
          ref={pulseMaterialRef}
          color="#10b981"
          transparent
          opacity={0.16}
        />
      </mesh>

      {/* Outer painted bay perimeter lines (Left, Right, Front, Rear) */}
      {/* Left line */}
      <mesh position={[-halfW, 0.016, 0]} receiveShadow>
        <boxGeometry args={[lineThickness, 0.008, length + lineThickness]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#10b981"
          emissiveIntensity={0.28}
          roughness={0.5}
        />
      </mesh>
      {/* Right line */}
      <mesh position={[halfW, 0.016, 0]} receiveShadow>
        <boxGeometry args={[lineThickness, 0.008, length + lineThickness]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#10b981"
          emissiveIntensity={0.28}
          roughness={0.5}
        />
      </mesh>
      {/* Front (-Z) line */}
      <mesh position={[0, 0.016, -halfL]} receiveShadow>
        <boxGeometry args={[width + lineThickness, 0.008, lineThickness]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.45}
          roughness={0.4}
        />
      </mesh>
      {/* Rear (+Z) line */}
      <mesh position={[0, 0.016, halfL]} receiveShadow>
        <boxGeometry args={[width + lineThickness, 0.008, lineThickness]} />
        <meshStandardMaterial
          color="#e2e8f0"
          emissive="#10b981"
          emissiveIntensity={0.22}
          roughness={0.5}
        />
      </mesh>

      {/* High-contrast emerald L-corner brackets */}
      {corners.map(([cx, cz, dirX, dirZ], idx) => (
        <group key={`corner-${idx}`} position={[cx, 0.022, cz]}>
          <mesh position={[(dirX * cornerArm) / 2, 0, 0]}>
            <boxGeometry args={[cornerArm, 0.01, lineThickness * 1.35]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>
          <mesh position={[0, 0, (dirZ * cornerArm) / 2]}>
            <boxGeometry args={[lineThickness * 1.35, 0.01, cornerArm]} />
            <meshBasicMaterial color="#34d399" />
          </mesh>
        </group>
      ))}

      {/* Centre alignment axis & forward (-Z) heading arrow */}
      <mesh position={[0, 0.018, 0.25]}>
        <boxGeometry args={[0.07, 0.006, length * 0.52]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.65} />
      </mesh>
      {/* Arrowhead pointing toward local -Z (required vehicle forward direction) */}
      <mesh
        position={[0, 0.022, -length * 0.28]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.36, 0.65, 3]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.85} />
      </mesh>

      {/* Subtle corner vertical holographic markers for 3rd-person visibility */}
      <group ref={beaconGroupRef}>
        {corners.map(([cx, cz], idx) => (
          <mesh key={`beacon-${idx}`} position={[cx, 0.28, cz]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
            <meshBasicMaterial color="#34d399" transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

interface SpawnZoneIndicatorProps {
  position: Vec3;
  rotationY: number;
}

function SpawnZoneIndicator({ position, rotationY }: SpawnZoneIndicatorProps) {
  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotationY, 0]}
    >
      {/* Subtle blue starting bay outline */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 4.8]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.09} />
      </mesh>
      <mesh position={[-1.1, 0.012, 0]}>
        <boxGeometry args={[0.06, 0.006, 4.8]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.45} />
      </mesh>
      <mesh position={[1.1, 0.012, 0]}>
        <boxGeometry args={[0.06, 0.006, 4.8]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.45} />
      </mesh>
      {/* Forward start chevron */}
      <mesh position={[0, 0.015, -2.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.28, 0.5, 3]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

/**
 * Renders the Stage 1 pull-up guide box and reversing corridor for the
 * `pull-up-right` UK driving test manoeuvre.
 */
function PullUpRightStageGuide() {
  return (
    <group position={[3.3, 0, -4.2]} rotation={[0, 0, 0]}>
      {/* Stage 1 forward pull-up zone */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 5.4]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.1} />
      </mesh>
      <mesh position={[-1.1, 0.014, 0]}>
        <boxGeometry args={[0.06, 0.006, 5.4]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
      </mesh>
      <mesh position={[1.1, 0.014, 0]}>
        <boxGeometry args={[0.06, 0.006, 5.4]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
      </mesh>
      {/* Reversing guide chevrons pointing +Z toward the final assessment zone */}
      {[1.8, 3.2, 4.6].map((offsetZ) => (
        <mesh
          key={`rev-chevron-${offsetZ}`}
          position={[0, 0.016, offsetZ]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[0.24, 0.42, 3]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

interface ParkedCarObstacleProps {
  obstacle: ObstacleDefinition;
}

function ParkedCarObstacle({ obstacle }: ParkedCarObstacleProps) {
  const { position, rotationY, dimensions, id } = obstacle;
  const { width, height, length } = dimensions;
  const bodyColor = useMemo(() => getCarColorFromId(id), [id]);

  const wheelRadius = Math.min(0.34, height * 0.22);
  const wheelThickness = Math.min(0.22, width * 0.12);
  const chassisHeight = height * 0.46;
  const chassisCenterY = wheelRadius * 0.65 + chassisHeight / 2;
  const cabinHeight = height * 0.38;
  const cabinLength = length * 0.52;
  const cabinCenterY = chassisCenterY + chassisHeight / 2 + cabinHeight / 2 - 0.03;

  const axleOffsetZ = length * 0.31;
  const wheelOffsetX = width * 0.46;

  return (
    <group
      position={[position[0], 0, position[2]]}
      rotation={[0, rotationY, 0]}
    >
      {/* Painted bay lines beneath adjacent parked vehicles */}
      <mesh position={[-width * 0.68, 0.008, 0]}>
        <boxGeometry args={[0.06, 0.004, length * 1.12]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>
      <mesh position={[width * 0.68, 0.008, 0]}>
        <boxGeometry args={[0.06, 0.004, length * 1.12]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>

      {/* Main lower chassis */}
      <mesh position={[0, chassisCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, chassisHeight, length]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.45}
          roughness={0.35}
        />
      </mesh>

      {/* Cabin / greenhouse */}
      <mesh position={[0, cabinCenterY, length * 0.04]} castShadow receiveShadow>
        <boxGeometry args={[width * 0.84, cabinHeight, cabinLength]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>

      {/* Tinted windshield & window band */}
      <mesh position={[0, cabinCenterY, length * 0.04]}>
        <boxGeometry
          args={[width * 0.86, cabinHeight * 0.72, cabinLength * 0.88]}
        />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.75}
          roughness={0.18}
        />
      </mesh>

      {/* Front bumper (-Z) */}
      <mesh
        position={[0, wheelRadius * 0.75, -length * 0.49]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, chassisHeight * 0.42, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Rear bumper (+Z) */}
      <mesh
        position={[0, wheelRadius * 0.75, length * 0.49]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, chassisHeight * 0.42, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Front headlights (-Z) */}
      {[-1, 1].map((side) => (
        <mesh
          key={`headlight-${side}`}
          position={[side * width * 0.34, chassisCenterY + 0.04, -length * 0.501]}
        >
          <boxGeometry args={[width * 0.18, 0.11, 0.03]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#e2e8f0"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Rear taillights (+Z) */}
      {[-1, 1].map((side) => (
        <mesh
          key={`taillight-${side}`}
          position={[side * width * 0.34, chassisCenterY + 0.04, length * 0.501]}
        >
          <boxGeometry args={[width * 0.2, 0.11, 0.03]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}

      {/* Four wheels */}
      {[
        [-wheelOffsetX, -axleOffsetZ],
        [wheelOffsetX, -axleOffsetZ],
        [-wheelOffsetX, axleOffsetZ],
        [wheelOffsetX, axleOffsetZ],
      ].map(([wx, wz], idx) => (
        <mesh
          key={`wheel-${idx}`}
          position={[wx, wheelRadius, wz]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[wheelRadius, wheelRadius, wheelThickness, 16]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

interface TrafficConeObstacleProps {
  obstacle: ObstacleDefinition;
}

function TrafficConeObstacle({ obstacle }: TrafficConeObstacleProps) {
  const { position, rotationY, dimensions } = obstacle;
  const { width, height, length } = dimensions;
  const baseHeight = Math.max(0.05, height * 0.08);
  const coneHeight = height - baseHeight;
  const bottomRadius = Math.min(width, length) * 0.36;
  const topRadius = bottomRadius * 0.22;

  return (
    <group
      position={[position[0], 0, position[2]]}
      rotation={[0, rotationY, 0]}
    >
      {/* Heavy rubber base */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseHeight, length]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* Orange tapered cone body */}
      <mesh
        position={[0, baseHeight + coneHeight / 2, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[topRadius, bottomRadius, coneHeight, 16]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#ea580c"
          emissiveIntensity={0.18}
          roughness={0.45}
        />
      </mesh>

      {/* Reflective white highway collar */}
      <mesh position={[0, baseHeight + coneHeight * 0.58, 0]}>
        <cylinderGeometry
          args={[
            topRadius + (bottomRadius - topRadius) * 0.34,
            topRadius + (bottomRadius - topRadius) * 0.54,
            coneHeight * 0.24,
            16,
          ]}
        />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#f8fafc"
          emissiveIntensity={0.22}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

interface KerbObstacleProps {
  obstacle: ObstacleDefinition;
}

function KerbObstacle({ obstacle }: KerbObstacleProps) {
  const { position, rotationY, dimensions } = obstacle;
  const { width, height, length } = dimensions;

  return (
    <group
      position={[position[0], 0, position[2]]}
      rotation={[0, rotationY, 0]}
    >
      {/* Main concrete kerbstone block */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.78} metalness={0.08} />
      </mesh>
      {/* Top bevel highlight strip */}
      <mesh position={[0, height + 0.003, 0]} receiveShadow>
        <boxGeometry args={[width * 0.86, 0.008, length * 0.99]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.65} />
      </mesh>
    </group>
  );
}

export function ChallengeScene({
  challenge,
  showGuides = true,
}: ChallengeSceneProps) {
  return (
    <group name={`challenge-scene-${challenge.id}`}>
      {/* Target parking bay markings and alignment guides */}
      <TargetBayMarkings target={challenge.parkingTarget} />

      {/* Starting spawn zone floor marker */}
      {showGuides && (
        <SpawnZoneIndicator
          position={challenge.spawnPosition}
          rotationY={challenge.spawnRotationY}
        />
      )}

      {/* Stage 1 forward pull-up guide box for UK Pull Up on Right & Reverse */}
      {showGuides && challenge.id === 'pull-up-right' && (
        <PullUpRightStageGuide />
      )}

      {/* Render obstacles directly from challenge.obstacles */}
      {challenge.obstacles.map((obstacle) => {
        switch (obstacle.kind) {
          case 'parked-car':
            return <ParkedCarObstacle key={obstacle.id} obstacle={obstacle} />;
          case 'cone':
            return <TrafficConeObstacle key={obstacle.id} obstacle={obstacle} />;
          case 'kerb':
            return <KerbObstacle key={obstacle.id} obstacle={obstacle} />;
          default:
            return null;
        }
      })}
    </group>
  );
}

export default ChallengeScene;
