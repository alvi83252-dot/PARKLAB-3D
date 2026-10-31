/**
 * PARKLAB 3D — Procedural 3D Vehicle Models with Real-Time Crash Deformation, Dents & Detachable Parts
 * High-craft procedural Three.js geometry and clearcoat physical materials for the 4 vehicles:
 * 1. Modern Hatchback
 * 2. Executive Sedan
 * 3. Large SUV
 * 4. New Tesla Roadster (Centrepiece 2nd-Gen Electric Sports Car)
 *
 * Coordinate convention:
 * - Y is vertical (y = 0 is ground contact plane).
 * - X is lateral width (-width/2 to +width/2).
 * - Z is longitudinal length (-length/2 to +length/2).
 * - Local negative Z (-Z) is forward.
 */

import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  DetachablePartId,
  PartCondition,
  VehicleDamageState,
  VehicleDefinition,
} from './types';
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
  damageState?: VehicleDamageState;
  customizationOverride?: Partial<CarCustomization>;
  isTrafficObstacle?: boolean;
}

function getPartCondition(
  damageState: VehicleDamageState | undefined,
  partId: DetachablePartId
): PartCondition {
  return damageState?.parts?.[partId] ?? 'intact';
}

/**
 * Helper to extrude a smooth 2D side-profile Shape (defined in Z-Y plane)
 * across the X axis with high-segment curved bevels for organic automotive bodywork.
 */
function createSculptedProfileGeometry(
  shape: THREE.Shape,
  width: number,
  bevelSize = 0.055,
  bevelThickness = 0.075,
  curveSegments = 28
): THREE.ExtrudeGeometry {
  const innerDepth = Math.max(0.1, width - bevelThickness * 2);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize,
    bevelThickness,
    curveSegments,
  });
  geom.rotateY(Math.PI / 2);
  geom.translate(-innerDepth / 2, 0, 0);
  geom.computeVertexNormals();
  return geom;
}

interface WheelAssemblyProps {
  radius: number;
  width: number;
  isRightSide: boolean;
  isFront: boolean;
  category: VehicleDefinition['category'];
  vehicleId?: string;
  steerRef?: (node: THREE.Group | null) => void;
  spinRef?: (node: THREE.Group | null) => void;
}

function WheelAssembly({
  radius,
  width,
  isRightSide,
  isFront,
  category,
  vehicleId,
  steerRef,
  spinRef,
}: WheelAssemblyProps) {
  const isRoadster = vehicleId === 'tesla-roadster';
  const isHypercar = vehicleId === 'apex-hypercar';
  const isTaycan = vehicleId === 'porsche-taycan';
  const isAmg = vehicleId === 'amg-gt';
  const isSports =
    category === 'sports' ||
    category === 'electric-roadster' ||
    isTaycan ||
    isAmg ||
    isHypercar;
  const isSuv = category === 'suv';

  const rimRadius =
    radius *
    (isHypercar || isRoadster
      ? 0.79
      : isTaycan || isAmg
        ? 0.76
        : isSuv
          ? 0.65
          : 0.7);
  const spokeCount = isTaycan || isAmg ? 10 : isSuv ? 6 : 5;
  const caliperSign = isFront ? 1 : -1;
  const sideSign = isRightSide ? 1 : -1;

  const spokeAngles = useMemo(
    () =>
      Array.from(
        { length: spokeCount },
        (_, idx) => (idx * Math.PI * 2) / spokeCount
      ),
    [spokeCount]
  );

  const drillAngles = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => (idx * Math.PI * 2) / 12),
    []
  );

  const caliperColor =
    isRoadster || isHypercar
      ? '#dc2626'
      : isAmg
        ? '#eab308'
        : isTaycan
          ? '#f8fafc'
          : '#475569';

  return (
    <group ref={steerRef}>
      {/* Stationary ventilated & cross-drilled carbon-ceramic brake rotor disc */}
      <group position={[sideSign * width * 0.12, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[rimRadius * 0.78, rimRadius * 0.78, 0.026, 28]} />
          <meshStandardMaterial
            color={isSports ? '#475569' : '#64748b'}
            metalness={0.9}
            roughness={0.24}
          />
        </mesh>
        {/* Cross-drilled rotor cooling ring detail */}
        {drillAngles.map((ang, idx) => (
          <mesh
            key={idx}
            position={[
              sideSign * 0.015,
              Math.cos(ang) * rimRadius * 0.56,
              Math.sin(ang) * rimRadius * 0.56,
            ]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.008, 0.008, 0.006, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* Stationary 6-piston Brembo performance brake caliper */}
      <mesh
        position={[
          sideSign * width * 0.2,
          radius * 0.15,
          caliperSign * rimRadius * 0.5,
        ]}
        rotation={[caliperSign * -0.35, 0, 0]}
      >
        <boxGeometry args={[width * 0.36, radius * 0.4, radius * 0.23]} />
        <meshPhysicalMaterial
          color={caliperColor}
          metalness={0.55}
          roughness={0.2}
          clearcoat={0.95}
        />
      </mesh>

      {/* Rotating tyre & forged alloy rim assembly */}
      <group ref={spinRef}>
        {/* Outer rubber tyre tread */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[radius, radius, width, 36]} />
          <meshStandardMaterial
            color="#101217"
            roughness={0.78}
            metalness={0.1}
          />
        </mesh>

        {/* Sculpted tyre sidewall shoulder */}
        <mesh
          position={[sideSign * width * 0.492, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <ringGeometry args={[rimRadius * 0.97, radius * 0.985, 36]} />
          <meshStandardMaterial
            color="#161922"
            roughness={0.68}
            metalness={0.14}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner dark alloy wheel barrel */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[rimRadius, rimRadius, width * 0.96, 32]} />
          <meshStandardMaterial
            color={isSports ? '#0b0e14' : isSuv ? '#1e293b' : '#334155'}
            metalness={0.86}
            roughness={0.22}
          />
        </mesh>

        {/* Outer alloy rim lip ring (Crimson pinstripe on Hypercar & Roadster) */}
        <mesh
          position={[sideSign * width * 0.488, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <ringGeometry args={[rimRadius * 0.89, rimRadius * 1.0, 36]} />
          <meshStandardMaterial
            color={
              isHypercar
                ? '#dc2626'
                : isRoadster
                  ? '#27272a'
                  : isTaycan
                    ? '#e2e8f0'
                    : '#cbd5e1'
            }
            metalness={0.92}
            roughness={0.16}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Sculpted twin-blade / Roadster Aero-Dish / Taycan Aero / V-spoke wheel spokes */}
        {spokeAngles.map((angle, i) => (
          <group key={i} rotation={[angle, 0, 0]}>
            {isRoadster ? (
              <>
                {/* Brushed-Silver Concave Aero-Dish Sector between the 5 Gloss-Black Star Spokes (RDSTR Studio Concept) */}
                <mesh
                  position={[sideSign * width * 0.452, 0, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <ringGeometry
                    args={[
                      rimRadius * 0.24,
                      rimRadius * 0.9,
                      20,
                      1,
                      Math.PI / 2 + 0.16,
                      (Math.PI * 2) / 5 - 0.32,
                    ]}
                  />
                  <meshPhysicalMaterial
                    color="#d8dee9"
                    metalness={0.91}
                    roughness={0.15}
                    clearcoat={0.75}
                    clearcoatRoughness={0.08}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                {/* Inner dark aero vent cutout near hub */}
                <mesh
                  position={[sideSign * width * 0.458, 0, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <ringGeometry
                    args={[
                      rimRadius * 0.22,
                      rimRadius * 0.34,
                      12,
                      1,
                      Math.PI / 2 + 0.25,
                      (Math.PI * 2) / 5 - 0.5,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#07090e"
                    metalness={0.8}
                    roughness={0.25}
                    side={THREE.DoubleSide}
                  />
                </mesh>

                {/* Gloss-Black Twin-Ribbed Star Spoke (Left & Right Blade) */}
                {[-1, 1].map((ribSide) => (
                  <mesh
                    key={`rib-${ribSide}`}
                    position={[
                      sideSign * width * 0.482,
                      rimRadius * 0.47,
                      ribSide * rimRadius * 0.048,
                    ]}
                    rotation={[ribSide * -0.045, 0, 0]}
                  >
                    <boxGeometry
                      args={[width * 0.085, rimRadius * 0.86, rimRadius * 0.068]}
                    />
                    <meshPhysicalMaterial
                      color="#090b10"
                      metalness={0.86}
                      roughness={0.12}
                      clearcoat={1}
                    />
                  </mesh>
                ))}

                {/* Machined Silver Inner Rib Slot between the Twin Black Blades */}
                <mesh
                  position={[sideSign * width * 0.47, rimRadius * 0.46, 0]}
                >
                  <boxGeometry
                    args={[width * 0.065, rimRadius * 0.8, rimRadius * 0.026]}
                  />
                  <meshStandardMaterial
                    color="#cbd5e1"
                    metalness={0.94}
                    roughness={0.14}
                  />
                </mesh>
              </>
            ) : (
              <mesh
                position={[
                  sideSign * width * 0.465,
                  rimRadius * 0.45,
                  isHypercar ? (i % 2 === 0 ? 0.018 : -0.018) : isSports ? 0.01 : 0,
                ]}
                rotation={[
                  isHypercar ? (i % 2 === 0 ? 0.14 : -0.14) : isSports ? 0.06 : 0,
                  0,
                  0,
                ]}
              >
                <boxGeometry
                  args={[
                    width * 0.09,
                    rimRadius * 0.88,
                    isTaycan || isAmg
                      ? rimRadius * 0.11
                      : isSports
                        ? rimRadius * 0.17
                        : rimRadius * 0.16,
                  ]}
                />
                <meshPhysicalMaterial
                  color={
                    isHypercar
                      ? '#27272a'
                      : isTaycan
                        ? i % 2 === 0
                          ? '#f1f5f9'
                          : '#1e293b'
                        : isAmg
                          ? '#334155'
                          : isSuv
                            ? '#94a3b8'
                            : '#e2e8f0'
                  }
                  metalness={0.9}
                  roughness={0.18}
                  clearcoat={0.85}
                />
              </mesh>
            )}
          </group>
        ))}

        {/* Center-lock hub cap & performance ring */}
        <mesh
          position={[sideSign * width * 0.5, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry
            args={[rimRadius * 0.22, rimRadius * 0.22, 0.028, 24]}
          />
          <meshStandardMaterial
            color={isSports ? '#09090b' : '#0f172a'}
            metalness={0.88}
            roughness={0.18}
          />
        </mesh>
        {isSports && (
          <mesh
            position={[sideSign * width * 0.516, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <ringGeometry args={[rimRadius * 0.11, rimRadius * 0.17, 24]} />
            <meshStandardMaterial
              color={isAmg ? '#eab308' : isTaycan ? '#cbd5e1' : '#dc2626'}
              emissive={isAmg ? '#ca8a04' : isTaycan ? '#94a3b8' : '#dc2626'}
              emissiveIntensity={0.65}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

interface BodySectionProps {
  vehicle: VehicleDefinition;
  chassis: VehicleChassisSpec;
  paintColor: string;
  lightRefs?: MutableRefObject<VehicleLightRefs>;
  damageState?: VehicleDamageState;
}

/**
 * 1. MODERN HATCHBACK — Sculpted Bezier hot-hatch with curved bonnet, flared arches & roof spoiler
 */
function HatchbackBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
  damageState,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;

  const frontBumperCond = getPartCondition(damageState, 'front-bumper');
  const rearBumperCond = getPartCondition(damageState, 'rear-bumper');
  const hoodCond = getPartCondition(damageState, 'hood');
  const trunkCond = getPartCondition(damageState, 'trunk');
  const leftMirrorCond = getPartCondition(damageState, 'left-mirror');
  const rightMirrorCond = getPartCondition(damageState, 'right-mirror');
  const frontDamage = damageState?.zones.front ?? 0;

  const { bodyGeo, cabinGeo, fenderGeo } = useMemo(() => {
    const halfL = L / 2;
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.96, clearance + 0.04);
    bodyShape.quadraticCurveTo(
      -halfL * 0.99,
      clearance + lowerH * 0.62,
      -halfL * 0.85,
      clearance + lowerH * 0.88
    );
    bodyShape.bezierCurveTo(
      -halfL * 0.55,
      clearance + lowerH * 1.03,
      -halfL * 0.25,
      clearance + lowerH * 1.06,
      halfL * 0.88,
      clearance + lowerH * 1.04
    );
    bodyShape.quadraticCurveTo(
      halfL * 0.98,
      clearance + lowerH * 0.72,
      halfL * 0.96,
      clearance + 0.05
    );
    bodyShape.closePath();

    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-halfL * 0.44, clearance + lowerH * 0.96);
    cabinShape.bezierCurveTo(
      -halfL * 0.22,
      H * 0.98,
      halfL * 0.15,
      H * 1.01,
      halfL * 0.72,
      H * 0.96
    );
    cabinShape.quadraticCurveTo(
      halfL * 0.88,
      H * 0.78,
      halfL * 0.92,
      clearance + lowerH * 0.98
    );
    cabinShape.closePath();

    const fenderShape = new THREE.Shape();
    fenderShape.moveTo(-0.46, clearance + 0.03);
    fenderShape.quadraticCurveTo(0, clearance + lowerH * 1.08, 0.46, clearance + 0.03);
    fenderShape.closePath();

    return {
      bodyGeo: createSculptedProfileGeometry(bodyShape, W * 0.96, 0.06, 0.075),
      cabinGeo: createSculptedProfileGeometry(cabinShape, W * 0.82, 0.05, 0.065),
      fenderGeo: createSculptedProfileGeometry(fenderShape, W * 1.01, 0.035, 0.045),
    };
  }, [L, W, H, clearance, lowerH]);

  return (
    <group>
      {/* Sculpted curved main body shell */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.68}
          roughness={0.18 + (damageState ? (100 - damageState.health) * 0.0025 : 0)}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Flared front & rear wheel-arch bulges */}
      {[chassis.frontAxleZ, chassis.rearAxleZ].map((axleZ, idx) => (
        <mesh key={idx} geometry={fenderGeo} position={[0, 0, axleZ]} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.68}
            roughness={0.18}
            clearcoat={1}
          />
        </mesh>
      ))}

      {/* Curved panoramic tinted glasshouse */}
      <mesh geometry={cabinGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#070c18"
          metalness={0.94}
          roughness={0.05}
          clearcoat={1}
        />
      </mesh>

      {/* Sculpted painted roof cap */}
      <mesh
        position={[0, clearance + lowerH + cabinH - 0.025, L * 0.11]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.74, 0.045, L * 0.52]} />
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.68}
          roughness={0.18}
          clearcoat={1}
        />
      </mesh>

      {/* Detachable sculpted front nose bumper & honeycomb splitter */}
      {frontBumperCond !== 'detached' && (
        <group
          position={[
            frontBumperCond === 'loose' ? 0.04 : 0,
            clearance + lowerH * 0.36 - (frontBumperCond === 'loose' ? 0.07 : 0),
            -L * 0.478 + frontDamage * 0.06,
          ]}
          rotation={
            frontBumperCond === 'loose'
              ? [0.22, 0.08, -0.14]
              : frontBumperCond === 'dented'
                ? [0.06, -0.03, 0.03]
                : [0, 0, 0]
          }
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[W * 0.92, lowerH * 0.56, L * 0.06]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.68}
              roughness={0.18}
              clearcoat={1}
            />
          </mesh>
          <mesh position={[0, -lowerH * 0.08, -0.022]}>
            <boxGeometry args={[W * 0.68, lowerH * 0.36, 0.03]} />
            <meshStandardMaterial color="#090d16" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, -lowerH * 0.26, -0.03]}>
            <boxGeometry args={[W * 0.88, 0.03, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.6} />
          </mesh>
        </group>
      )}

      {/* Detachable Rear Bumper diffuser valence */}
      {rearBumperCond !== 'detached' && (
        <mesh
          position={[
            rearBumperCond === 'loose' ? -0.04 : 0,
            clearance + lowerH * 0.28 - (rearBumperCond === 'loose' ? 0.065 : 0),
            L * 0.475,
          ]}
          rotation={
            rearBumperCond === 'loose' ? [-0.18, -0.06, 0.12] : [0, 0, 0]
          }
          castShadow
        >
          <boxGeometry args={[W * 0.92, lowerH * 0.44, 0.09]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
      )}

      {/* Sloped front bonnet crease */}
      {hoodCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance +
              lowerH * 0.95 +
              (hoodCond === 'loose' ? 0.06 : hoodCond === 'dented' ? 0.02 : 0),
            -L * 0.29 + frontDamage * 0.05,
          ]}
          rotation={[
            0.14 - (hoodCond === 'loose' ? 0.34 : hoodCond === 'dented' ? 0.12 : 0),
            hoodCond === 'loose' ? 0.05 : 0,
            hoodCond === 'loose' ? -0.04 : 0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.78, 0.06, L * 0.32]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.7}
            roughness={0.16}
            clearcoat={1}
          />
        </mesh>
      )}

      {/* Hot-hatch carbon rear roof spoiler */}
      {trunkCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance + lowerH + cabinH - 0.01 + (trunkCond === 'loose' ? 0.04 : 0),
            L * 0.38,
          ]}
          rotation={[
            -0.18 + (trunkCond === 'loose' ? 0.32 : 0),
            trunkCond === 'loose' ? -0.08 : 0,
            trunkCond === 'loose' ? 0.12 : 0,
          ]}
          castShadow
        >
          <boxGeometry args={[W * 0.78, 0.042, 0.22]} />
          <meshPhysicalMaterial color="#0b0f19" metalness={0.75} roughness={0.2} clearcoat={0.9} />
        </mesh>
      )}

      {/* Side skirt rocker trim */}
      {[-1, 1].map((side) => (
        <mesh
          key={`skirt-${side}`}
          position={[side * (W * 0.485), clearance + 0.055, 0]}
        >
          <boxGeometry args={[0.035, 0.06, L * 0.52]} />
          <meshStandardMaterial color="#0b0f19" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* Detachable Wing mirrors */}
      {([-1, 1] as const).map((side) => {
        const cond = side === -1 ? leftMirrorCond : rightMirrorCond;
        if (cond === 'detached') return null;
        return (
          <mesh
            key={side}
            position={[
              side * (W * 0.51),
              clearance + lowerH + 0.06 - (cond === 'loose' ? 0.06 : 0),
              -L * 0.14,
            ]}
            rotation={
              cond === 'loose'
                ? [0.35, side * 0.25, side * -0.58]
                : cond === 'dented'
                  ? [0.1, side * 0.18, 0]
                  : [0, side * -0.15, 0]
            }
            castShadow
          >
            <boxGeometry args={[0.14, 0.075, 0.15]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.68}
              roughness={0.18}
              clearcoat={1}
            />
          </mesh>
        );
      })}

      {/* Crystal LED Projector Headlights */}
      {[-1, 1].map((side) => {
        const isBroken = frontDamage > 0.65 && side === -1;
        return (
          <group
            key={`hl-${side}`}
            position={[
              side * (W * 0.34),
              clearance + lowerH * 0.72,
              -L * 0.472 + frontDamage * 0.05,
            ]}
            rotation={[0.12, side * 0.18, side * -0.05]}
          >
            <mesh>
              <boxGeometry args={[W * 0.21, 0.085, 0.05]} />
              <meshStandardMaterial color="#090d16" metalness={0.85} roughness={0.15} />
            </mesh>
            <mesh position={[0, 0, -0.006]}>
              <boxGeometry args={[W * 0.19, 0.05, 0.048]} />
              <meshStandardMaterial
                color={isBroken ? '#334155' : '#f8fafc'}
                emissive="#bae6fd"
                emissiveIntensity={isBroken ? 0.1 : 2.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Rear Brake Lights + Full Light Bar */}
      <mesh position={[0, clearance + lowerH * 0.84, L * 0.468]}>
        <boxGeometry args={[W * 0.82, 0.04, 0.035]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightBar = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.1}
        />
      </mesh>
      <mesh position={[-W * 0.34, clearance + lowerH * 0.82, L * 0.468]}>
        <boxGeometry args={[W * 0.2, 0.095, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.0}
        />
      </mesh>
      <mesh position={[W * 0.34, clearance + lowerH * 0.82, L * 0.468]}>
        <boxGeometry args={[W * 0.2, 0.095, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Reverse Lights */}
      <mesh position={[-W * 0.28, clearance + lowerH * 0.68, L * 0.472]}>
        <boxGeometry args={[0.12, 0.04, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.28, clearance + lowerH * 0.68, L * 0.472]}>
        <boxGeometry args={[0.12, 0.04, 0.03]} />
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
 * 2. EXECUTIVE SEDAN — Sculpted 3-box luxury saloon with sweeping fastback roof & chrome accents
 */
function SedanBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
  damageState,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;
  const cabinH = (H - clearance) * 0.52;

  const frontBumperCond = getPartCondition(damageState, 'front-bumper');
  const rearBumperCond = getPartCondition(damageState, 'rear-bumper');
  const hoodCond = getPartCondition(damageState, 'hood');
  const trunkCond = getPartCondition(damageState, 'trunk');
  const leftMirrorCond = getPartCondition(damageState, 'left-mirror');
  const rightMirrorCond = getPartCondition(damageState, 'right-mirror');
  const frontDamage = damageState?.zones.front ?? 0;

  const { bodyGeo, cabinGeo, fenderGeo } = useMemo(() => {
    const halfL = L / 2;
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.97, clearance + 0.03);
    bodyShape.quadraticCurveTo(
      -halfL * 0.995,
      clearance + lowerH * 0.6,
      -halfL * 0.86,
      clearance + lowerH * 0.86
    );
    bodyShape.bezierCurveTo(
      -halfL * 0.55,
      clearance + lowerH * 1.04,
      halfL * 0.35,
      clearance + lowerH * 1.06,
      halfL * 0.92,
      clearance + lowerH * 0.98
    );
    bodyShape.quadraticCurveTo(
      halfL * 0.99,
      clearance + lowerH * 0.64,
      halfL * 0.96,
      clearance + 0.04
    );
    bodyShape.closePath();

    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-halfL * 0.42, clearance + lowerH * 0.94);
    cabinShape.bezierCurveTo(
      -halfL * 0.16,
      H * 1.0,
      halfL * 0.14,
      H * 1.01,
      halfL * 0.62,
      clearance + lowerH * 0.96
    );
    cabinShape.closePath();

    const fenderShape = new THREE.Shape();
    fenderShape.moveTo(-0.48, clearance + 0.03);
    fenderShape.quadraticCurveTo(0, clearance + lowerH * 1.08, 0.48, clearance + 0.03);
    fenderShape.closePath();

    return {
      bodyGeo: createSculptedProfileGeometry(bodyShape, W * 0.96, 0.06, 0.08),
      cabinGeo: createSculptedProfileGeometry(cabinShape, W * 0.81, 0.05, 0.065),
      fenderGeo: createSculptedProfileGeometry(fenderShape, W * 1.01, 0.04, 0.05),
    };
  }, [L, W, H, clearance, lowerH]);

  return (
    <group>
      {/* Sculpted curved main saloon body */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.78}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      {/* Sculpted front & rear wheel-arch flares */}
      {[chassis.frontAxleZ, chassis.rearAxleZ].map((axleZ, idx) => (
        <mesh key={idx} geometry={fenderGeo} position={[0, 0, axleZ]} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.15}
            clearcoat={1}
          />
        </mesh>
      ))}

      {/* Curved panoramic glasshouse dome */}
      <mesh geometry={cabinGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#060b16"
          metalness={0.95}
          roughness={0.04}
          clearcoat={1}
        />
      </mesh>

      {/* Painted roof cap */}
      <mesh
        position={[0, clearance + lowerH + cabinH - 0.03, L * 0.04]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.72, 0.042, L * 0.36]} />
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.78}
          roughness={0.15}
          clearcoat={1}
        />
      </mesh>

      {/* Detachable Front Bonnet power dome */}
      {hoodCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance +
              lowerH * 0.96 +
              (hoodCond === 'loose' ? 0.065 : hoodCond === 'dented' ? 0.02 : 0),
            -L * 0.31 + frontDamage * 0.05,
          ]}
          rotation={[
            0.08 - (hoodCond === 'loose' ? 0.32 : hoodCond === 'dented' ? 0.11 : 0),
            hoodCond === 'loose' ? 0.04 : 0,
            hoodCond === 'loose' ? -0.04 : 0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.78, 0.055, L * 0.34]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.15}
            clearcoat={1}
          />
        </mesh>
      )}

      {/* Detachable Rear Boot Deck lip */}
      {trunkCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance + lowerH * 0.96 + (trunkCond === 'loose' ? 0.055 : 0),
            L * 0.38,
          ]}
          rotation={[
            -0.05 + (trunkCond === 'loose' ? 0.28 : trunkCond === 'dented' ? 0.09 : 0),
            trunkCond === 'loose' ? -0.05 : 0,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.8, 0.05, L * 0.2]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.15}
            clearcoat={1}
          />
        </mesh>
      )}

      {/* Detachable Front Bumper & Executive Chrome Grille */}
      {frontBumperCond !== 'detached' && (
        <group
          position={[
            frontBumperCond === 'loose' ? -0.035 : 0,
            frontBumperCond === 'loose' ? -0.065 : 0,
            frontDamage * 0.05,
          ]}
          rotation={
            frontBumperCond === 'loose'
              ? [0.19, -0.06, 0.12]
              : frontBumperCond === 'dented'
                ? [0.05, 0.02, -0.03]
                : [0, 0, 0]
          }
        >
          <mesh position={[0, clearance + lowerH * 0.44, -L * 0.482]}>
            <boxGeometry args={[W * 0.52, lowerH * 0.52, 0.035]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.94} roughness={0.12} />
          </mesh>
          <mesh position={[0, clearance + lowerH * 0.44, -L * 0.486]}>
            <boxGeometry args={[W * 0.48, lowerH * 0.44, 0.025]} />
            <meshStandardMaterial color="#090d16" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}

      {/* Detachable Rear Bumper diffuser */}
      {rearBumperCond !== 'detached' && (
        <mesh
          position={[
            rearBumperCond === 'loose' ? 0.04 : 0,
            clearance + lowerH * 0.24 - (rearBumperCond === 'loose' ? 0.065 : 0),
            L * 0.478,
          ]}
          rotation={
            rearBumperCond === 'loose' ? [-0.18, 0.05, -0.13] : [0, 0, 0]
          }
          castShadow
        >
          <boxGeometry args={[W * 0.9, lowerH * 0.38, 0.09]} />
          <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.28} />
        </mesh>
      )}

      {/* Chrome lower door & window trim */}
      {[-1, 1].map((side) => (
        <group key={`trim-${side}`}>
          <mesh position={[side * (W * 0.488), clearance + lowerH * 0.22, 0]}>
            <boxGeometry args={[0.022, 0.03, L * 0.56]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[side * (W * 0.415), clearance + lowerH * 0.97, L * 0.05]}>
            <boxGeometry args={[0.02, 0.022, L * 0.48]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
          </mesh>
        </group>
      ))}

      {/* Detachable Wing Mirrors */}
      {([-1, 1] as const).map((side) => {
        const cond = side === -1 ? leftMirrorCond : rightMirrorCond;
        if (cond === 'detached') return null;
        return (
          <mesh
            key={`mirror-${side}`}
            position={[
              side * (W * 0.51),
              clearance + lowerH + 0.06 - (cond === 'loose' ? 0.06 : 0),
              -L * 0.11,
            ]}
            rotation={
              cond === 'loose'
                ? [0.32, side * 0.22, side * -0.55]
                : cond === 'dented'
                  ? [0.08, side * 0.15, 0]
                  : [0, side * -0.14, 0]
            }
            castShadow
          >
            <boxGeometry args={[0.15, 0.072, 0.15]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.78}
              roughness={0.15}
              clearcoat={1}
            />
          </mesh>
        );
      })}

      {/* Executive Matrix LED Headlights */}
      {[-1, 1].map((side) => (
        <group
          key={`hl-${side}`}
          position={[
            side * (W * 0.35),
            clearance + lowerH * 0.68,
            -L * 0.476 + frontDamage * 0.05,
          ]}
          rotation={[0.08, side * 0.18, side * -0.04]}
        >
          <mesh>
            <boxGeometry args={[W * 0.21, 0.08, 0.05]} />
            <meshStandardMaterial color="#090d16" metalness={0.85} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, -0.006]}>
            <boxGeometry args={[W * 0.19, 0.048, 0.048]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#e0f2fe"
              emissiveIntensity={frontDamage > 0.7 && side === 1 ? 0.12 : 2.35}
            />
          </mesh>
        </group>
      ))}

      {/* Rear Brake Lights */}
      <mesh position={[-W * 0.34, clearance + lowerH * 0.74, L * 0.476]}>
        <boxGeometry args={[W * 0.24, 0.085, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.0}
        />
      </mesh>
      <mesh position={[W * 0.34, clearance + lowerH * 0.74, L * 0.476]}>
        <boxGeometry args={[W * 0.24, 0.085, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.0}
        />
      </mesh>

      <mesh position={[-W * 0.28, clearance + lowerH * 0.63, L * 0.48]}>
        <boxGeometry args={[0.14, 0.04, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.28, clearance + lowerH * 0.63, L * 0.48]}>
        <boxGeometry args={[0.14, 0.04, 0.03]} />
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
 * 3. LARGE SUV — Sculpted Range-Rover / Performance 4x4 with bevelled clamshell hood & muscular arches
 */
function SuvBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
  damageState,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.5;
  const cabinH = (H - clearance) * 0.5;

  const frontBumperCond = getPartCondition(damageState, 'front-bumper');
  const rearBumperCond = getPartCondition(damageState, 'rear-bumper');
  const hoodCond = getPartCondition(damageState, 'hood');
  const leftMirrorCond = getPartCondition(damageState, 'left-mirror');
  const rightMirrorCond = getPartCondition(damageState, 'right-mirror');
  const frontDamage = damageState?.zones.front ?? 0;

  const { bodyGeo, cabinGeo, fenderGeo } = useMemo(() => {
    const halfL = L / 2;
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.96, clearance + 0.05);
    bodyShape.quadraticCurveTo(
      -halfL * 0.99,
      clearance + lowerH * 0.68,
      -halfL * 0.88,
      clearance + lowerH * 0.96
    );
    bodyShape.lineTo(halfL * 0.92, clearance + lowerH * 1.02);
    bodyShape.quadraticCurveTo(
      halfL * 0.99,
      clearance + lowerH * 0.72,
      halfL * 0.96,
      clearance + 0.06
    );
    bodyShape.closePath();

    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-halfL * 0.42, clearance + lowerH * 0.96);
    cabinShape.bezierCurveTo(
      -halfL * 0.24,
      H * 0.99,
      halfL * 0.25,
      H * 1.0,
      halfL * 0.82,
      H * 0.97
    );
    cabinShape.quadraticCurveTo(
      halfL * 0.92,
      H * 0.82,
      halfL * 0.93,
      clearance + lowerH * 0.98
    );
    cabinShape.closePath();

    const fenderShape = new THREE.Shape();
    fenderShape.moveTo(-0.52, clearance + 0.04);
    fenderShape.quadraticCurveTo(0, clearance + lowerH * 1.08, 0.52, clearance + 0.04);
    fenderShape.closePath();

    return {
      bodyGeo: createSculptedProfileGeometry(bodyShape, W * 0.97, 0.065, 0.08),
      cabinGeo: createSculptedProfileGeometry(cabinShape, W * 0.86, 0.05, 0.065),
      fenderGeo: createSculptedProfileGeometry(fenderShape, W * 1.02, 0.04, 0.05),
    };
  }, [L, W, H, clearance, lowerH]);

  return (
    <group>
      {/* Sculpted SUV lower body */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.64}
          roughness={0.2}
          clearcoat={0.95}
          clearcoatRoughness={0.06}
        />
      </mesh>

      {/* Muscular 4x4 Wheel Arch Flares */}
      {[chassis.frontAxleZ, chassis.rearAxleZ].map((axleZ, idx) => (
        <mesh key={idx} geometry={fenderGeo} position={[0, 0, axleZ]} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.64}
            roughness={0.2}
            clearcoat={0.95}
          />
        </mesh>
      ))}

      {/* Lower off-road satin protective cladding */}
      <mesh position={[0, clearance + 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.99, 0.14, L * 0.92]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Floating black glasshouse cabin */}
      <mesh geometry={cabinGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#060c18"
          metalness={0.92}
          roughness={0.05}
          clearcoat={1}
        />
      </mesh>

      {/* Painted SUV roof cap */}
      <mesh
        position={[0, clearance + lowerH + cabinH - 0.03, L * 0.12]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[W * 0.8, 0.055, L * 0.6]} />
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.64}
          roughness={0.2}
          clearcoat={0.95}
        />
      </mesh>

      {/* Detachable SUV Clamshell Bonnet */}
      {hoodCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance +
              lowerH +
              0.015 +
              (hoodCond === 'loose' ? 0.07 : hoodCond === 'dented' ? 0.025 : 0),
            -L * 0.31 + frontDamage * 0.05,
          ]}
          rotation={[
            0.04 - (hoodCond === 'loose' ? 0.3 : hoodCond === 'dented' ? 0.1 : 0),
            hoodCond === 'loose' ? 0.04 : 0,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[W * 0.86, 0.07, L * 0.3]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.64}
            roughness={0.2}
            clearcoat={0.95}
          />
        </mesh>
      )}

      {/* Detachable Front Skid Plate Bumper & Grille */}
      {frontBumperCond !== 'detached' && (
        <group
          position={[
            frontBumperCond === 'loose' ? 0.04 : 0,
            frontBumperCond === 'loose' ? -0.07 : 0,
            frontDamage * 0.05,
          ]}
          rotation={
            frontBumperCond === 'loose'
              ? [0.2, 0.06, -0.13]
              : frontBumperCond === 'dented'
                ? [0.05, -0.02, 0.03]
                : [0, 0, 0]
          }
        >
          <mesh position={[0, clearance + 0.11, -L * 0.482]}>
            <boxGeometry args={[W * 0.62, 0.17, 0.04]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.82} roughness={0.22} />
          </mesh>
          <mesh position={[0, clearance + lowerH * 0.64, -L * 0.485]}>
            <boxGeometry args={[W * 0.56, lowerH * 0.42, 0.035]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.28} />
          </mesh>
        </group>
      )}

      {/* Detachable Rear SUV Bumper */}
      {rearBumperCond !== 'detached' && (
        <mesh
          position={[
            0,
            clearance + 0.14 - (rearBumperCond === 'loose' ? 0.065 : 0),
            L * 0.482,
          ]}
          rotation={
            rearBumperCond === 'loose' ? [-0.2, 0.05, 0.12] : [0, 0, 0]
          }
          castShadow
        >
          <boxGeometry args={[W * 0.94, 0.2, 0.09]} />
          <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.45} />
        </mesh>
      )}

      {/* Brushed aluminium roof rails */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rail-${side}`}
          position={[
            side * (W * 0.36),
            clearance + lowerH + cabinH + 0.025,
            L * 0.11,
          ]}
          castShadow
        >
          <boxGeometry args={[0.042, 0.045, L * 0.52]} />
          <meshStandardMaterial
            color="#cbd5e1"
            metalness={0.88}
            roughness={0.2}
          />
        </mesh>
      ))}

      {([-1, 1] as const).map((side) => {
        const cond = side === -1 ? leftMirrorCond : rightMirrorCond;
        if (cond === 'detached') return null;
        return (
          <mesh
            key={`mirror-${side}`}
            position={[
              side * (W * 0.52),
              clearance + lowerH + 0.11 - (cond === 'loose' ? 0.06 : 0),
              -L * 0.15,
            ]}
            rotation={
              cond === 'loose'
                ? [0.35, side * 0.2, side * -0.52]
                : cond === 'dented'
                  ? [0.1, side * 0.15, 0]
                  : [0, 0, 0]
            }
            castShadow
          >
            <boxGeometry args={[0.16, 0.12, 0.15]} />
            <meshStandardMaterial color="#18181b" roughness={0.32} metalness={0.5} />
          </mesh>
        );
      })}

      {[-1, 1].map((side) => (
        <mesh
          key={`hl-${side}`}
          position={[
            side * (W * 0.36),
            clearance + lowerH * 0.72,
            -L * 0.482 + frontDamage * 0.05,
          ]}
        >
          <boxGeometry args={[W * 0.19, 0.13, 0.04]} />
          <meshStandardMaterial
            color="#f8fafc"
            emissive="#bae6fd"
            emissiveIntensity={2.1}
          />
        </mesh>
      ))}

      <mesh position={[-W * 0.4, clearance + lowerH * 0.76, L * 0.48]}>
        <boxGeometry args={[0.13, 0.32, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightLeft = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.95}
        />
      </mesh>
      <mesh position={[W * 0.4, clearance + lowerH * 0.76, L * 0.48]}>
        <boxGeometry args={[0.13, 0.32, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightRight = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={0.95}
        />
      </mesh>

      <mesh position={[-W * 0.32, clearance + lowerH * 0.56, L * 0.482]}>
        <boxGeometry args={[0.12, 0.065, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.32, clearance + lowerH * 0.56, L * 0.482]}>
        <boxGeometry args={[0.12, 0.065, 0.03]} />
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
 * Procedural high-DPI CanvasTexture for the New Tesla Roadster's rear "RDSTR" studio license plate
 * matching the official Tesla Design Studio concept render.
 */
let cachedRdstrPlateTexture: THREE.CanvasTexture | null = null;
function getRdstrPlateTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedRdstrPlateTexture) return cachedRdstrPlateTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Crisp satin white studio plate background with subtle vertical sheen
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#e2e8f0');
  grad.addColorStop(0.18, '#f8fafc');
  grad.addColorStop(0.85, '#f1f5f9');
  grad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle recessed inner plate border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 488, 232);

  // Top studio mounting bolt details
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(96, 34, 6, 0, Math.PI * 2);
  ctx.arc(416, 34, 6, 0, Math.PI * 2);
  ctx.fill();

  // Bold condensed "RDSTR" studio typography
  ctx.fillStyle = '#1e2430';
  ctx.font = '700 118px "Inter", "Segoe UI", "Arial Narrow", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(256, 138);
  ctx.scale(0.82, 1.05);
  ctx.fillText('RDSTR', 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedRdstrPlateTexture = tex;
  return tex;
}

/**
 * 4. NEW TESLA ROADSTER ("RDSTR" Studio Concept + SpaceX Cold-Gas 3D Flight Package)
 * Built to match the official Tesla Design Studio rear-3/4 & front-3/4 renders:
 * - Monolithic wedge-fastback silhouette with overhanging Kammback ducktail
 * - Razor-sharp upper shoulder tornado crease & vertical door shut-line seam
 * - Matte-black lower aerodynamic rocker skirt kicking up diagonally ahead of rear wheel arch
 * - Warm bronze / copper-gold smoked electrochromic flush glasshouse & angled twin B-pillar split
 * - Front fender recessed Autopilot side-repeater camera blade with amber/crimson LED
 * - Rear quarter red side-marker reflector on diagonal bumper seam
 * - Recessed rectangular Kammback tail cavity with single-line horizontal neon red laser lightbar
 * - Sculpted concave rear valence with crisp white "RDSTR" license plate
 * - Massive 4-strake carbon underbody Venturi diffuser housing quad SpaceX cold-gas thruster nozzles
 */
function RoadsterBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
  damageState,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;

  const frontBumperCond = getPartCondition(damageState, 'front-bumper');
  const rearBumperCond = getPartCondition(damageState, 'rear-bumper');
  const hoodCond = getPartCondition(damageState, 'hood');
  const trunkCond = getPartCondition(damageState, 'trunk');
  const leftMirrorCond = getPartCondition(damageState, 'left-mirror');
  const rightMirrorCond = getPartCondition(damageState, 'right-mirror');
  const leftFenderCond = getPartCondition(damageState, 'left-fender');
  const rightFenderCond = getPartCondition(damageState, 'right-fender');

  const rdstrPlateTexture = useMemo(() => getRdstrPlateTexture(), []);

  const {
    fuselageGeo,
    buttressArchGeo,
    centerGlassGeo,
    sideWindowGeo,
    frontFenderGeo,
    rearFenderGeo,
  } = useMemo(() => {
    const halfL = L / 2;

    // 1. Monolithic wedge lower fuselage with Kammback overhang & recessed rear valence profile
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.99, clearance + 0.025);
    bodyShape.quadraticCurveTo(
      -halfL * 1.005,
      clearance + 0.16,
      -halfL * 0.85,
      H * 0.42
    );
    // Continuous raked hood to beltline wedge
    bodyShape.bezierCurveTo(
      -halfL * 0.62,
      H * 0.53,
      -halfL * 0.18,
      H * 0.58,
      halfL * 0.42,
      H * 0.63
    );
    // Crisp rise to sharp Kammback upper tail lip
    bodyShape.lineTo(halfL * 0.99, H * 0.65);
    // Step inward for recessed Kammback laser lightbar cavity
    bodyShape.lineTo(halfL * 0.93, H * 0.53);
    // Concave rear valence for "RDSTR" license plate
    bodyShape.lineTo(halfL * 0.955, H * 0.35);
    // Tuck into deep underbody Venturi diffuser
    bodyShape.lineTo(halfL * 0.88, clearance + 0.03);
    bodyShape.closePath();

    // 2. Sculpted A-pillar-to-C-pillar fastback flying buttress arch (body-colored side roof rails & rear shoulders)
    const buttressShape = new THREE.Shape();
    buttressShape.moveTo(-halfL * 0.6, H * 0.48);
    buttressShape.bezierCurveTo(
      -halfL * 0.25,
      H * 1.01,
      halfL * 0.08,
      H * 1.02,
      halfL * 0.46,
      H * 0.86
    );
    buttressShape.lineTo(halfL * 0.975, H * 0.645);
    buttressShape.lineTo(halfL * 0.36, H * 0.6);
    buttressShape.bezierCurveTo(
      halfL * 0.06,
      H * 0.91,
      -halfL * 0.22,
      H * 0.9,
      -halfL * 0.48,
      H * 0.48
    );
    buttressShape.closePath();

    // 3. Central panoramic warm-bronze electrochromic windshield & recessed fastback roof glass
    const centerGlassShape = new THREE.Shape();
    centerGlassShape.moveTo(-halfL * 0.57, H * 0.49);
    centerGlassShape.bezierCurveTo(
      -halfL * 0.22,
      H * 1.0,
      halfL * 0.08,
      H * 1.0,
      halfL * 0.44,
      H * 0.83
    );
    centerGlassShape.lineTo(halfL * 0.84, H * 0.655);
    centerGlassShape.lineTo(-halfL * 0.45, H * 0.48);
    centerGlassShape.closePath();

    // 4. Flush side Daylight Opening (DLO) warm-bronze windows with sharp front & C-pillar points
    const sideWinShape = new THREE.Shape();
    sideWinShape.moveTo(-halfL * 0.52, H * 0.53);
    sideWinShape.bezierCurveTo(
      -halfL * 0.2,
      H * 0.95,
      halfL * 0.08,
      H * 0.95,
      halfL * 0.38,
      H * 0.76
    );
    sideWinShape.lineTo(halfL * 0.12, H * 0.6);
    sideWinShape.lineTo(-halfL * 0.52, H * 0.53);
    sideWinShape.closePath();

    // 5. Sculpted curved front fender arch
    const ffShape = new THREE.Shape();
    ffShape.moveTo(-halfL * 0.96, clearance + 0.04);
    ffShape.bezierCurveTo(
      -halfL * 0.86,
      H * 0.57,
      -halfL * 0.42,
      H * 0.6,
      -halfL * 0.16,
      clearance + 0.06
    );
    ffShape.closePath();

    // 6. Sculpted wide-body rear haunch arch flowing into Kammback corner
    const rfShape = new THREE.Shape();
    rfShape.moveTo(halfL * 0.1, clearance + 0.06);
    rfShape.bezierCurveTo(
      halfL * 0.34,
      H * 0.68,
      halfL * 0.78,
      H * 0.68,
      halfL * 0.985,
      H * 0.64
    );
    rfShape.lineTo(halfL * 0.97, clearance + 0.14);
    rfShape.closePath();

    return {
      fuselageGeo: createSculptedProfileGeometry(bodyShape, W * 0.89, 0.055, 0.075),
      buttressArchGeo: createSculptedProfileGeometry(
        buttressShape,
        W * 0.14,
        0.028,
        0.035
      ),
      centerGlassGeo: createSculptedProfileGeometry(
        centerGlassShape,
        W * 0.64,
        0.03,
        0.04
      ),
      sideWindowGeo: createSculptedProfileGeometry(
        sideWinShape,
        W * 0.79,
        0.025,
        0.035
      ),
      frontFenderGeo: createSculptedProfileGeometry(ffShape, W * 0.25, 0.04, 0.055),
      rearFenderGeo: createSculptedProfileGeometry(rfShape, W * 0.27, 0.042, 0.058),
    };
  }, [L, W, H, clearance]);

  return (
    <group>
      {/* 1. Central Monolithic Wedge-Fastback Fuselage */}
      <mesh geometry={fuselageGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.78}
          roughness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>

      {/* 2. Body-Colored A-Pillar Roofline & Wide C-Pillar Flying Buttress Haunches */}
      {[-1, 1].map((side) => (
        <mesh
          key={`roadster-buttress-arch-${side}`}
          geometry={buttressArchGeo}
          position={[side * (W * 0.33), 0, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.14}
            clearcoat={1}
            clearcoatRoughness={0.04}
          />
        </mesh>
      ))}

      {/* 3. Warm Bronze / Copper-Gold Smoked Electrochromic Panoramic Roof & Windshield Glass */}
      <mesh geometry={centerGlassGeo} castShadow>
        <meshPhysicalMaterial
          color="#3d2817"
          emissive="#26170b"
          emissiveIntensity={0.38}
          metalness={0.92}
          roughness={0.055}
          clearcoat={1}
          clearcoatRoughness={0.02}
        />
      </mesh>

      {/* 4. Flush Warm-Bronze Side Windows (DLO) with Pointed Quarter Glass */}
      <mesh geometry={sideWindowGeo} castShadow>
        <meshPhysicalMaterial
          color="#432c1a"
          emissive="#2b1a0d"
          emissiveIntensity={0.42}
          metalness={0.9}
          roughness={0.06}
          clearcoat={1}
          clearcoatRoughness={0.02}
        />
      </mesh>

      {/* Angled Twin-Line Black B-Pillar Glass Divider ("||" in RDSTR Studio Render) */}
      {[-1, 1].map((side) => (
        <group
          key={`b-pillar-divider-${side}`}
          position={[side * (W * 0.398), H * 0.76, -L * 0.01]}
          rotation={[0.48, 0, side * 0.14]}
        >
          {[-0.014, 0.014].map((dz, idx) => (
            <mesh key={idx} position={[0, 0, dz]}>
              <boxGeometry args={[0.014, H * 0.34, 0.012]} />
              <meshStandardMaterial
                color="#090c12"
                metalness={0.85}
                roughness={0.15}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Detachable/Popped Front Frunk Hood Panel */}
      {hoodCond !== 'detached' && (
        <mesh
          position={[
            0,
            H * 0.465 + (hoodCond === 'loose' ? 0.06 : 0),
            -L * 0.31,
          ]}
          rotation={[
            0.22 - (hoodCond === 'loose' ? 0.34 : hoodCond === 'dented' ? 0.11 : 0),
            hoodCond === 'loose' ? 0.05 : 0,
            0,
          ]}
          castShadow
        >
          <boxGeometry args={[W * 0.64, 0.038, L * 0.28]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.14}
            clearcoat={1}
          />
        </mesh>
      )}

      {/* Sculpted curved muscular front fenders */}
      {([-1, 1] as const).map((side) => {
        const cond = side === -1 ? leftFenderCond : rightFenderCond;
        if (cond === 'detached') return null;
        return (
          <mesh
            key={`front-fender-${side}`}
            geometry={frontFenderGeo}
            position={[
              side * (W * 0.375 + (cond === 'loose' ? 0.035 : 0)),
              cond === 'loose' ? -0.04 : 0,
              0,
            ]}
            rotation={[
              cond === 'loose' ? 0.14 : 0,
              cond === 'loose' ? side * 0.12 : 0,
              cond === 'loose' ? side * -0.18 : 0,
            ]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.78}
              roughness={0.14}
              clearcoat={1}
              clearcoatRoughness={0.04}
            />
          </mesh>
        );
      })}

      {/* Sculpted wide-body rear haunches flowing into Kammback tail corners */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rear-fender-${side}`}
          geometry={rearFenderGeo}
          position={[side * (W * 0.38), 0, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.14}
            clearcoat={1}
            clearcoatRoughness={0.04}
          />
        </mesh>
      ))}

      {/* 5. Razor-Sharp Upper Shoulder Tornado Crease, Door Shut-Lines, Autopilot Camera Blade & Diagonal Rocker Skirt */}
      {[-1, 1].map((side) => (
        <group key={`side-studio-details-${side}`}>
          {/* Razor-sharp upper shoulder tornado crease from front arch to Kammback corner */}
          <mesh
            position={[side * (W * 0.456), H * 0.595, L * 0.09]}
            rotation={[-0.045, 0, side * -0.08]}
            castShadow
          >
            <boxGeometry args={[0.022, 0.022, L * 0.78]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.82}
              roughness={0.12}
              clearcoat={1}
            />
          </mesh>

          {/* Crisp vertical door shut-line seam (visible in RDSTR side profile) */}
          <mesh
            position={[side * (W * 0.448), H * 0.36, -L * 0.055]}
            rotation={[0.08, 0, 0]}
          >
            <boxGeometry args={[0.008, H * 0.44, 0.006]} />
            <meshBasicMaterial color="#0b0e14" />
          </mesh>

          {/* Front door hinge shut-line seam */}
          <mesh
            position={[side * (W * 0.448), H * 0.35, -L * 0.24]}
            rotation={[0.04, 0, 0]}
          >
            <boxGeometry args={[0.008, H * 0.38, 0.006]} />
            <meshBasicMaterial color="#0b0e14" />
          </mesh>

          {/* Front Fender Recessed Autopilot Side-Repeater Camera Blade with Glowing Amber/Red LED */}
          <group position={[side * (W * 0.472), H * 0.45, -L * 0.215]}>
            {/* Recessed satin-black aerodynamic camera blade housing */}
            <mesh>
              <boxGeometry args={[0.028, 0.032, 0.145]} />
              <meshStandardMaterial
                color="#080a0f"
                metalness={0.75}
                roughness={0.22}
              />
            </mesh>
            {/* Glowing amber Autopilot repeater marker (front half of blade) */}
            <mesh position={[side * 0.006, 0.003, -0.028]}>
              <boxGeometry args={[0.02, 0.012, 0.048]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#f59e0b"
                emissiveIntensity={2.4}
              />
            </mesh>
            {/* Glowing crimson marker (rear tip of blade) */}
            <mesh position={[side * 0.006, -0.002, 0.028]}>
              <boxGeometry args={[0.02, 0.01, 0.042]} />
              <meshStandardMaterial
                color="#ef4444"
                emissive="#ef4444"
                emissiveIntensity={2.1}
              />
            </mesh>
          </group>

          {/* Matte-Black Lower Aerodynamic Rocker Skirt (Horizontal + Diagonal Kick-Up before Rear Wheel) */}
          <mesh
            position={[side * (W * 0.46), clearance + 0.048, -L * 0.02]}
            castShadow
          >
            <boxGeometry args={[0.075, 0.056, L * 0.46]} />
            <meshStandardMaterial
              color="#090c12"
              metalness={0.55}
              roughness={0.34}
            />
          </mesh>
          {/* Diagonal upward rocker kick-up right ahead of rear wheel arch */}
          <mesh
            position={[side * (W * 0.462), clearance + 0.075, L * 0.14]}
            rotation={[-0.14, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.072, 0.068, L * 0.18]} />
            <meshStandardMaterial
              color="#090c12"
              metalness={0.55}
              roughness={0.34}
            />
          </mesh>

          {/* Matte-Black Lower Rear Quarter Wrap behind Rear Wheel Arch & Red Side-Marker LED */}
          <mesh
            position={[side * (W * 0.445), clearance + 0.11, L * 0.425]}
            rotation={[-0.22, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.085, 0.16, L * 0.14]} />
            <meshStandardMaterial
              color="#080a0f"
              metalness={0.58}
              roughness={0.32}
            />
          </mesh>
          {/* Glowing Red Rear Side-Marker Reflector on Diagonal Rear Seam */}
          <mesh
            position={[side * (W * 0.468), clearance + 0.175, L * 0.375]}
            rotation={[-0.24, 0, 0]}
          >
            <boxGeometry args={[0.018, 0.014, 0.052]} />
            <meshStandardMaterial
              color="#ff1e27"
              emissive="#ff1e27"
              emissiveIntensity={2.5}
            />
          </mesh>
        </group>
      ))}

      {/* Detachable Carbon-fibre front aero splitter lip & recessed lower intake */}
      {frontBumperCond !== 'detached' && (
        <group
          position={[
            frontBumperCond === 'loose' ? 0.04 : 0,
            frontBumperCond === 'loose' ? -0.055 : 0,
            0,
          ]}
          rotation={
            frontBumperCond === 'loose'
              ? [0.22, 0.07, -0.14]
              : [0, 0, 0]
          }
        >
          <mesh position={[0, clearance + 0.032, -L * 0.482]} castShadow>
            <boxGeometry args={[W * 0.92, 0.045, 0.22]} />
            <meshStandardMaterial color="#0b0f17" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, clearance + 0.095, -L * 0.486]}>
            <boxGeometry args={[W * 0.64, 0.085, 0.06]} />
            <meshStandardMaterial color="#070a10" metalness={0.5} roughness={0.4} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={`corner-intake-${side}`}
              position={[side * (W * 0.38), clearance + 0.18, -L * 0.46]}
              rotation={[0, side * 0.24, side * -0.22]}
            >
              <boxGeometry args={[0.14, 0.14, 0.04]} />
              <meshStandardMaterial color="#070a10" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* Subtle silver "T" nose badge on front hood */}
      {hoodCond !== 'detached' && (
        <mesh
          position={[0, H * 0.385, -L * 0.435]}
          rotation={[-Math.PI / 2 + 0.34, 0, 0]}
        >
          <boxGeometry args={[0.08, 0.045, 0.006]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
        </mesh>
      )}

      {/* 6. Recessed Rectangular Kammback Tail Cavity, Overhanging Ducktail Lip & Single-Line Red Laser Lightbar */}
      <group
        position={[
          0,
          trunkCond === 'loose' ? 0.035 : 0,
          0,
        ]}
      >
        {/* Overhanging body-colored Kammback upper ducktail lip */}
        {trunkCond !== 'detached' && (
          <mesh position={[0, H * 0.642, L * 0.482]} castShadow>
            <boxGeometry args={[W * 0.89, 0.022, 0.09]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.78}
              roughness={0.14}
              clearcoat={1}
            />
          </mesh>
        )}

        {/* Crisp vertical body-colored Kammback side walls framing the recessed cavity */}
        {[-1, 1].map((side) => (
          <mesh
            key={`kammback-wall-${side}`}
            position={[side * (W * 0.436), H * 0.585, L * 0.482]}
            castShadow
          >
            <boxGeometry args={[0.024, 0.125, 0.085]} />
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.78}
              roughness={0.14}
              clearcoat={1}
            />
          </mesh>
        ))}

        {/* Lower body-colored Kammback shelf framing bottom of cavity */}
        <mesh position={[0, H * 0.525, L * 0.48]} castShadow>
          <boxGeometry args={[W * 0.89, 0.018, 0.075]} />
          <meshPhysicalMaterial
            color={paintColor}
            metalness={0.78}
            roughness={0.14}
            clearcoat={1}
          />
        </mesh>

        {/* Deep recessed dark-gunmetal rectangular tail cavity */}
        <mesh position={[0, H * 0.584, L * 0.468]}>
          <boxGeometry args={[W * 0.855, 0.105, 0.05]} />
          <meshStandardMaterial
            color="#080b11"
            metalness={0.75}
            roughness={0.28}
          />
        </mesh>

        {/* Signature Single-Line Razor-Thin Horizontal Neon Red Laser Lightbar */}
        <mesh position={[0, H * 0.594, L * 0.488]}>
          <boxGeometry args={[W * 0.835, 0.016, 0.028]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (lightRefs) lightRefs.current.brakeLightBar = mat;
            }}
            color="#ff1e27"
            emissive="#ff1e27"
            emissiveIntensity={2.6}
          />
        </mesh>

        {/* Subtle Secondary Ruby Reflection Strip along Lower Bevel of Kammback Recess */}
        <mesh position={[0, H * 0.542, L * 0.49]}>
          <boxGeometry args={[W * 0.82, 0.007, 0.018]} />
          <meshStandardMaterial
            color="#dc2626"
            emissive="#ef4444"
            emissiveIntensity={0.95}
          />
        </mesh>
      </group>

      {/* 7. Sculpted Concave Rear Valence & White "RDSTR" Studio License Plate */}
      <group position={[0, H * 0.415, L * 0.474]} rotation={[-0.14, 0, 0]}>
        {/* Recessed dark license plate bezel frame */}
        <mesh position={[0, 0, 0.008]}>
          <boxGeometry args={[0.34, 0.148, 0.016]} />
          <meshStandardMaterial color="#0f141d" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Crisp White "RDSTR" License Plate Face */}
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[0.32, 0.134]} />
          <meshStandardMaterial
            map={rdstrPlateTexture ?? undefined}
            color="#f8fafc"
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
      </group>

      {/* 8. Massive 4-Strake Carbon Underbody Venturi Diffuser & Quad SpaceX Cold-Gas Thrusters */}
      {rearBumperCond !== 'detached' && (
        <group
          position={[
            rearBumperCond === 'loose' ? -0.04 : 0,
            rearBumperCond === 'loose' ? -0.06 : 0,
            0,
          ]}
          rotation={
            rearBumperCond === 'loose' ? [-0.2, -0.06, 0.12] : [0, 0, 0]
          }
        >
          {/* Main wide carbon-black Venturi diffuser housing */}
          <mesh position={[0, clearance + 0.105, L * 0.462]} castShadow>
            <boxGeometry args={[W * 0.89, 0.2, 0.18]} />
            <meshStandardMaterial
              color="#07090e"
              metalness={0.62}
              roughness={0.32}
            />
          </mesh>

          {/* Sculpted upper trapezoidal Venturi arch lip */}
          <mesh position={[0, clearance + 0.21, L * 0.484]}>
            <boxGeometry args={[W * 0.68, 0.022, 0.05]} />
            <meshStandardMaterial
              color="#161b26"
              metalness={0.75}
              roughness={0.25}
            />
          </mesh>

          {/* 4 Prominent Vertical Aerodynamic Diffuser Strakes / Fins */}
          {[-0.27, -0.09, 0.09, 0.27].map((xFactor, idx) => (
            <mesh
              key={`diffuser-fin-${idx}`}
              position={[W * xFactor, clearance + 0.085, L * 0.488]}
              rotation={[-0.08, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.02, 0.165, 0.14]} />
              <meshStandardMaterial
                color="#121620"
                metalness={0.72}
                roughness={0.26}
              />
            </mesh>
          ))}

          {/* Flanking Rear Wheel-Arch Aero Extraction Vents */}
          {[-1, 1].map((side) => (
            <mesh
              key={`rear-vent-${side}`}
              position={[side * (W * 0.385), clearance + 0.14, L * 0.482]}
            >
              <boxGeometry args={[0.09, 0.13, 0.05]} />
              <meshStandardMaterial color="#040609" roughness={0.5} />
            </mesh>
          ))}
        </group>
      )}

      {/* Quad SpaceX Cold-Gas Rocket Thruster Nozzles nested inside the 4 Venturi Diffuser Tunnels */}
      <group name="spacex-flight-thrusters">
        {[-0.18, -0.06, 0.06, 0.18].map((xFactor, idx) => (
          <group
            key={`spacex-nozzle-${idx}`}
            position={[W * xFactor, clearance + 0.115, L * 0.485]}
          >
            {/* Titanium circular cold-gas nozzle bell */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.042, 0.054, 0.09, 20]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.9}
                roughness={0.22}
              />
            </mesh>
            {/* Inner dark combustion throat */}
            <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.05, 16]} />
              <meshBasicMaterial color="#05070c" />
            </mesh>
          </group>
        ))}

        {/* Glowing cyan/blue SpaceX cold-gas plasma plume (scales & intensifies during 3D flight / boost) */}
        <mesh
          position={[0, clearance + 0.115, L * 0.555]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[0.09, 0.28, 20]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (lightRefs) lightRefs.current.thrusterGlow = mat;
            }}
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={1.6}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Ventral levitation cold-gas thruster rings under chassis */}
        <mesh position={[0, clearance - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[W * 0.28, W * 0.36, 32]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (lightRefs) lightRefs.current.hoverRingGlow = mat;
            }}
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.2}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Detachable Sleek aerodynamic side camera mirrors */}
      {([-1, 1] as const).map((side) => {
        const cond = side === -1 ? leftMirrorCond : rightMirrorCond;
        if (cond === 'detached') return null;
        return (
          <mesh
            key={`roadster-mirror-${side}`}
            position={[
              side * (W * 0.478),
              H * 0.575 - (cond === 'loose' ? 0.055 : 0),
              -L * 0.13,
            ]}
            rotation={
              cond === 'loose'
                ? [0.35, side * -0.2, side * -0.55]
                : [0, side * -0.2, 0]
            }
            castShadow
          >
            <boxGeometry args={[0.13, 0.044, 0.11]} />
            <meshPhysicalMaterial
              color="#0b0f17"
              metalness={0.82}
              roughness={0.16}
              clearcoat={0.9}
            />
          </mesh>
        );
      })}

      {/* Razor-thin angled laser-LED headlights with DRL signature */}
      {[-1, 1].map((side) => (
        <group
          key={`roadster-hl-${side}`}
          position={[side * (W * 0.35), H * 0.39, -L * 0.464]}
          rotation={[0.15, side * 0.22, side * -0.08]}
        >
          <mesh>
            <boxGeometry args={[W * 0.23, 0.058, 0.052]} />
            <meshStandardMaterial
              color="#090d16"
              metalness={0.85}
              roughness={0.15}
            />
          </mesh>
          <mesh position={[0, 0.008, -0.006]}>
            <boxGeometry args={[W * 0.215, 0.032, 0.048]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e0f2fe"
              emissiveIntensity={2.6}
            />
          </mesh>
        </group>
      ))}

      {/* Dual Reverse LED Indicators in Rear Diffuser */}
      <mesh position={[-W * 0.36, clearance + 0.205, L * 0.486]}>
        <boxGeometry args={[0.12, 0.022, 0.025]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.36, clearance + 0.205, L * 0.486]}>
        <boxGeometry args={[0.12, 0.022, 0.025]} />
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
 * 5. PORSCHE TAYCAN 4S — Jet Black Metallic Electric Sports Saloon (Screenshot 2)
 * Features curved Porsche flyline silhouette, 4-point Matrix LED headlights,
 * vertical front wheel-arch air curtains, chrome window trim arc & 20" Aero wheels.
 */
function TaycanBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;

  const { fuselageGeo, canopyGeo, frontFenderGeo, rearFenderGeo } = useMemo(() => {
    const halfL = L / 2;

    // Porsche Taycan low-nose, sweeping flyline fastback silhouette
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.985, clearance + 0.03);
    bodyShape.quadraticCurveTo(
      -halfL * 1.0,
      clearance + 0.19,
      -halfL * 0.84,
      H * 0.44
    );
    bodyShape.bezierCurveTo(
      -halfL * 0.56,
      H * 0.56,
      halfL * 0.25,
      H * 0.62,
      halfL * 0.94,
      H * 0.58
    );
    bodyShape.quadraticCurveTo(
      halfL * 0.995,
      H * 0.38,
      halfL * 0.95,
      clearance + 0.05
    );
    bodyShape.closePath();

    // Sweeping Porsche 4-door coupe greenhouse flyline
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-halfL * 0.45, H * 0.54);
    glassShape.bezierCurveTo(
      -halfL * 0.15,
      H * 1.01,
      halfL * 0.22,
      H * 0.99,
      halfL * 0.78,
      H * 0.58
    );
    glassShape.closePath();

    const ffShape = new THREE.Shape();
    ffShape.moveTo(-halfL * 0.94, clearance + 0.04);
    ffShape.bezierCurveTo(
      -halfL * 0.82,
      H * 0.58,
      -halfL * 0.42,
      H * 0.59,
      -halfL * 0.18,
      clearance + 0.05
    );
    ffShape.closePath();

    const rfShape = new THREE.Shape();
    rfShape.moveTo(halfL * 0.16, clearance + 0.05);
    rfShape.bezierCurveTo(
      halfL * 0.4,
      H * 0.64,
      halfL * 0.82,
      H * 0.63,
      halfL * 0.96,
      clearance + 0.12
    );
    rfShape.closePath();

    return {
      fuselageGeo: createSculptedProfileGeometry(bodyShape, W * 0.9, 0.065, 0.085),
      canopyGeo: createSculptedProfileGeometry(glassShape, W * 0.76, 0.045, 0.065),
      frontFenderGeo: createSculptedProfileGeometry(ffShape, W * 0.24, 0.04, 0.055),
      rearFenderGeo: createSculptedProfileGeometry(rfShape, W * 0.26, 0.045, 0.06),
    };
  }, [L, W, H, clearance]);

  return (
    <group>
      {/* Sculpted Taycan 4S fastback fuselage */}
      <mesh geometry={fuselageGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.85}
          roughness={0.11}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>

      {/* Panoramic tinted glasshouse */}
      <mesh geometry={canopyGeo} castShadow>
        <meshPhysicalMaterial
          color="#050811"
          metalness={0.96}
          roughness={0.03}
          clearcoat={1}
        />
      </mesh>

      {/* Sculpted front & rear Porsche fenders */}
      {[-1, 1].map((side) => (
        <group key={`taycan-fenders-${side}`}>
          <mesh
            geometry={frontFenderGeo}
            position={[side * (W * 0.375), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.85}
              roughness={0.11}
              clearcoat={1}
            />
          </mesh>
          <mesh
            geometry={rearFenderGeo}
            position={[side * (W * 0.38), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.85}
              roughness={0.11}
              clearcoat={1}
            />
          </mesh>
          {/* Signature Taycan chrome window surround & lower rocker blade */}
          <mesh position={[side * (W * 0.395), H * 0.74, L * 0.08]} rotation={[-0.04, 0, 0]}>
            <boxGeometry args={[0.018, 0.022, L * 0.54]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
          </mesh>
          <mesh position={[side * (W * 0.46), clearance + 0.075, 0]}>
            <boxGeometry args={[0.025, 0.024, L * 0.48]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Flush Taycan front & rear door handles */}
          <mesh position={[side * (W * 0.458), H * 0.49, -L * 0.04]}>
            <boxGeometry args={[0.018, 0.022, 0.13]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.18} />
          </mesh>
          <mesh position={[side * (W * 0.458), H * 0.51, L * 0.16]}>
            <boxGeometry args={[0.018, 0.022, 0.13]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.18} />
          </mesh>
          {/* Taycan side mirrors */}
          <mesh position={[side * (W * 0.49), H * 0.57, -L * 0.14]} castShadow>
            <boxGeometry args={[0.14, 0.06, 0.14]} />
            <meshPhysicalMaterial color={paintColor} metalness={0.85} roughness={0.12} clearcoat={1} />
          </mesh>
        </group>
      ))}

      {/* Porsche 4-Point Matrix LED Headlights & Vertical Air Curtain Tear Ducts */}
      {[-1, 1].map((side) => (
        <group
          key={`taycan-hl-${side}`}
          position={[side * (W * 0.35), H * 0.4, -L * 0.455]}
          rotation={[0.14, side * 0.2, 0]}
        >
          <mesh>
            <boxGeometry args={[W * 0.2, 0.065, 0.06]} />
            <meshStandardMaterial color="#090d16" metalness={0.9} roughness={0.12} />
          </mesh>
          {/* 4-point LED matrix dots */}
          {[-0.05, 0.05].map((dx, i) =>
            [-0.014, 0.014].map((dy, j) => (
              <mesh key={`${i}-${j}`} position={[dx, dy, -0.026]}>
                <boxGeometry args={[0.036, 0.012, 0.02]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#e0f2fe"
                  emissiveIntensity={2.8}
                />
              </mesh>
            ))
          )}
        </group>
      ))}

      {/* Full-width Porsche Rear Light Strip */}
      <mesh position={[0, H * 0.55, L * 0.478]}>
        <boxGeometry args={[W * 0.86, 0.045, 0.04]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.brakeLightBar = mat;
          }}
          color="#dc2626"
          emissive="#ef4444"
          emissiveIntensity={1.3}
        />
      </mesh>
      <mesh position={[-W * 0.34, clearance + 0.16, L * 0.482]}>
        <boxGeometry args={[0.13, 0.035, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.34, clearance + 0.16, L * 0.482]}>
        <boxGeometry args={[0.13, 0.035, 0.03]} />
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
 * 6. MERCEDES-AMG GT R — Satin Gunmetal Grey V8 BiTurbo Coupé (Screenshot 3 Foreground)
 * Features long sculpted bonnet, wide rear haunches, oval rear hatch window,
 * slim horizontal crimson-amber tail lamps, SPEKTRA GAMES license plate & quad diffuser.
 */
function AmgGtBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;

  const { fuselageGeo, canopyGeo, frontFenderGeo, rearFenderGeo } = useMemo(() => {
    const halfL = L / 2;

    // Long-hood cab-backward AMG GT proportions
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.98, clearance + 0.03);
    bodyShape.quadraticCurveTo(
      -halfL * 1.0,
      H * 0.38,
      -halfL * 0.85,
      H * 0.5
    );
    bodyShape.bezierCurveTo(
      -halfL * 0.45,
      H * 0.58,
      halfL * 0.25,
      H * 0.62,
      halfL * 0.92,
      H * 0.56
    );
    bodyShape.quadraticCurveTo(
      halfL * 0.995,
      H * 0.35,
      halfL * 0.94,
      clearance + 0.05
    );
    bodyShape.closePath();

    // Cab-backward teardrop fastback coupe roof
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-halfL * 0.22, H * 0.55);
    glassShape.bezierCurveTo(
      halfL * 0.05,
      H * 1.01,
      halfL * 0.42,
      H * 0.98,
      halfL * 0.84,
      H * 0.56
    );
    glassShape.closePath();

    const ffShape = new THREE.Shape();
    ffShape.moveTo(-halfL * 0.94, clearance + 0.04);
    ffShape.bezierCurveTo(
      -halfL * 0.8,
      H * 0.58,
      -halfL * 0.38,
      H * 0.59,
      -halfL * 0.12,
      clearance + 0.05
    );
    ffShape.closePath();

    const rfShape = new THREE.Shape();
    rfShape.moveTo(halfL * 0.12, clearance + 0.05);
    rfShape.bezierCurveTo(
      halfL * 0.38,
      H * 0.66,
      halfL * 0.84,
      H * 0.64,
      halfL * 0.97,
      clearance + 0.12
    );
    rfShape.closePath();

    return {
      fuselageGeo: createSculptedProfileGeometry(bodyShape, W * 0.9, 0.07, 0.09),
      canopyGeo: createSculptedProfileGeometry(glassShape, W * 0.74, 0.05, 0.07),
      frontFenderGeo: createSculptedProfileGeometry(ffShape, W * 0.25, 0.045, 0.06),
      rearFenderGeo: createSculptedProfileGeometry(rfShape, W * 0.28, 0.05, 0.065),
    };
  }, [L, W, H, clearance]);

  return (
    <group>
      {/* Satin Gunmetal Grey AMG GT sculpted fuselage */}
      <mesh geometry={fuselageGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.76}
          roughness={0.22}
          clearcoat={0.75}
          clearcoatRoughness={0.14}
        />
      </mesh>

      {/* Cab-backward coupe greenhouse & oval rear hatch window */}
      <mesh geometry={canopyGeo} castShadow>
        <meshPhysicalMaterial
          color="#060a14"
          metalness={0.95}
          roughness={0.04}
          clearcoat={1}
        />
      </mesh>

      {/* Muscular AMG front fenders & wide rear haunches */}
      {[-1, 1].map((side) => (
        <group key={`amg-fenders-${side}`}>
          <mesh
            geometry={frontFenderGeo}
            position={[side * (W * 0.375), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.76}
              roughness={0.22}
              clearcoat={0.75}
            />
          </mesh>
          <mesh
            geometry={rearFenderGeo}
            position={[side * (W * 0.385), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.76}
              roughness={0.22}
              clearcoat={0.75}
            />
          </mesh>
          {/* Side mirrors */}
          <mesh position={[side * (W * 0.49), H * 0.58, -L * 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.058, 0.13]} />
            <meshStandardMaterial color="#0b0f17" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Panamericana vertical-slat front grille */}
      <mesh position={[0, clearance + 0.18, -L * 0.488]}>
        <boxGeometry args={[W * 0.56, 0.18, 0.04]} />
        <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.25} />
      </mesh>
      {[-0.22, -0.15, -0.08, 0, 0.08, 0.15, 0.22].map((xf, idx) => (
        <mesh key={idx} position={[W * xf, clearance + 0.18, -L * 0.496]}>
          <boxGeometry args={[0.012, 0.16, 0.02]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
        </mesh>
      ))}

      {/* Aggressive AMG LED Headlights */}
      {[-1, 1].map((side) => (
        <group
          key={`amg-hl-${side}`}
          position={[side * (W * 0.36), H * 0.42, -L * 0.445]}
          rotation={[0.14, side * 0.24, side * -0.06]}
        >
          <mesh>
            <boxGeometry args={[W * 0.21, 0.065, 0.06]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#e0f2fe"
              emissiveIntensity={2.6}
            />
          </mesh>
        </group>
      ))}

      {/* Signature AMG GT slim horizontal crimson-amber rear tail lamps (Screenshot 3) */}
      {[-1, 1].map((side) => (
        <group
          key={`amg-tl-${side}`}
          position={[side * (W * 0.31), H * 0.49, L * 0.468]}
          rotation={[0, side * -0.18, side * 0.06]}
        >
          <mesh>
            <boxGeometry args={[W * 0.26, 0.068, 0.045]} />
            <meshStandardMaterial
              ref={(mat) => {
                if (lightRefs) {
                  if (side === -1) lightRefs.current.brakeLightLeft = mat;
                  else lightRefs.current.brakeLightRight = mat;
                }
              }}
              color="#dc2626"
              emissive="#ef4444"
              emissiveIntensity={1.35}
            />
          </mesh>
          {/* Inner amber LED light strip */}
          <mesh position={[0, -0.012, 0.006]}>
            <boxGeometry args={[W * 0.22, 0.018, 0.04]} />
            <meshStandardMaterial
              color="#f97316"
              emissive="#f97316"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}

      {/* Rear license plate recess & white plate (matching Screenshot 3) */}
      <mesh position={[0, clearance + 0.17, L * 0.486]}>
        <boxGeometry args={[0.42, 0.095, 0.02]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0.18, clearance + 0.17, L * 0.492]}>
        <boxGeometry args={[0.045, 0.088, 0.01]} />
        <meshStandardMaterial color="#eab308" roughness={0.3} />
      </mesh>

      {/* Rear carbon diffuser & quad exhaust tips */}
      <mesh position={[0, clearance + 0.09, L * 0.47]}>
        <boxGeometry args={[W * 0.88, 0.13, 0.12]} />
        <meshStandardMaterial color="#090c12" metalness={0.65} roughness={0.3} />
      </mesh>
      {[-0.32, 0.32].map((xf, idx) => (
        <mesh key={idx} position={[W * xf, clearance + 0.085, L * 0.488]}>
          <boxGeometry args={[0.16, 0.055, 0.04]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Reverse Lights */}
      <mesh position={[-W * 0.32, clearance + 0.16, L * 0.484]}>
        <boxGeometry args={[0.13, 0.03, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.32, clearance + 0.16, L * 0.484]}>
        <boxGeometry args={[0.13, 0.03, 0.03]} />
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
 * 7. OBSIDIAN V12 HYPERCAR — Low-Slung Carbon Monocoque Hypercar (Screenshot 1 Top-Right & Screenshot 3 Left)
 * Features razor-low nose splitter, front wheel-arch aero cutaways, metallic silver cockpit canopy arc,
 * Y-signature amber/crimson LED tail lamps, slatted V12 rear engine deck louvers & active diffuser.
 */
function ApexHypercarBody({
  vehicle,
  chassis,
  paintColor,
  lightRefs,
}: BodySectionProps) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;

  const { fuselageGeo, canopyGeo, frontFenderGeo, rearFenderGeo } = useMemo(() => {
    const halfL = L / 2;

    // Extreme low-slung hypercar wedge profile
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-halfL * 0.995, clearance + 0.02);
    bodyShape.lineTo(-halfL * 0.92, H * 0.36);
    bodyShape.bezierCurveTo(
      -halfL * 0.65,
      H * 0.52,
      -halfL * 0.18,
      H * 0.58,
      halfL * 0.45,
      H * 0.64
    );
    bodyShape.lineTo(halfL * 0.98, H * 0.58);
    bodyShape.lineTo(halfL * 0.94, clearance + 0.04);
    bodyShape.closePath();

    // Teardrop fighter-jet canopy dome
    const glassShape = new THREE.Shape();
    glassShape.moveTo(-halfL * 0.48, H * 0.52);
    glassShape.bezierCurveTo(
      -halfL * 0.18,
      H * 1.02,
      halfL * 0.16,
      H * 1.0,
      halfL * 0.68,
      H * 0.62
    );
    glassShape.closePath();

    // Sculpted front wheel arch with dramatic aero cutaway behind wheel (Screenshot 1 Top-Right)
    const ffShape = new THREE.Shape();
    ffShape.moveTo(-halfL * 0.97, clearance + 0.03);
    ffShape.bezierCurveTo(
      -halfL * 0.84,
      H * 0.62,
      -halfL * 0.42,
      H * 0.64,
      -halfL * 0.14,
      H * 0.36
    );
    ffShape.lineTo(-halfL * 0.22, clearance + 0.04);
    ffShape.closePath();

    const rfShape = new THREE.Shape();
    rfShape.moveTo(halfL * 0.08, clearance + 0.04);
    rfShape.bezierCurveTo(
      halfL * 0.35,
      H * 0.68,
      halfL * 0.82,
      H * 0.68,
      halfL * 0.98,
      clearance + 0.14
    );
    rfShape.closePath();

    return {
      fuselageGeo: createSculptedProfileGeometry(bodyShape, W * 0.88, 0.06, 0.08),
      canopyGeo: createSculptedProfileGeometry(glassShape, W * 0.7, 0.045, 0.06),
      frontFenderGeo: createSculptedProfileGeometry(ffShape, W * 0.26, 0.04, 0.055),
      rearFenderGeo: createSculptedProfileGeometry(rfShape, W * 0.28, 0.045, 0.06),
    };
  }, [L, W, H, clearance]);

  return (
    <group>
      {/* Obsidian Black & Metallic Carbon Monocoque Fuselage */}
      <mesh geometry={fuselageGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={paintColor}
          metalness={0.88}
          roughness={0.11}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>

      {/* Fighter-jet glass canopy */}
      <mesh geometry={canopyGeo} castShadow>
        <meshPhysicalMaterial
          color="#040710"
          metalness={0.96}
          roughness={0.03}
          clearcoat={1}
        />
      </mesh>

      {/* Signature metallic silver roofline arch (from Screenshot 1 Top-Right) */}
      {[-1, 1].map((side) => (
        <group key={`hyper-side-${side}`}>
          <mesh
            geometry={frontFenderGeo}
            position={[side * (W * 0.38), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.88}
              roughness={0.11}
              clearcoat={1}
            />
          </mesh>
          <mesh
            geometry={rearFenderGeo}
            position={[side * (W * 0.385), 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color={paintColor}
              metalness={0.88}
              roughness={0.11}
              clearcoat={1}
            />
          </mesh>
          {/* Metallic silver canopy arch line */}
          <mesh position={[side * (W * 0.355), H * 0.86, -L * 0.02]} rotation={[-0.08, 0, 0]}>
            <boxGeometry args={[0.032, 0.038, L * 0.56]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.1} />
          </mesh>
          {/* Aerodynamic wing-stalk side mirrors */}
          <mesh position={[side * (W * 0.49), H * 0.62, -L * 0.13]} castShadow>
            <boxGeometry args={[0.15, 0.045, 0.12]} />
            <meshStandardMaterial color="#090d16" metalness={0.85} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* Slatted V12 Rear Engine Bay Louvers */}
      {[-0.12, -0.04, 0.04, 0.12, 0.2].map((zf, idx) => (
        <mesh key={idx} position={[0, H * 0.72 - idx * 0.022, L * (0.14 + zf)]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[W * 0.42, 0.018, 0.055]} />
          <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.22} />
        </mesh>
      ))}

      {/* Razor-sharp Hypercar LED Headlights */}
      {[-1, 1].map((side) => (
        <group
          key={`hyper-hl-${side}`}
          position={[side * (W * 0.36), H * 0.37, -L * 0.455]}
          rotation={[0.18, side * 0.22, side * -0.1]}
        >
          <mesh>
            <boxGeometry args={[W * 0.22, 0.045, 0.05]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#bae6fd"
              emissiveIntensity={2.8}
            />
          </mesh>
        </group>
      ))}

      {/* Y-Signature Amber/Crimson Hypercar Rear Tail Lamps (Screenshot 3 Left) */}
      {[-1, 1].map((side) => (
        <group key={`hyper-tl-${side}`} position={[side * (W * 0.32), H * 0.54, L * 0.478]}>
          <mesh>
            <boxGeometry args={[W * 0.24, 0.052, 0.04]} />
            <meshStandardMaterial
              ref={(mat) => {
                if (lightRefs) {
                  if (side === -1) lightRefs.current.brakeLightLeft = mat;
                  else lightRefs.current.brakeLightRight = mat;
                }
              }}
              color="#f97316"
              emissive="#ef4444"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      ))}

      {/* Rear carbon diffuser & high-mounted dual exhausts */}
      <mesh position={[0, clearance + 0.11, L * 0.468]}>
        <boxGeometry args={[W * 0.9, 0.16, 0.16]} />
        <meshStandardMaterial color="#090c12" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh position={[-W * 0.34, clearance + 0.16, L * 0.484]}>
        <boxGeometry args={[0.13, 0.03, 0.03]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (lightRefs) lightRefs.current.reverseLightLeft = mat;
          }}
          color="#e2e8f0"
          emissive="#ffffff"
          emissiveIntensity={0}
        />
      </mesh>
      <mesh position={[W * 0.34, clearance + 0.16, L * 0.484]}>
        <boxGeometry args={[0.13, 0.03, 0.03]} />
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
 * Renders exposed internal mechanical parts (when bumpers/hood/fenders detach),
 * 3D sheet-metal dent craters & paint scrapes at exact collision coordinates,
 * and spiderweb windshield cracks.
 */
function VehicleDamageOverlay({
  vehicle,
  chassis,
  damageState,
}: {
  vehicle: VehicleDefinition;
  chassis: VehicleChassisSpec;
  damageState?: VehicleDamageState;
}) {
  if (!damageState) return null;

  const { length: L, width: W, height: H } = vehicle.dimensions;
  const clearance = chassis.groundClearance;
  const lowerH = (H - clearance) * 0.48;

  const frontBumperCond = damageState.parts['front-bumper'];
  const rearBumperCond = damageState.parts['rear-bumper'];
  const hoodCond = damageState.parts['hood'];
  const frontDamage = damageState.zones.front;

  return (
    <group name="vehicle-damage-overlay">
      {/* Exposed Front Crash Bar & Radiator Core when front bumper is loose or detached */}
      {(frontBumperCond === 'detached' ||
        frontBumperCond === 'loose' ||
        frontDamage > 0.35) && (
        <group position={[0, clearance + lowerH * 0.38, -L * 0.45]}>
          {/* Steel front crash beam */}
          <mesh>
            <boxGeometry args={[W * 0.76, 0.09, 0.08]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.35} />
          </mesh>
          {/* Aluminum radiator fin core */}
          <mesh position={[0, 0.02, 0.06]}>
            <boxGeometry args={[W * 0.54, lowerH * 0.48, 0.05]} />
            <meshStandardMaterial color="#64748b" metalness={0.78} roughness={0.42} />
          </mesh>
        </group>
      )}

      {/* Exposed Internal Engine Bay when hood is loose or detached */}
      {(hoodCond === 'detached' || hoodCond === 'loose') && (
        <group position={[0, clearance + lowerH * 0.72, -L * 0.29]}>
          {/* Dark recessed engine bay floor */}
          <mesh>
            <boxGeometry args={[W * 0.76, 0.14, L * 0.28]} />
            <meshStandardMaterial color="#090d16" roughness={0.85} metalness={0.25} />
          </mesh>
          {/* Engine cylinder block / inverter housing */}
          <mesh position={[0, 0.09, 0.02]}>
            <boxGeometry args={[W * 0.38, 0.16, L * 0.17]} />
            <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.3} />
          </mesh>
          {/* Red/Silver performance strut tower brace */}
          <mesh position={[0, 0.16, -0.03]}>
            <boxGeometry args={[W * 0.68, 0.025, 0.035]} />
            <meshStandardMaterial color="#dc2626" metalness={0.75} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* Exposed Rear Crash Beam & Exhaust when rear bumper is detached */}
      {(rearBumperCond === 'detached' || rearBumperCond === 'loose') && (
        <group position={[0, clearance + lowerH * 0.34, L * 0.45]}>
          <mesh>
            <boxGeometry args={[W * 0.74, 0.085, 0.08]} />
            <meshStandardMaterial color="#475569" metalness={0.82} roughness={0.38} />
          </mesh>
          <mesh position={[-W * 0.24, -0.06, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.22, 12]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.25} />
          </mesh>
        </group>
      )}

      {/* Spiderweb Windscreen Cracks when front damage is significant */}
      {frontDamage > 0.28 && (
        <group
          position={[0, clearance + lowerH + (H - clearance) * 0.24, -L * 0.17]}
          rotation={[0.5, 0, 0]}
        >
          {[-0.35, -0.12, 0.18, 0.42, 0.75, -0.68].map((angle, idx) => (
            <mesh
              key={`crack-${idx}`}
              position={[0.14, 0.02, 0.075]}
              rotation={[0, 0, angle]}
            >
              <boxGeometry args={[W * 0.34 * Math.min(1, frontDamage * 1.3), 0.008, 0.006]} />
              <meshBasicMaterial color="#e2e8f0" transparent opacity={0.72} />
            </mesh>
          ))}
        </group>
      )}

      {/* 3D Localized Dents, Crumpled Sheet-Metal Creases & Bare-Metal Paint Scrapes */}
      {damageState.dents.map((dent) => (
        <group
          key={dent.id}
          position={dent.localPos}
          rotation={[0, (dent.localPos[0] + dent.localPos[2]) * 1.4, 0]}
        >
          {/* Concave dark crumpled dent depression */}
          <mesh scale={[1.15, 0.65, 1.35]}>
            <dodecahedronGeometry args={[dent.radius * 0.55, 0]} />
            <meshStandardMaterial
              color="#0f172a"
              metalness={0.78}
              roughness={0.62}
            />
          </mesh>
          {/* Bare steel / primer scrape streak across the panel */}
          <mesh position={[0, 0.015, 0]} rotation={[0.15, 0.25, -0.18]}>
            <boxGeometry
              args={[
                dent.radius * 1.45,
                0.024,
                Math.max(0.05, dent.depth * 1.1),
              ]}
            />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.92}
              roughness={0.32}
            />
          </mesh>
          {/* Secondary dark crease ridge */}
          <mesh position={[0, -0.018, 0]} rotation={[-0.2, -0.15, 0.28]}>
            <boxGeometry args={[dent.radius * 1.1, 0.018, 0.04]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.65}
              roughness={0.75}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
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

  const isLowSports =
    vehicle.category === 'sports' ||
    vehicle.category === 'electric-roadster' ||
    vehicle.id === 'apex-hypercar' ||
    vehicle.id === 'amg-gt';

  const legoStudCoords = useMemo(() => {
    const studs: Array<{ x: number; y: number; z: number; color?: string }> = [];
    const cols = [-W * 0.28, -W * 0.095, W * 0.095, W * 0.28];

    const hoodY = isLowSports
      ? H * 0.56
      : clearance + (H - clearance) * 0.52;
    for (const x of cols) {
      for (const z of [-L * 0.38, -L * 0.27]) {
        studs.push({ x, y: hoodY, z });
      }
    }

    const roofY = isLowSports ? H * 0.94 : H - 0.01;
    for (const x of cols) {
      for (const z of [-L * 0.04, L * 0.09, L * 0.22]) {
        studs.push({ x, y: roofY, z });
      }
    }

    const rearY = isLowSports
      ? H * 0.65
      : clearance + (H - clearance) * 0.52;
    for (const x of cols) {
      studs.push({ x, y: rearY, z: L * 0.38, color: '#facc15' });
    }

    return studs;
  }, [L, W, H, clearance, isLowSports]);

  const roofTopY = isLowSports ? H * 0.96 : H + 0.01;

  if (skin.id === 'factory' && accessoryId === 'none') {
    return null;
  }

  return (
    <group name="creative-skin-3d-overlays">
      {skin.id === 'wooden' && (
        <group name="wooden-car-craft">
          {[-W * 0.26, 0, W * 0.26].map((xPos, idx) => (
            <group key={`wood-plank-${idx}`}>
              <mesh position={[xPos, roofTopY - 0.01, L * 0.08]} castShadow>
                <boxGeometry args={[0.075, 0.025, L * 0.42]} />
                <meshStandardMaterial color="#6f4518" roughness={0.74} metalness={0.04} />
              </mesh>
              <mesh position={[xPos, clearance + (H - clearance) * 0.51, -L * 0.31]}>
                <boxGeometry args={[0.075, 0.025, L * 0.28]} />
                <meshStandardMaterial color="#6f4518" roughness={0.74} metalness={0.04} />
              </mesh>
            </group>
          ))}
          {[-L * 0.505, L * 0.505].map((zPos, idx) => (
            <mesh
              key={`wood-bumper-${idx}`}
              position={[0, clearance + 0.14, zPos]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.065, 0.065, W * 0.96, 16]} />
              <meshStandardMaterial color="#deb887" roughness={0.62} metalness={0.05} />
            </mesh>
          ))}
        </group>
      )}

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
        </group>
      )}

      {skin.id === 'cardboard' && (
        <group name="cardboard-diy-details">
          {[
            { pos: [-W * 0.32, roofTopY + 0.008, -L * 0.05], rot: [0, 0.25, 0] },
            { pos: [W * 0.32, roofTopY + 0.008, L * 0.15], rot: [0, -0.3, 0] },
            { pos: [0, clearance + (H - clearance) * 0.52, -L * 0.32], rot: [0.08, 0.4, 0] },
          ].map((tape, idx) => (
            <mesh
              key={`masking-tape-${idx}`}
              position={tape.pos as [number, number, number]}
              rotation={tape.rot as [number, number, number]}
            >
              <boxGeometry args={[0.24, 0.012, 0.075]} />
              <meshStandardMaterial color="#f3e5ab" roughness={0.85} metalness={0.02} />
            </mesh>
          ))}
        </group>
      )}

      {skin.id === 'cyberpunk' && (
        <group name="cyberpunk-holo-details">
          <mesh position={[0, clearance + (H - clearance) * 0.5, 0]}>
            <boxGeometry args={[W * 1.03, (H - clearance) * 0.96, L * 0.99]} />
            <meshBasicMaterial color="#00f5d4" wireframe transparent opacity={0.42} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={`cyber-underglow-${side}`} position={[side * (W * 0.46), 0.025, 0]}>
              <boxGeometry args={[0.06, 0.025, L * 0.84]} />
              <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2.6} />
            </mesh>
          ))}
        </group>
      )}

      {skin.id === 'gummy' && (
        <group name="gummy-candy-details">
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

      {accessoryId === 'windup-key' && (
        <group
          ref={windupKeyRef}
          position={[0, roofTopY + 0.02, L * 0.08]}
          name="clockwork-windup-key"
        >
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.14, 0.08, 16]} />
            <meshStandardMaterial color="#d97706" metalness={0.88} roughness={0.18} />
          </mesh>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.34, 14]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.14} />
          </mesh>
          {[-0.16, 0.16].map((xLoop, idx) => (
            <mesh key={`key-loop-${idx}`} position={[xLoop, 0.42, 0]} castShadow>
              <torusGeometry args={[0.14, 0.036, 14, 24]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.92} roughness={0.14} />
            </mesh>
          ))}
        </group>
      )}

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

      {accessoryId === 'paper-wings' && (
        <group position={[0, roofTopY + 0.02, L * 0.08]} name="origami-paper-wings">
          <mesh position={[0, 0.18, 0.06]} castShadow>
            <boxGeometry args={[0.022, 0.34, 0.46]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.82} metalness={0.02} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={`paper-wing-${side}`}
              position={[side * (W * 0.38), 0.1, 0.05]}
              rotation={[0, side * -0.18, side * -0.14]}
              castShadow
            >
              <boxGeometry args={[W * 0.56, 0.018, 0.42]} />
              <meshStandardMaterial color="#fdfcf0" roughness={0.8} metalness={0.02} />
            </mesh>
          ))}
        </group>
      )}

      {accessoryId === 'holo-halo' && (
        <group ref={holoHaloRef} position={[0, roofTopY + 0.24, L * 0.05]} name="cyber-holo-halo">
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[W * 0.34, 0.022, 14, 36]} />
            <meshStandardMaterial color="#00f5d4" emissive="#00f5d4" emissiveIntensity={2.5} />
          </mesh>
        </group>
      )}

      {accessoryId === 'instructor-beacon' && (
        <group position={[0, roofTopY + 0.08, L * 0.02]} name="uk-instructor-roof-beacon">
          <mesh rotation={[0, Math.PI / 2, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, W * 0.48, 3]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#fef08a"
              emissiveIntensity={0.45}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function VehicleModel({
  vehicle,
  wheelRefs,
  lightRefs,
  impactFlash = false,
  damageState,
  customizationOverride,
  isTrafficObstacle = false,
}: VehicleModelProps) {
  const { customization } = useCustomization();
  const activeCarConfig: CarCustomization = useMemo(
    () => ({
      ...customization.car,
      ...customizationOverride,
    }),
    [customization.car, customizationOverride]
  );

  // If this is a parked traffic obstacle, match the world theme when wooden/lego is active
  const effectiveSkinId =
    isTrafficObstacle &&
    !customizationOverride?.skinId &&
    customization.environmentId === 'wooden-playset'
      ? 'wooden'
      : isTrafficObstacle &&
          !customizationOverride?.skinId &&
          customization.environmentId === 'lego-brick-city'
        ? 'lego'
        : isTrafficObstacle && !customization.car.applyToTraffic
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

  // Crumple zone deformation: heavy front/rear/side hits slightly compress the body shell
  const frontCrush = damageState?.zones.front ?? 0;
  const rearCrush = damageState?.zones.rear ?? 0;
  const leftCrush = damageState?.zones.left ?? 0;
  const rightCrush = damageState?.zones.right ?? 0;

  const crumpleScaleZ = 1 - (frontCrush + rearCrush) * 0.052;
  const crumpleScaleX = 1 - (leftCrush + rightCrush) * 0.036;
  const crumpleOffsetZ = (frontCrush - rearCrush) * 0.085;

  // Bent wheel camber when left or right suspension takes heavy damage
  const leftWheelCamber = leftCrush > 0.2 ? leftCrush * 0.22 : 0;
  const rightWheelCamber = rightCrush > 0.2 ? -rightCrush * 0.22 : 0;

  return (
    <group name={`vehicle-model-${vehicle.id}`}>
      {/* Main Vehicle Chassis Group */}
      <group position={[0, flightLiftY, 0]}>
        {/* Deformable Body Shell Group */}
        <group
          position={[0, 0, crumpleOffsetZ]}
          scale={[crumpleScaleX, 1, crumpleScaleZ]}
        >
          {vehicle.id === 'porsche-taycan' ? (
            <TaycanBody
              vehicle={vehicle}
              chassis={chassis}
              paintColor={paintColor}
              lightRefs={lightRefs}
              damageState={damageState}
            />
          ) : vehicle.id === 'amg-gt' ? (
            <AmgGtBody
              vehicle={vehicle}
              chassis={chassis}
              paintColor={paintColor}
              lightRefs={lightRefs}
              damageState={damageState}
            />
          ) : vehicle.id === 'apex-hypercar' ? (
            <ApexHypercarBody
              vehicle={vehicle}
              chassis={chassis}
              paintColor={paintColor}
              lightRefs={lightRefs}
              damageState={damageState}
            />
          ) : (
            <>
              {(vehicle.category === 'hatchback' ||
                vehicle.category === 'compact') && (
                <HatchbackBody
                  vehicle={vehicle}
                  chassis={chassis}
                  paintColor={paintColor}
                  lightRefs={lightRefs}
                  damageState={damageState}
                />
              )}
              {(vehicle.category === 'sedan' ||
                vehicle.category === 'saloon') && (
                <SedanBody
                  vehicle={vehicle}
                  chassis={chassis}
                  paintColor={paintColor}
                  lightRefs={lightRefs}
                  damageState={damageState}
                />
              )}
              {vehicle.category === 'suv' && (
                <SuvBody
                  vehicle={vehicle}
                  chassis={chassis}
                  paintColor={paintColor}
                  lightRefs={lightRefs}
                  damageState={damageState}
                />
              )}
              {(vehicle.category === 'sports' ||
                vehicle.category === 'electric-roadster') && (
                <RoadsterBody
                  vehicle={vehicle}
                  chassis={chassis}
                  paintColor={paintColor}
                  lightRefs={lightRefs}
                  damageState={damageState}
                />
              )}
            </>
          )}

          {/* 3D Dents, Scrapes & Exposed Internal Engine/Crash-Bar Overlay */}
          <VehicleDamageOverlay
            vehicle={vehicle}
            chassis={chassis}
            damageState={damageState}
          />

          {/* Creative 3D Skin & Accessory Sculptural Overlays */}
          <CreativeSkin3DOverlays
            vehicle={vehicle}
            chassis={chassis}
            skin={skin}
            paintColor={paintColor}
            accessoryId={effectiveAccessory}
          />
        </group>

        {/* 4 Independent Wheel Assemblies (with damaged camber tilt on side impacts) */}
        {/* Front Left (-X, -Z) */}
        <group
          position={[-halfTrackX, wheelRadius, frontAxleZ]}
          rotation={[0, 0, leftWheelCamber]}
        >
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={true}
            category={vehicle.category}
            vehicleId={vehicle.id}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontLeftSpin = node;
            }}
          />
        </group>

        {/* Front Right (+X, -Z) */}
        <group
          position={[halfTrackX, wheelRadius, frontAxleZ]}
          rotation={[0, 0, rightWheelCamber]}
        >
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={true}
            category={vehicle.category}
            vehicleId={vehicle.id}
            steerRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSteer = node;
            }}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.frontRightSpin = node;
            }}
          />
        </group>

        {/* Rear Left (-X, +Z) */}
        <group
          position={[-halfTrackX, wheelRadius, rearAxleZ]}
          rotation={[0, 0, leftWheelCamber * 0.7]}
        >
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={false}
            isFront={false}
            category={vehicle.category}
            vehicleId={vehicle.id}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearLeftSpin = node;
            }}
          />
        </group>

        {/* Rear Right (+X, +Z) */}
        <group
          position={[halfTrackX, wheelRadius, rearAxleZ]}
          rotation={[0, 0, rightWheelCamber * 0.7]}
        >
          <WheelAssembly
            radius={wheelRadius}
            width={wheelWidth}
            isRightSide={true}
            isFront={false}
            category={vehicle.category}
            vehicleId={vehicle.id}
            spinRef={(node) => {
              if (wheelRefs) wheelRefs.current.rearRightSpin = node;
            }}
          />
        </group>
      </group>
    </group>
  );
}
