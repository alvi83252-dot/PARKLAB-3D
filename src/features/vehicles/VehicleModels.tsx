/**
 * PARKLAB 3D — Procedural 3D Vehicle Models
 * Distinct procedural Three.js geometry for the 4 selectable vehicles:
 * 1. Modern Hatchback
 * 2. Executive Sedan
 * 3. Large SUV
 * 4. Flying Tesla Roadster (SpaceX Cold-Gas Rocket Thrusters, Vectored Hover-Turbine Pods,
 *    Deployable Aero Flight Winglets, Extruded Wedge Fuselage & Ground Ion Downwash Ring)
 *
 * Coordinate convention (Part 3.1):
 * - Y is vertical (y = 0 is ground contact plane).
 * - X is lateral width (-width/2 to +width/2).
 * - Z is longitudinal length (-length/2 to +length/2).
 * - Local negative Z (-Z) is forward.
 */

import { useMemo, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { VehicleDefinition } from './types';
import { getChassisSpec, type VehicleChassisSpec } from './vehicles';

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
}

interface WheelAssemblyProps {
  radius: number;
  width: number;
  isRightSide: boolean;
  isFront: boolean;
  category: VehicleDefinition['category'];
  steerRef?: (node: THREE.Group | null) => void;
  spinRef?: (node: THREE.Group | null) => void;
}

function WheelAssembly({
  radius,
  width,
  isRightSide,
  isFront,
  category,
  steerRef,
  spinRef,
}: WheelAssemblyProps) {
  const isSports = category === 'sports';
  const isSuv = category === 'suv';
  const rimRadius = radius * (isSports ? 0.76 : isSuv ? 0.62 : 0.67);
  const spokeCount = isSports ? 6 : isSuv ? 6 : 5;
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
  // angled hover-fan vector thruster nacelle with a glowing cyan ion thruster ring!
  const hoverTiltAngle = isSports
    ? (isRightSide ? -1 : 1) * 1.12 // ~64 deg hover vector tilt
    : 0;

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
              color={isSports ? '#38bdf8' : '#64748b'}
              emissive={isSports ? '#0284c7' : '#000000'}
              emissiveIntensity={isSports ? 1.2 : 0}
              metalness={0.7}
              roughness={0.25}
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
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={2.4}
            />
          </mesh>
        )}

        {/* Rotating wheel / hover-turbine impeller assembly */}
        <group ref={spinRef}>
          {/* Outer rubber tyre / carbon turbine shroud */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[radius, radius, width, 24]} />
            <meshStandardMaterial
              color={isSports ? '#0f172a' : '#14171f'}
              roughness={isSports ? 0.4 : 0.85}
              metalness={isSports ? 0.65 : 0.1}
            />
          </mesh>

          {/* Inner wheel barrel / hover-fan core */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[rimRadius, rimRadius, width * 1.01, 20]} />
            <meshStandardMaterial
              color={isSports ? '#0c4a6e' : isSuv ? '#334155' : '#94a3b8'}
              emissive={isSports ? '#0ea5e9' : '#000000'}
              emissiveIntensity={isSports ? 0.9 : 0}
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>

          {/* Alloy spokes / turbine blades */}
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
                color={isSports ? '#e0f2fe' : isSuv ? '#cbd5e1' : '#e2e8f0'}
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
          ))}

          {/* Center hub cap */}
          <mesh
            position={[isRightSide ? width * 0.51 : -width * 0.51, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[rimRadius * 0.24, rimRadius * 0.24, 0.025, 14]}
            />
            <meshStandardMaterial
              color={isSports ? '#38bdf8' : '#0f172a'}
              emissive={isSports ? '#38bdf8' : '#000000'}
              emissiveIntensity={isSports ? 1.8 : 0}
              metalness={0.8}
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
  lightRefs?: MutableRefObject<VehicleLightRefs>;
}

/**
 * 1. MODERN HATCHBACK — Compact 2-box hot-hatch with steep rear tailgate & roof spoiler
 */
function HatchbackBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.03;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.96]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={0.55}
          roughness={0.28}
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
          metalness={0.55}
          roughness={0.28}
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
          metalness={0.6}
          roughness={0.24}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, L * 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.84, cabinH, L * 0.58]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.85}
          roughness={0.12}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, -L * 0.19]}
        rotation={[0.52, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.82, cabinH * 0.95, 0.14]} />
        <meshStandardMaterial
          color="#0b1324"
          metalness={0.9}
          roughness={0.08}
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
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH + 0.01, L * 0.39]}
        rotation={[-0.18, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.8, 0.05, 0.22]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.35} />
      </mesh>

      <mesh position={[0, clearance + lowerH * 0.36, -L * 0.501]}>
        <boxGeometry args={[W * 0.62, lowerH * 0.42, 0.03]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.2} />
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
            metalness={0.6}
            roughness={0.25}
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
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.03;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.97]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={0.68}
          roughness={0.22}
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
          metalness={0.7}
          roughness={0.2}
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
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.83, cabinH, L * 0.42]} />
        <meshStandardMaterial
          color="#0a1120"
          metalness={0.88}
          roughness={0.1}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, -L * 0.14]}
        rotation={[0.58, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.81, cabinH * 0.98, 0.12]} />
        <meshStandardMaterial color="#0a1120" metalness={0.9} roughness={0.08} />
      </mesh>

      <mesh
        position={[0, cabinCenterY - 0.02, L * 0.23]}
        rotation={[-0.56, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.81, cabinH * 0.96, 0.12]} />
        <meshStandardMaterial color="#0a1120" metalness={0.9} roughness={0.08} />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH - 0.04, 0.06]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.81, 0.06, L * 0.38]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, clearance + lowerH * 0.48, -L * 0.488]}>
        <boxGeometry args={[W * 0.52, lowerH * 0.56, 0.03]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
      </mesh>
      <mesh position={[0, clearance + lowerH * 0.48, -L * 0.491]}>
        <boxGeometry args={[W * 0.48, lowerH * 0.48, 0.02]} />
        <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`trim-${side}`}
          position={[side * (W * 0.503), clearance + lowerH * 0.25, 0]}
        >
          <boxGeometry args={[0.02, 0.035, L * 0.58]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
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
            metalness={0.7}
            roughness={0.2}
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
function SuvBody({ vehicle, chassis, paintColor, lightRefs }: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.5;
  const cabinH = (H - clearance) * 0.5;
  const lowerCenterY = clearance + lowerH / 2;
  const cabinCenterY = clearance + lowerH + cabinH / 2 - 0.02;

  return (
    <group>
      <mesh position={[0, lowerCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, lowerH, L * 0.97]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={0.5}
          roughness={0.32}
        />
      </mesh>

      <mesh position={[0, clearance + 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 1.01, 0.16, L * 0.94]} />
        <meshStandardMaterial color="#18181b" roughness={0.75} metalness={0.15} />
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
          metalness={0.52}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, cabinCenterY, L * 0.09]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.89, cabinH, L * 0.64]} />
        <meshStandardMaterial
          color="#09101d"
          metalness={0.85}
          roughness={0.12}
        />
      </mesh>

      <mesh
        position={[0, cabinCenterY, -L * 0.21]}
        rotation={[0.38, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.87, cabinH * 0.96, 0.14]} />
        <meshStandardMaterial color="#09101d" metalness={0.88} roughness={0.1} />
      </mesh>

      <mesh
        position={[0, clearance + lowerH + cabinH - 0.03, L * 0.09]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.88, 0.07, L * 0.63]} />
        <meshStandardMaterial
          color={paintColor}
          metalness={0.55}
          roughness={0.28}
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
            color="#cbd5e1"
            metalness={0.85}
            roughness={0.22}
          />
        </mesh>
      ))}

      <mesh position={[0, clearance + 0.11, -L * 0.485]}>
        <boxGeometry args={[W * 0.62, 0.18, 0.04]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, clearance + lowerH * 0.64, -L * 0.488]}>
        <boxGeometry args={[W * 0.56, lowerH * 0.44, 0.03]} />
        <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.35} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`mirror-${side}`}
          position={[side * (W * 0.54), clearance + lowerH + 0.12, -L * 0.15]}
          castShadow
        >
          <boxGeometry args={[0.16, 0.13, 0.16]} />
          <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.4} />
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
 * Features:
 * - Extruded aerodynamic hypercar wedge fuselage & dark panoramic glass canopy
 * - Deployable swept aerodynamic flight winglets with cyan plasma leading edges
 * - Underbody anti-gravity ion repulsion pads
 * - Rear SpaceX cold-gas central & twin vector rocket nozzles + glowing ion thruster plume
 * - Full-width cybernetic crimson LED tail-light blade
 */
function RoadsterBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;

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
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      {/* Dark tinted teardrop glass cockpit dome */}
      <mesh geometry={canopyGeo} castShadow>
        <meshStandardMaterial
          color="#050811"
          metalness={0.95}
          roughness={0.06}
        />
      </mesh>

      {/* Targa-style body-colored roof arch bar & flying buttresses */}
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
            metalness={0.78}
            roughness={0.16}
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
            metalness={0.78}
            roughness={0.16}
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
            metalness={0.78}
            roughness={0.16}
          />
        </mesh>
      ))}

      {/* DEPLOYABLE AERO FLIGHT WINGLETS (Left & Right Swept Stabilizer Foil) */}
      {[-1, 1].map((side) => (
        <group key={`flight-winglet-${side}`}>
          {/* Carbon-fibre swept winglet foil */}
          <mesh
            position={[side * (W * 0.57), H * 0.34, 0.08]}
            rotation={[0.04, side * -0.28, side * 0.08]}
            castShadow
          >
            <boxGeometry args={[0.38, 0.032, L * 0.36]} />
            <meshStandardMaterial
              color="#0f172a"
              metalness={0.75}
              roughness={0.22}
            />
          </mesh>
          {/* Glowing cyan plasma edge strip along winglet tip */}
          <mesh
            position={[side * (W * 0.74), H * 0.36, 0.08]}
            rotation={[0.04, side * -0.28, side * 0.08]}
          >
            <boxGeometry args={[0.03, 0.036, L * 0.34]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#38bdf8"
              emissiveIntensity={2.2}
            />
          </mesh>
        </group>
      ))}

      {/* Carbon-fibre front aero splitter lip with cyan flight beacon */}
      <mesh position={[0, clearance + 0.03, -L * 0.485]} castShadow>
        <boxGeometry args={[W * 0.92, 0.045, 0.22]} />
        <meshStandardMaterial color="#0f141c" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh position={[0, clearance + 0.035, -L * 0.498]}>
        <boxGeometry args={[W * 0.56, 0.018, 0.02]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={2.0}
        />
      </mesh>

      {/* Aggressive rear carbon-fibre venturi diffuser */}
      <mesh position={[0, clearance + 0.1, L * 0.46]} castShadow>
        <boxGeometry args={[W * 0.88, 0.16, 0.18]} />
        <meshStandardMaterial color="#0b0f17" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* SPACEX COLD-GAS CENTRAL & DUAL ROCKET THRUSTER NOZZLES + ION PLUME */}
      <group position={[0, clearance + 0.22, L * 0.49]}>
        {/* Central main SpaceX vector thruster nozzle */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.09, 0.14, 20]} />
          <meshStandardMaterial
            color="#334155"
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
                color="#334155"
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

      {/* Active elevated rear carbon aero flight wing */}
      <mesh
        position={[0, H * 0.72, L * 0.45]}
        rotation={[-0.16, 0, 0]}
        castShadow
      >
        <boxGeometry args={[W * 0.9, 0.035, 0.18]} />
        <meshStandardMaterial color="#0f141c" metalness={0.65} roughness={0.25} />
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
            metalness={0.8}
            roughness={0.15}
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
}: VehicleModelProps) {
  const chassis = getChassisSpec(vehicle);
  const paintColor = impactFlash ? '#f97316' : vehicle.bodyColor;

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
    <group name={`vehicle-model-${vehicle.id}`}>
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
              color="#38bdf8"
              emissive="#0ea5e9"
              emissiveIntensity={1.6}
              transparent
              opacity={0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Main Vehicle / Hovering Fuselage Group (Elevated when Flying Roadster is active) */}
      <group position={[0, flightLiftY, 0]}>
        {vehicle.category === 'hatchback' && (
          <HatchbackBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'sedan' && (
          <SedanBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'suv' && (
          <SuvBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            lightRefs={lightRefs}
          />
        )}
        {vehicle.category === 'sports' && (
          <RoadsterBody
            vehicle={vehicle}
            chassis={chassis}
            paintColor={paintColor}
            lightRefs={lightRefs}
          />
        )}

        {/* 4 Independent Wheel / Hover-Turbine Assemblies */}
        {/* Front Left (-X, -Z) */}
        <group position={[-halfTrackX, wheelRadius, frontAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={true}
            category={vehicle.category}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSpin = node;
            }}
          />
        </group>

        {/* Front Right (+X, -Z) */}
        <group position={[halfTrackX, wheelRadius, frontAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={true}
            category={vehicle.category}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSpin = node;
            }}
          />
        </group>

        {/* Rear Left (-X, +Z) */}
        <group position={[-halfTrackX, wheelRadius, rearAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={false}
            category={vehicle.category}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearLeftSpin = node;
            }}
          />
        </group>

        {/* Rear Right (+X, +Z) */}
        <group position={[halfTrackX, wheelRadius, rearAxleZ]}>
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={false}
            category={vehicle.category}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearRightSpin = node;
            }}
          />
        </group>
      </group>
    </group>
  );
}
