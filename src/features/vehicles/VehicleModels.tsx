/**
 * PARKLAB 3D — Procedural 3D Vehicle Models & Creative Craft Skins
 * Distinct procedural Three.js geometry for the 4 selectable vehicles:
 * 1. Modern Hatchback
 * 2. Executive Sedan
 * 3. Large SUV
 * 4. Flying Tesla Roadster (SpaceX Cold-Gas Rocket Thrusters, Vectored Hover-Turbine Pods,
 *    Deployable Aero Flight Winglets, Extruded Wedge Fuselage & Ground Ion Downwash Ring)
 *
 * Plus Creative 3D Skin & Accessory Transformations:
 * - Factory Carbon & Metallic
 * - Artisan Carved Woodcraft (wooden planks, walnut joinery, turned birch wheels, brass wind-up key)
 * - Brick-Built Block Toy / LEGO® Style (glossy ABS plastic, 3D cylindrical studs, stepped brick plates)
 * - Cyberpunk Holo-Grid (obsidian stealth body, glowing wireframe matrix, neon underglow & holo-halo)
 * - Origami Cardboard DIY (corrugated kraft panels, masking tape strips, folded paper glider wings)
 * - Translucent Jelly Gummy (semi-transparent glossy candy shell, glowing inner jelly core & sprinkles)
 * - 24K Royal Gold Chrome (mirror-polished gold bullion bodywork & diamond glass)
 */

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VehicleDefinition } from './types';
import { getChassisSpec, type VehicleChassisSpec } from './vehicles';
import {
  getCarSkinById,
  resolveEffectiveAccessory,
  useCustomization,
  type CarCustomization,
  type CarSkinDefinition,
} from '../../config/customization.config';

export interface VehicleWheelRefs {
  frontLeftSteer: THREE.Group | null;
  frontRightSteer: THREE.Group | null;
  frontLeftSpin: THREE.Group | null;
  frontRightSpin: THREE.Group | null;
  rearLeftSpin: THREE.Group | null;
  rearRightSpin: THREE.Group | null;
}

export type VehicleModelPartsRefs = VehicleWheelRefs;

export function createVehiclePartsRefs(): VehicleWheelRefs {
  return {
    frontLeftSteer: null,
    frontRightSteer: null,
    frontLeftSpin: null,
    frontRightSpin: null,
    rearLeftSpin: null,
    rearRightSpin: null,
  };
}

export interface VehicleLightRefs {
  brakeLightLeft: THREE.MeshStandardMaterial | null;
  brakeLightRight: THREE.MeshStandardMaterial | null;
  brakeLightBar: THREE.MeshStandardMaterial | null;
  reverseLightLeft: THREE.MeshStandardMaterial | null;
  reverseLightRight: THREE.MeshStandardMaterial | null;
  thrusterGlow?: THREE.MeshStandardMaterial | null;
  hoverRingGlow?: THREE.MeshStandardMaterial | null;
}

export interface VehicleModelProps {
  vehicle: VehicleDefinition;
  wheelRefs?: MutableRefObject<VehicleWheelRefs>;
  lightRefs?: MutableRefObject<VehicleLightRefs>;
  impactFlash?: boolean;
  customizationOverride?: Partial<CarCustomization>;
  isTrafficObstacle?: boolean;
}

interface WheelAssemblyProps {
  radius: number;
  width: number;
  isRightSide: boolean;
  isFront: boolean;
  category: VehicleDefinition['category'];
  skin: CarSkinDefinition;
  steerRef?: (node: THREE.Group | null) => void;
  spinRef?: (node: THREE.Group | null) => void;
}

function WheelAssembly({
  radius,
  width,
  isRightSide,
  isFront,
  category,
  skin,
  steerRef,
  spinRef,
}: WheelAssemblyProps) {
  const isSports = category === 'sports';
  const isSuv = category === 'suv';
  const isWooden = skin.id === 'wooden';
  const isLego = skin.id === 'lego';
  const isCyber = skin.id === 'cyberpunk';
  const isGummy = skin.id === 'gummy';

  const rimRadius = radius * (isSports ? 0.76 : isSuv ? 0.62 : 0.67);
  const spokeCount = isWooden ? 8 : isLego ? 4 : isSports ? 6 : isSuv ? 6 : 5;
  const caliperSign = isFront ? 1 : -1;

  const spokeAngles = useMemo(
    () =>
      Array.from(
        { length: spokeCount },
        (_, idx) => (idx * Math.PI * 2) / spokeCount
      ),
    [spokeCount]
  );

  // For the Flying Tesla Roadster ('sports'), each wheel assembly pivots into an
  // angled hover-fan vector thruster nacelle with a glowing ion thruster ring!
  const hoverTiltAngle = isSports
    ? (isRightSide ? -1 : 1) * 1.12 // ~64 deg hover vector tilt
    : 0;

  const tyreColor =
    skin.id === 'factory'
      ? isSports
        ? '#0f172a'
        : '#14171f'
      : skin.wheelTyreColor;
  const rimColor =
    skin.id === 'factory'
      ? isSports
        ? '#0c4a6e'
        : isSuv
          ? '#334155'
          : '#94a3b8'
      : skin.wheelRimColor;

  return (
    <group ref={steerRef}>
      <group rotation={[0, 0, hoverTiltAngle]}>
        {/* Stationary brake caliper or hover-nacelle vector strut */}
        {(isSports || category === 'sedan') && (
          <mesh
            position={[
              isRightSide ? width * 0.16 : -width * 0.16,
              radius * 0.12,
              caliperSign * radius * 0.36,
            ]}
          >
            <boxGeometry args={[width * 0.38, radius * 0.34, radius * 0.26]} />
            <meshStandardMaterial
              color={isWooden ? '#b45309' : isSports ? '#38bdf8' : '#64748b'}
              emissive={
                isCyber
                  ? '#f43f5e'
                  : isSports && !isWooden
                    ? '#0284c7'
                    : '#000000'
              }
              emissiveIntensity={isCyber ? 1.6 : isSports && !isWooden ? 1.2 : 0}
              metalness={isWooden ? 0.2 : 0.7}
              roughness={isWooden ? 0.6 : 0.25}
            />
          </mesh>
        )}

        {/* Glowing Ion Downwash Thruster Ring inside Flying Roadster Hover-Pod */}
        {isSports && (
          <mesh
            position={[isRightSide ? width * 0.42 : -width * 0.42, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <torusGeometry args={[rimRadius * 0.78, 0.024, 12, 28]} />
            <meshStandardMaterial
              color={isWooden ? '#fbbf24' : isCyber ? '#00f5d4' : '#7dd3fc'}
              emissive={isWooden ? '#d97706' : isCyber ? '#00f5d4' : '#38bdf8'}
              emissiveIntensity={isWooden ? 1.1 : 2.4}
            />
          </mesh>
        )}

        {/* Rotating wheel / hover-turbine impeller assembly */}
        <group ref={spinRef}>
          {/* Outer rubber tyre / carved wooden wheel / LEGO stepped tread */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry
              args={[radius, radius, width, isLego ? 14 : 24]}
            />
            <meshStandardMaterial
              color={tyreColor}
              roughness={isWooden ? 0.72 : isLego ? 0.35 : isSports ? 0.4 : 0.85}
              metalness={isWooden ? 0.05 : isSports ? 0.65 : 0.1}
              transparent={isGummy}
              opacity={isGummy ? 0.82 : 1}
            />
          </mesh>

          {/* Inner wheel barrel / wooden dowel core / LEGO plastic hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[rimRadius, rimRadius, width * 1.02, 20]} />
            <meshStandardMaterial
              color={rimColor}
              emissive={
                isCyber
                  ? '#00f5d4'
                  : isSports && skin.id === 'factory'
                    ? '#0ea5e9'
                    : '#000000'
              }
              emissiveIntensity={
                isCyber ? 1.1 : isSports && skin.id === 'factory' ? 0.9 : 0
              }
              metalness={isWooden || isLego ? 0.1 : 0.75}
              roughness={isWooden ? 0.65 : isLego ? 0.16 : 0.25}
            />
          </mesh>

          {/* LEGO Wheel Hub Studs on outer face */}
          {isLego &&
            [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((ang, idx) => (
              <mesh
                key={`lego-wheel-stud-${idx}`}
                position={[
                  isRightSide ? width * 0.54 : -width * 0.54,
                  Math.sin(ang) * rimRadius * 0.48,
                  Math.cos(ang) * rimRadius * 0.48,
                ]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.04, 0.04, 0.035, 12]} />
                <meshStandardMaterial
                  color="#facc15"
                  roughness={0.15}
                  metalness={0.08}
                />
              </mesh>
            ))}

          {/* Alloy spokes / wooden wagon spokes / turbine blades */}
          {spokeAngles.map((angle, i) => (
            <mesh
              key={i}
              position={[
                isRightSide ? width * 0.48 : -width * 0.48,
                Math.sin(angle) * rimRadius * 0.46,
                Math.cos(angle) * rimRadius * 0.46,
              ]}
              rotation={[angle + (isSports ? 0.32 : 0), 0, 0]}
            >
              <boxGeometry
                args={[
                  width * 0.08,
                  rimRadius * 0.88,
                  isSports ? rimRadius * 0.16 : rimRadius * 0.22,
                ]}
              />
              <meshStandardMaterial
                color={
                  isWooden
                    ? '#854d0e'
                    : isLego
                      ? '#ef4444'
                      : isSports
                        ? '#e0f2fe'
                        : '#e2e8f0'
                }
                metalness={isWooden || isLego ? 0.12 : 0.85}
                roughness={isWooden ? 0.65 : isLego ? 0.18 : 0.2}
              />
            </mesh>
          ))}

          {/* Center hub cap / brass dowel pin */}
          <mesh
            position={[isRightSide ? width * 0.52 : -width * 0.52, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[rimRadius * 0.26, rimRadius * 0.26, 0.03, 14]}
            />
            <meshStandardMaterial
              color={
                isWooden
                  ? '#f59e0b'
                  : isLego
                    ? '#2563eb'
                    : isSports
                      ? '#38bdf8'
                      : '#0f172a'
              }
              emissive={isSports || isCyber ? '#38bdf8' : '#000000'}
              emissiveIntensity={isSports || isCyber ? 1.8 : 0}
              metalness={isWooden ? 0.88 : 0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

interface BodySectionProps {
  vehicle: VehicleDefinition;
  chassis: VehicleChassisSpec;
  paintColor: string;
  skin: CarSkinDefinition;
  lightRefs?: MutableRefObject<VehicleLightRefs>;
}

/**
 * Creative 3D Skin & Accessory Sculptural Overlays
 * Renders authentic 3D wooden joinery planks, LEGO studs, cardboard masking tape,
 * cyberpunk wireframe matrices, gummy candy cores, and animated roof toppers!
 */
function CreativeSkin3DOverlays({
  vehicle,
  chassis,
  skin,
  paintColor,
  accessoryId,
}: {
  vehicle: VehicleDefinition;
  chassis: VehicleChassisSpec;
  skin: CarSkinDefinition;
  paintColor: string;
  accessoryId: string;
}) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const windupKeyRef = useRef<THREE.Group | null>(null);
  const holoHaloRef = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    if (windupKeyRef.current) {
      windupKeyRef.current.rotation.y += delta * 2.4;
    }
    if (holoHaloRef.current) {
      holoHaloRef.current.rotation.y -= delta * 1.8;
    }
  });

  // Precompute 3D LEGO stud positions across hood, roof, and rear deck
  const legoStudCoords = useMemo(() => {
    const studs: Array<{ x: number; y: number; z: number; color?: string }> = [];
    const cols = [-W * 0.28, -W * 0.095, W * 0.095, W * 0.28];

    // Front Hood Studs
    const hoodY =
      vehicle.category === 'sports'
        ? H * 0.56
        : clearance + (H - clearance) * 0.52;
    for (const x of cols) {
      for (const z of [-L * 0.38, -L * 0.27]) {
        studs.push({ x, y: hoodY, z });
      }
    }

    // Roof Plate Studs
    const roofY =
      vehicle.category === 'sports' ? H * 0.94 : H - 0.01;
    for (const x of cols) {
      for (const z of [-L * 0.04, L * 0.09, L * 0.22]) {
        studs.push({ x, y: roofY, z });
      }
    }

    // Rear Boot / Deck Studs
    const rearY =
      vehicle.category === 'sports'
        ? H * 0.65
        : clearance + (H - clearance) * 0.52;
    for (const x of cols) {
      studs.push({ x, y: rearY, z: L * 0.38, color: '#facc15' });
    }

    return studs;
  }, [L, W, H, clearance, vehicle.category]);

  const roofTopY = vehicle.category === 'sports' ? H * 0.96 : H + 0.01;

  return (
    <group name="creative-skin-3d-overlays">
      {/* ================================================================
          1. WOODEN CAR CRAFT DETAILS (Oak Joinery Planks & Birch Dowels)
         ================================================================ */}
      {skin.id === 'wooden' && (
        <group name="wooden-car-craft">
          {/* Carved Walnut Wood-Grain Plank Strips along Roof & Bonnet */}
          {[-W * 0.26, 0, W * 0.26].map((xPos, idx) => (
            <group key={`wood-plank-${idx}`}>
              <mesh
                position={[xPos, roofTopY - 0.01, L * 0.08]}
                castShadow
              >
                <boxGeometry args={[0.075, 0.025, L * 0.42]} />
                <meshStandardMaterial
                  color="#6f4518"
                  roughness={0.74}
                  metalness={0.04}
                />
              </mesh>
              <mesh
                position={[
                  xPos,
                  clearance + (H - clearance) * 0.51,
                  -L * 0.31,
                ]}
              >
                <boxGeometry args={[0.075, 0.025, L * 0.28]} />
                <meshStandardMaterial
                  color="#6f4518"
                  roughness={0.74}
                  metalness={0.04}
                />
              </mesh>
            </group>
          ))}

          {/* Turned Beechwood Cylindrical Front & Rear Toy Bumpers */}
          {[-L * 0.505, L * 0.505].map((zPos, idx) => (
            <mesh
              key={`wood-bumper-${idx}`}
              position={[0, clearance + 0.14, zPos]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.065, 0.065, W * 0.96, 16]} />
              <meshStandardMaterial
                color="#deb887"
                roughness={0.62}
                metalness={0.05}
              />
            </mesh>
          ))}

          {/* Brass Joinery Rivets on Side Doors */}
          {[-1, 1].map((side) =>
            [-L * 0.18, 0, L * 0.18].map((zOff, idx) => (
              <mesh
                key={`brass-rivet-${side}-${idx}`}
                position={[
                  side * (W * 0.508),
                  clearance + (H - clearance) * 0.32,
                  zOff,
                ]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.028, 0.028, 0.02, 12]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  metalness={0.9}
                  roughness={0.2}
                />
              </mesh>
            ))
          )}
        </group>
      )}

      {/* ================================================================
          2. LEGO® BRICK-BUILT CAR DETAILS (3D Studs & Stepped Plates)
         ================================================================ */}
      {(skin.id === 'lego' || accessoryId === 'lego-studs') && (
        <group name="lego-brick-studs">
          {legoStudCoords.map((stud, idx) => (
            <mesh
              key={`lego-stud-${idx}`}
              position={[stud.x, stud.y + 0.026, stud.z]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.082, 0.082, 0.052, 16]} />
              <meshStandardMaterial
                color={stud.color ?? paintColor}
                roughness={0.14}
                metalness={0.08}
              />
            </mesh>
          ))}

          {/* Bright Yellow LEGO Baseplate Sill Strips along Left & Right Rocker Panels */}
          {[-1, 1].map((side) => (
            <mesh
              key={`lego-sill-${side}`}
              position={[side * (W * 0.51), clearance + 0.06, 0]}
              castShadow
            >
              <boxGeometry args={[0.045, 0.09, L * 0.94]} />
              <meshStandardMaterial
                color="#facc15"
                roughness={0.15}
                metalness={0.08}
              />
            </mesh>
          ))}

          {/* Classic Blue & White Stepped LEGO Front/Rear Brick Bumpers */}
          {[-L * 0.505, L * 0.505].map((zPos, idx) => (
            <mesh
              key={`lego-bumper-${idx}`}
              position={[0, clearance + 0.1, zPos]}
              castShadow
            >
              <boxGeometry args={[W * 0.98, 0.11, 0.09]} />
              <meshStandardMaterial
                color={idx === 0 ? '#facc15' : '#2563eb'}
                roughness={0.15}
                metalness={0.08}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ================================================================
          3. ORIGAMI CARDBOARD DIY DETAILS (Masking Tape & Corrugated Flaps)
         ================================================================ */}
      {skin.id === 'cardboard' && (
        <group name="cardboard-diy-details">
          {/* Beige Masking Tape Strips Holding Bonnet & Roof Seams Together */}
          {[
            { pos: [-W * 0.32, roofTopY + 0.008, -L * 0.05], rot: [0, 0.25, 0] },
            { pos: [W * 0.32, roofTopY + 0.008, L * 0.15], rot: [0, -0.3, 0] },
            {
              pos: [0, clearance + (H - clearance) * 0.52, -L * 0.32],
              rot: [0.08, 0.4, 0],
            },
          ].map((tape, idx) => (
            <mesh
              key={`masking-tape-${idx}`}
              position={tape.pos as [number, number, number]}
              rotation={tape.rot as [number, number, number]}
            >
              <boxGeometry args={[0.24, 0.012, 0.075]} />
              <meshStandardMaterial
                color="#f3e5ab"
                roughness={0.85}
                metalness={0.02}
              />
            </mesh>
          ))}

          {/* Folded Cardboard Box Flaps along Side Doors */}
          {[-1, 1].map((side) => (
            <mesh
              key={`cardboard-flap-${side}`}
              position={[
                side * (W * 0.52),
                clearance + (H - clearance) * 0.35,
                0.04,
              ]}
              rotation={[0, 0, side * 0.12]}
              castShadow
            >
              <boxGeometry args={[0.025, 0.26, L * 0.48]} />
              <meshStandardMaterial
                color="#a47546"
                roughness={0.9}
                metalness={0.02}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ================================================================
          4. CYBERPUNK HOLO-GRID DETAILS (Wireframe Cage & Neon Underglow)
         ================================================================ */}
      {skin.id === 'cyberpunk' && (
        <group name="cyberpunk-holo-details">
          {/* Translucent Glowing Cyan Wireframe Exoskeleton */}
          <mesh position={[0, clearance + (H - clearance) * 0.5, 0]}>
            <boxGeometry args={[W * 1.03, (H - clearance) * 0.96, L * 0.99]} />
            <meshBasicMaterial
              color="#00f5d4"
              wireframe
              transparent
              opacity={0.42}
            />
          </mesh>

          {/* Neon Magenta & Cyan Ground Underglow Bars */}
          {[-1, 1].map((side) => (
            <mesh
              key={`cyber-underglow-${side}`}
              position={[side * (W * 0.46), 0.025, 0]}
            >
              <boxGeometry args={[0.06, 0.025, L * 0.84]} />
              <meshStandardMaterial
                color="#f43f5e"
                emissive="#f43f5e"
                emissiveIntensity={2.6}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ================================================================
          5. TRANSLUCENT CANDY GUMMY DETAILS (Inner Jelly Core & Sprinkles)
         ================================================================ */}
      {skin.id === 'gummy' && (
        <group name="gummy-candy-details">
          {/* Glowing Inner Fruit-Candy Core visible through translucent shell */}
          <mesh position={[0, clearance + (H - clearance) * 0.38, 0]}>
            <boxGeometry args={[W * 0.64, (H - clearance) * 0.45, L * 0.62]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f472b6"
              emissiveIntensity={0.85}
              roughness={0.2}
            />
          </mesh>

          {/* Rainbow Sugar Sprinkles across the Roof */}
          {[
            { x: -0.22, z: -0.05, c: '#fef08a', r: 0.3 },
            { x: 0.18, z: 0.04, c: '#38bdf8', r: -0.4 },
            { x: -0.08, z: 0.18, c: '#4ade80', r: 0.6 },
            { x: 0.24, z: 0.22, c: '#f472b6', r: -0.2 },
            { x: 0.02, z: -0.12, c: '#c084fc', r: 0.15 },
          ].map((sp, idx) => (
            <mesh
              key={`sprinkle-${idx}`}
              position={[sp.x, roofTopY + 0.015, sp.z]}
              rotation={[Math.PI / 2, 0, sp.r]}
            >
              <cylinderGeometry args={[0.024, 0.024, 0.11, 10]} />
              <meshStandardMaterial color={sp.c} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {/* ================================================================
          6. ROOF & CHASSIS ACCESSORIES (Wind-Up Key, Paper Wings, Halo, etc.)
         ================================================================ */}
      {/* A. Spinning Brass Clockwork Wind-Up Key */}
      {accessoryId === 'windup-key' && (
        <group
          ref={windupKeyRef}
          position={[0, roofTopY + 0.02, L * 0.08]}
          name="clockwork-windup-key"
        >
          {/* Brass base collar */}
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 0.08, 16]} />
            <meshStandardMaterial
              color="#d97706"
              metalness={0.88}
              roughness={0.18}
            />
          </mesh>
          {/* Vertical key shaft */}
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.34, 14]} />
            <meshStandardMaterial
              color="#fbbf24"
              metalness={0.92}
              roughness={0.14}
            />
          </mesh>
          {/* Twin ornate clockwork bow loops */}
          {[-0.16, 0.16].map((xLoop, idx) => (
            <mesh
              key={`key-loop-${idx}`}
              position={[xLoop, 0.42, 0]}
              castShadow
            >
              <torusGeometry args={[0.14, 0.036, 14, 24]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.92}
                roughness={0.14}
              />
            </mesh>
          ))}
          {/* Center bridge bar */}
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.16, 0.07, 0.05]} />
            <meshStandardMaterial
              color="#f59e0b"
              metalness={0.9}
              roughness={0.16}
            />
          </mesh>
        </group>
      )}

      {/* B. LEGO Brick Pennant Flag */}
      {accessoryId === 'lego-studs' && (
        <group position={[0, roofTopY + 0.04, L * 0.16]} name="lego-roof-flag">
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.44, 10]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.15} />
          </mesh>
          <mesh position={[0, 0.36, 0.12]} castShadow>
            <boxGeometry args={[0.025, 0.16, 0.24]} />
            <meshStandardMaterial color="#facc15" roughness={0.15} />
          </mesh>
        </group>
      )}

      {/* C. Folded Origami Paper Glider Wings & Dorsal Tail Fin */}
      {accessoryId === 'paper-wings' && (
        <group
          position={[0, roofTopY + 0.02, L * 0.08]}
          name="origami-paper-wings"
        >
          {/* Vertical folded dorsal paper fin */}
          <mesh position={[0, 0.18, 0.06]} castShadow>
            <boxGeometry args={[0.022, 0.34, 0.46]} />
            <meshStandardMaterial
              color="#f5f5dc"
              roughness={0.82}
              metalness={0.02}
            />
          </mesh>
          {/* Left & Right folded paper airplane delta wings */}
          {[-1, 1].map((side) => (
            <mesh
              key={`paper-wing-${side}`}
              position={[side * (W * 0.38), 0.1, 0.05]}
              rotation={[0, side * -0.18, side * -0.14]}
              castShadow
            >
              <boxGeometry args={[W * 0.56, 0.018, 0.42]} />
              <meshStandardMaterial
                color="#fdfcf0"
                roughness={0.8}
                metalness={0.02}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* D. Levitating Cyber Telemetry Halo Ring */}
      {accessoryId === 'holo-halo' && (
        <group
          ref={holoHaloRef}
          position={[0, roofTopY + 0.24, L * 0.05]}
          name="cyber-holo-halo"
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[W * 0.34, 0.022, 14, 36]} />
            <meshStandardMaterial
              color="#00f5d4"
              emissive="#00f5d4"
              emissiveIntensity={2.5}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2 + 0.22, 0.2, 0]}>
            <torusGeometry args={[W * 0.24, 0.016, 12, 32]} />
            <meshStandardMaterial
              color="#f43f5e"
              emissive="#f43f5e"
              emissiveIntensity={2.2}
            />
          </mesh>
        </group>
      )}

      {/* E. UK Driving Instructor Roof Prism Sign & Strobe Beacon */}
      {accessoryId === 'instructor-beacon' && (
        <group
          position={[0, roofTopY + 0.08, L * 0.02]}
          name="uk-instructor-roof-beacon"
        >
          {/* White Illuminated Triangular Driving School Roof Prism */}
          <mesh
            rotation={[0, Math.PI / 2, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.15, 0.15, W * 0.48, 3]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#fef08a"
              emissiveIntensity={0.45}
              roughness={0.2}
            />
          </mesh>
          {/* Red "L" Plate Emblem on Front & Rear of Roof Sign */}
          {[-0.08, 0.08].map((zOff, idx) => (
            <mesh key={`l-badge-${idx}`} position={[0, 0.01, zOff]}>
              <boxGeometry args={[0.14, 0.12, 0.02]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#dc2626"
                emissiveIntensity={0.9}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * 1. MODERN HATCHBACK — Compact 2-box hot-hatch with steep rear tailgate & roof spoiler
 */
function HatchbackBody({
  vehicle,
  chassis,
  paintColor,
  skin,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.03;
  const isTransparent = skin.opacity < 1;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.96]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH * 0.42, -L * 0.48]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.94, lowerH * 0.78, L * 0.08]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH * 0.96, -L * 0.29]}
        rotation={[0.14, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.9, 0.12, L * 0.34]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, L * 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.84, cabinH, L * 0.58]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, -L * 0.19]}
        rotation={[0.52, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.82, cabinH * 0.95, 0.14]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH - 0.04, L * 0.09]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.82, 0.07, L * 0.56]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH + 0.01, L * 0.39]}
        rotation={[-0.18, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.8, 0.05, 0.22]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      <mesh position={[0, clearance + lowerH * 0.36, -L * 0.501]}>
        <boxGeometry args={[W * 0.62, lowerH * 0.42, 0.03]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          roughness={skin.roughness}
          metalness={skin.metalness}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (W * 0.53), clearance + lowerH + 0.08, -L * 0.14]}
          castShadow
        >
          <boxGeometry args={[0.14, 0.09, 0.16]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`hl-${side}`}
          position={[side * (W * 0.36), clearance + lowerH * 0.72, -L * 0.495]}
        >
          <boxGeometry args={[W * 0.18, 0.11, 0.04]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#bae6fd"
            emissiveIntensity={1.6}
          />
        </mesh>
      ))}

      <mesh position={[-W * 0.35, clearance + lowerH * 0.78, L * 0.482]}>
        <boxGeometry args={[W * 0.2, 0.12, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[W * 0.35, clearance + lowerH * 0.78, L * 0.482]}>
        <boxGeometry args={[W * 0.2, 0.12, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>

      <mesh position={[-W * 0.28, clearance + lowerH * 0.66, L * 0.484]}>
        <boxGeometry args={[0.12, 0.05, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.28, clearance + lowerH * 0.66, L * 0.484]}>
        <boxGeometry args={[0.12, 0.05, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightRight = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

/**
 * 2. EXECUTIVE SEDAN — Sleek 3-box luxury saloon with long bonnet & distinct rear boot deck
 */
function SedanBody({
  vehicle,
  chassis,
  paintColor,
  skin,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.03;
  const isTransparent = skin.opacity < 1;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.97]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH * 0.98, -L * 0.31]}
        rotation={[0.07, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.92, 0.1, L * 0.34]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH * 0.97, L * 0.36]}
        rotation={[-0.05, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.9, 0.1, L * 0.24]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.83, cabinH, L * 0.42]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, -L * 0.14]}
        rotation={[0.58, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.81, cabinH * 0.98, 0.12]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, L * 0.23]}
        rotation={[-0.56, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.81, cabinH * 0.96, 0.12]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH - 0.04, 0.06]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.81, 0.06, L * 0.38]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      <mesh position={[0, clearance + lowerH * 0.48, -L * 0.488]}>
        <boxGeometry args={[W * 0.52, lowerH * 0.56, 0.03]} />
        <meshStandardMaterial
          color={skin.trimColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>
      <mesh position={[0, clearance + lowerH * 0.48, -L * 0.491]}>
        <boxGeometry args={[W * 0.48, lowerH * 0.48, 0.02]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`trim-${side}`}
          position={[side * (W * 0.503), clearance + lowerH * 0.25, 0]}
        >
          <boxGeometry args={[0.02, 0.035, L * 0.58]} />
          <meshStandardMaterial
            color={skin.trimColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`mirror-${side}`}
          position={[side * (W * 0.53), clearance + lowerH + 0.08, -L * 0.11]}
          castShadow
        >
          <boxGeometry args={[0.15, 0.08, 0.16]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`hl-${side}`}
          position={[side * (W * 0.36), clearance + lowerH * 0.68, -L * 0.488]}
        >
          <boxGeometry args={[W * 0.19, 0.095, 0.04]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#e0f2fe"
            emissiveIntensity={1.65}
          />
        </mesh>
      ))}

      <mesh position={[-W * 0.34, clearance + lowerH * 0.72, L * 0.486]}>
        <boxGeometry args={[W * 0.24, 0.1, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[W * 0.34, clearance + lowerH * 0.72, L * 0.486]}>
        <boxGeometry args={[W * 0.24, 0.1, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>

      <mesh position={[-W * 0.28, clearance + lowerH * 0.61, L * 0.488]}>
        <boxGeometry args={[0.14, 0.045, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.28, clearance + lowerH * 0.61, L * 0.488]}>
        <boxGeometry args={[0.14, 0.045, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightRight = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

/**
 * 3. LARGE SUV — Tall, muscular 4x4 with high ground clearance, skid plates & roof rails
 */
function SuvBody({
  vehicle,
  chassis,
  paintColor,
  skin,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.5;
  const cabinH = (H - clearance) * 0.5;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.02;
  const isTransparent = skin.opacity < 1;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.97]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh position={[0, clearance + 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 1.01, 0.16, L * 0.94]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          roughness={skin.roughness}
          metalness={skin.metalness}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + 0.03, -L * 0.31]}
        rotation={[0.04, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.94, 0.1, L * 0.31]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, L * 0.09]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.89, cabinH, L * 0.64]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY, -L * 0.21]}
        rotation={[0.38, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.87, cabinH * 0.96, 0.14]} />
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH - 0.03, L * 0.09]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.88, 0.07, L * 0.63]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`rail-${side}`}
          position={[
            side * (W * 0.37),
            clearance + lowerH + cabinH + 0.035,
            L * 0.1,
          ]}
          castShadow
        >
          <boxGeometry args={[0.045, 0.05, L * 0.54]} />
          <meshStandardMaterial
            color={skin.trimColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      <mesh position={[0, clearance + 0.11, -L * 0.485]}>
        <boxGeometry args={[W * 0.62, 0.18, 0.04]} />
        <meshStandardMaterial
          color={skin.trimColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>
      <mesh position={[0, clearance + lowerH * 0.64, -L * 0.488]}>
        <boxGeometry args={[W * 0.56, lowerH * 0.44, 0.03]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`mirror-${side}`}
          position={[side * (W * 0.54), clearance + lowerH + 0.12, -L * 0.15]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.13, 0.16]} />
          <meshStandardMaterial
            color={skin.secondaryColor}
            roughness={skin.roughness}
            metalness={skin.metalness}
          />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={`hl-${side}`}
          position={[side * (W * 0.37), clearance + lowerH * 0.72, -L * 0.488]}
        >
          <boxGeometry args={[W * 0.18, 0.15, 0.04]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#bae6fd"
            emissiveIntensity={1.65}
          />
        </mesh>
      ))}

      <mesh position={[-W * 0.41, clearance + lowerH * 0.76, L * 0.486]}>
        <boxGeometry args={[0.14, 0.34, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[W * 0.41, clearance + lowerH * 0.76, L * 0.486]}>
        <boxGeometry args={[0.14, 0.34, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.85}
        />
      </mesh>

      <mesh position={[-W * 0.32, clearance + lowerH * 0.56, L * 0.488]}>
        <boxGeometry args={[0.12, 0.07, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.32, clearance + lowerH * 0.56, L * 0.488]}>
        <boxGeometry args={[0.12, 0.07, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightRight = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

/**
 * 4. FLYING TESLA ROADSTER (SPACEX HOVER-THRUSTER EDITION)
 */
function RoadsterBody({
  vehicle,
  chassis,
  paintColor,
  skin,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const isTransparent = skin.opacity < 1;

  const { fuselageGeo, canopyGeo } = useMemo(() => {
    const halfL = L / 2;

    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.98, clearance + 0.04);
    bodyShape.lineTo(-halfL * 0.99, clearance + 0.16);
    bodyShape.quadraticCurveTo(
      -halfL * 0.72,
      H * 0.56,
      -halfL * 0.36,
      H * 0.62
    );
    bodyShape.lineTo(halfL * 0.35, H * 0.66);
    bodyShape.quadraticCurveTo(
      halfL * 0.78,
      H * 0.7,
      halfL * 0.97,
      H * 0.64
    );
    bodyShape.lineTo(halfL * 0.98, clearance + 0.18);
    bodyShape.lineTo(halfL * 0.86, clearance + 0.04);
    bodyShape.closePath();

    const bodyExtrudeWidth = W * 0.82;
    const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, {
      depth: bodyExtrudeWidth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.08,
    });
    bodyGeom.rotateY(Math.PI / 2);
    bodyGeom.translate(-bodyExtrudeWidth / 2, 0, 0);
    bodyGeom.computeVertexNormals();

    const glassShape = new THREE.Shape();
    glassShape.moveTo(-halfL * 0.44, H * 0.58);
    glassShape.quadraticCurveTo(
      -halfL * 0.12,
      H * 1.02,
      halfL * 0.08,
      H * 0.98
    );
    glassShape.quadraticCurveTo(
      halfL * 0.46,
      H * 0.92,
      halfL * 0.68,
      H * 0.64
    );
    glassShape.lineTo(-halfL * 0.44, H * 0.58);

    const glassExtrudeWidth = W * 0.68;
    const glassGeom = new THREE.ExtrudeGeometry(glassShape, {
      depth: glassExtrudeWidth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.06,
    });
    glassGeom.rotateY(Math.PI / 2);
    glassGeom.translate(-glassExtrudeWidth / 2, 0, 0);
    glassGeom.computeVertexNormals();

    return { fuselageGeo: bodyGeom, canopyGeo: glassGeom };
  }, [L, W, H, clearance]);

  return (
    <group>
      {/* Central extruded aerodynamic wedge fuselage */}
      <mesh geometry={fuselageGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={paintColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
          transparent={isTransparent}
          opacity={skin.opacity}
        />
      </mesh>

      {/* Teardrop cockpit dome */}
      <mesh geometry={canopyGeo} castShadow>
        <meshStandardMaterial
          color={skin.glassColor}
          metalness={skin.glassMetalness}
          roughness={skin.glassRoughness}
        />
      </mesh>

      {/* Targa-style roof arch bar & flying buttresses */}
      {[-1, 1].map((side) => (
        <mesh
          key={`buttress-${side}`}
          position={[side * (W * 0.34), H * 0.78, L * 0.14]}
          rotation={[-0.28, 0, side * -0.12]}
          castShadow
        >
          <boxGeometry args={[0.09, 0.08, L * 0.38]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      {/* Wide-body sculpted front fenders */}
      {[-1, 1].map((side) => (
        <mesh
          key={`front-fender-${side}`}
          position={[side * (W * 0.38), H * 0.44, -L * 0.29]}
          rotation={[0.08, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.24, H * 0.46, L * 0.34]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
            transparent={isTransparent}
            opacity={skin.opacity}
          />
        </mesh>
      ))}

      {/* Wide-body muscular rear haunches */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rear-fender-${side}`}
          position={[side * (W * 0.39), H * 0.48, L * 0.28]}
          rotation={[-0.04, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.24, H * 0.52, L * 0.38]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
            transparent={isTransparent}
            opacity={skin.opacity}
          />
        </mesh>
      ))}

      {/* DEPLOYABLE AERO FLIGHT WINGLETS (Left & Right Swept Stabilizer Foil) */}
      {[-1, 1].map((side) => (
        <group key={`flight-winglet-${side}`}>
          <mesh
            position={[side * (W * 0.57), H * 0.34, 0.08]}
            rotation={[0.04, side * -0.28, side * 0.08]}
            castShadow
          >
            <boxGeometry args={[0.38, 0.032, L * 0.36]} />
            <meshStandardMaterial
              color={skin.secondaryColor}
              metalness={skin.metalness}
              roughness={skin.roughness}
            />
          </mesh>
          <mesh
            position={[side * (W * 0.74), H * 0.36, 0.08]}
            rotation={[0.04, side * -0.28, side * 0.08]}
          >
            <boxGeometry args={[0.03, 0.036, L * 0.34]} />
            <meshStandardMaterial
              color={skin.id === 'wooden' ? '#fbbf24' : '#7dd3fc'}
              emissive={skin.id === 'wooden' ? '#d97706' : '#38bdf8'}
              emissiveIntensity={2.2}
            />
          </mesh>
        </group>
      ))}

      {/* Front aero splitter lip with flight beacon */}
      <mesh position={[0, clearance + 0.03, -L * 0.485]} castShadow>
        <boxGeometry args={[W * 0.92, 0.045, 0.22]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>
      <mesh position={[0, clearance + 0.035, -L * 0.498]}>
        <boxGeometry args={[W * 0.56, 0.018, 0.02]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Rear venturi diffuser */}
      <mesh position={[0, clearance + 0.1, L * 0.46]} castShadow>
        <boxGeometry args={[W * 0.88, 0.16, 0.18]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      {/* SPACEX COLD-GAS CENTRAL & DUAL ROCKET THRUSTER NOZZLES + ION PLUME */}
      <group position={[0, clearance + 0.22, L * 0.49]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.09, 0.14, 20]} />
          <meshStandardMaterial
            color={skin.id === 'wooden' ? '#b45309' : '#334155'}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Glowing central plasma plume cone */}
        <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.11, 0.38, 18]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (lightRefs) lightRefs.current.thrusterGlow = mat;
            }}
            color="#bae6fd"
            emissive="#38bdf8"
            emissiveIntensity={2.5}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Twin auxiliary vector thrusters */}
        {[-1, 1].map((side) => (
          <group key={`aux-thruster-${side}`} position={[side * 0.24, -0.02, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.07, 0.05, 0.11, 16]} />
              <meshStandardMaterial
                color={skin.id === 'wooden' ? '#b45309' : '#334155'}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.055, 0.22, 14]} />
              <meshStandardMaterial
                color="#7dd3fc"
                emissive="#0ea5e9"
                emissiveIntensity={2.1}
                transparent
                opacity={0.78}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Active elevated rear aero flight wing */}
      <mesh
        position={[0, H * 0.72, L * 0.45]}
        rotation={[-0.16, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.9, 0.035, 0.18]} />
        <meshStandardMaterial
          color={skin.secondaryColor}
          metalness={skin.metalness}
          roughness={skin.roughness}
        />
      </mesh>

      {/* Sleek aerodynamic side camera mirrors */}
      {[-1, 1].map((side) => (
        <mesh
          key={`roadster-mirror-${side}`}
          position={[side * (W * 0.49), H * 0.6, -L * 0.12]}
          rotation={[0, side * -0.2, 0]}
          castShadow
        >
          <boxGeometry args={[0.14, 0.055, 0.12]} />
          <meshStandardMaterial
            color={paintColor}
            metalness={skin.metalness}
            roughness={skin.roughness}
          />
        </mesh>
      ))}

      {/* Razor-thin angled laser-LED headlights */}
      {[-1, 1].map((side) => (
        <mesh
          key={`roadster-hl-${side}`}
          position={[side * (W * 0.35), H * 0.39, -L * 0.465]}
          rotation={[0.15, side * 0.22, side * -0.08]}
        >
          <boxGeometry args={[W * 0.22, 0.045, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#7dd3fc"
            emissiveIntensity={2.2}
          />
        </mesh>
      ))}

      {/* Full-width futuristic crimson LED rear tail-light blade */}
      <mesh position={[0, H * 0.58, L * 0.482]}>
        <boxGeometry args={[W * 0.84, 0.055, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightBar = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.1}
        />
      </mesh>

      {/* Dual Reverse LED Indicators in Rear Diffuser */}
      <mesh position={[-W * 0.38, clearance + 0.16, L * 0.486]}>
        <boxGeometry args={[0.14, 0.035, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.38, clearance + 0.16, L * 0.486]}>
        <boxGeometry args={[0.14, 0.035, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightRight = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
    </group>
  );
}

export function VehicleModel({
  vehicle,
  wheelRefs,
  lightRefs,
  impactFlash = false,
  customizationOverride,
  isTrafficObstacle = false,
}: VehicleModelProps) {
  const { customization } = useCustomization();
  const activeCarConfig: CarCustomization = useMemo(
    () => ({
      ...customization.car,
      ...(customizationOverride ?? {}),
    }),
    [customization.car, customizationOverride]
  );

  // If this is a parked traffic obstacle and applyToTraffic is false, use factory skin
  const effectiveSkinId =
    isTrafficObstacle && !activeCarConfig.applyToTraffic
      ? 'factory'
      : activeCarConfig.skinId;

  const skin = getCarSkinById(effectiveSkinId);
  const effectiveAccessory = isTrafficObstacle
    ? skin.id === 'wooden'
      ? 'windup-key'
      : skin.id === 'lego'
        ? 'lego-studs'
        : 'none'
    : resolveEffectiveAccessory(activeCarConfig);

  const chassis = getChassisSpec(vehicle);

  // Determine effective paint color
  let basePaintColor = vehicle.bodyColor;
  if (!isTrafficObstacle && activeCarConfig.customColor !== 'default') {
    basePaintColor = activeCarConfig.customColor;
  } else if (skin.id !== 'factory') {
    basePaintColor = skin.primaryColor;
  }
  const paintColor = impactFlash ? '#f97316' : basePaintColor;

  const {
    frontAxleZ,
    rearAxleZ,
    wheelRadius,
    wheelWidth,
    halfTrackX,
    isFlyingVehicle,
    hoverAltitudeMetres = 0,
  } = chassis;

  const flightLiftY = isFlyingVehicle ? hoverAltitudeMetres : 0;

  return (
    <group name={`vehicle-model-${vehicle.id}-${skin.id}`}>
      {/* Ground-plane Ion Hover Telemetry Ring for the Flying Tesla Roadster */}
      {isFlyingVehicle && (
        <group position={[0, 0.015, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={[
                vehicle.dimensions.width * 0.42,
                vehicle.dimensions.width * 0.52,
                40,
              ]}
            />
            <meshStandardMaterial
              ref={(mat) => {
                if (lightRefs) lightRefs.current.hoverRingGlow = mat;
              }}
              color={skin.id === 'wooden' ? '#fbbf24' : '#38bdf8'}
              emissive={skin.id === 'wooden' ? '#d97706' : '#0ea5e9'}
              emissiveIntensity={1.6}
              transparent
              opacity={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Main Vehicle / Hovering Fuselage Group */}
      <group position={[0, flightLiftY, 0]}>
        {vehicle.category === 'hatchback' && (
          <HatchbackBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            skin={skin}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'sedan' && (
          <SedanBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            skin={skin}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'suv' && (
          <SuvBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            skin={skin}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'sports' && (
          <RoadsterBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            skin={skin}
            lightRefs={lightRefs}
          />
        )}

        {/* Creative 3D Skin & Accessory Sculptural Overlays */}
        <CreativeSkin3DOverlays
          vehicle={vehicle}
          chassis={chassis}
          skin={skin}
          paintColor={paintColor}
          accessoryId={effectiveAccessory}
        />

        {/* 4 Independent Wheel / Hover-Turbine Assemblies */}
        <group position={[-halfTrackX, wheelRadius, frontAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={true}
            category={vehicle.category}
            skin={skin}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSpin = node;
            }}
          />
        </group>

        <group position={[halfTrackX, wheelRadius, frontAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={true}
            category={vehicle.category}
            skin={skin}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSpin = node;
            }}
          />
        </group>

        <group position={[-halfTrackX, wheelRadius, rearAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={false}
            category={vehicle.category}
            skin={skin}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearLeftSpin = node;
            }}
          />
        </group>

        <group position={[halfTrackX, wheelRadius, rearAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={false}
            category={vehicle.category}
            skin={skin}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearRightSpin = node;
            }}
          />
        </group>
      </group>
    </group>
  );
}
