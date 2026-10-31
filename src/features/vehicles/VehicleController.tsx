/**
 * PARKLAB 3D — Player Vehicle Controller (React Three Fiber)
 * Integrates keyboard input, realistic driving & crash physics, OBB obstacle collision handling,
 * real-time car health & dent deformation, detachable 3D car parts with rigid-body bounce physics,
 * metallic impact sparks, engine smoke plumes, and throttled runtime telemetry reporting.
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type {
  ObstacleDefinition,
  Vec3,
  VehicleDamageState,
  VehicleDefinition,
  VehicleRuntimeState,
} from './types';
import { getChassisSpec, VEHICLES } from './vehicles';
import { useKeyboardControls } from './useKeyboardControls';
import {
  createInitialPhysicsState,
  stepDrivingPhysics,
  type InternalPhysicsState,
} from './drivingPhysics';
import {
  createCollisionTrackerState,
  resetCollisionTrackerState,
  resolveVehicleCollisions,
  type CollisionTrackerState,
  type WorldBoundaryLimits,
} from './collisionDetection';
import {
  applyCollisionDamage,
  cloneDamageStateSnapshot,
  createInitialDamageState,
  stepDamageDebrisAndSparks,
} from './damageSystem';
import {
  VehicleModel,
  type VehicleLightRefs,
  type VehicleWheelRefs,
} from './VehicleModels';
import { useCustomization } from '../../config/customization.config';

export interface VehicleControllerProps {
  /** Selected player vehicle definition */
  vehicle?: VehicleDefinition;
  /** Spawn position [x, y, z] in world space */
  initialPosition?: Vec3;
  /** Spawn heading rotation around Y axis in radians */
  initialRotationY?: number;
  /** Static obstacles from the active parking challenge or real-world city */
  obstacles?: ObstacleDefinition[];
  /** Whether keyboard driving controls are active */
  enabled?: boolean;
  /** Throttled callback receiving current vehicle telemetry state */
  onStateChange?: (state: VehicleRuntimeState) => void;
  /** Callback fired once per distinct obstacle/boundary collision event */
  onCollision?: (obstacle: ObstacleDefinition, collisionCount: number) => void;
  /** Callback fired when vehicle structural health reaches 0% (Totaled) */
  onTotaled?: (damage: VehicleDamageState) => void;
  /** Optional world boundary overrides */
  worldBounds?: WorldBoundaryLimits;
  /** Optional external reset token to force respawn at initial transform */
  resetKey?: string | number;
  /** Alias reset token to force respawn at initial transform */
  resetTrigger?: string | number;
}

const DEFAULT_INITIAL_POSITION: Vec3 = [0, 0, 0];
const MOVING_SPEED_THRESHOLD_MPS = 0.03;
const STATE_REPORT_INTERVAL_SEC = 1 / 30; // ~30 Hz throttled React telemetry updates

export function VehicleController({
  vehicle = VEHICLES[0],
  initialPosition = DEFAULT_INITIAL_POSITION,
  initialRotationY = 0,
  obstacles = [],
  enabled = true,
  onStateChange,
  onCollision,
  onTotaled,
  worldBounds,
  resetKey,
  resetTrigger,
}: VehicleControllerProps) {
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const chassisSuspensionRef = useRef<THREE.Group | null>(null);
  const smokeGroupRef = useRef<THREE.Group | null>(null);

  const debrisGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const sparkMeshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const [visualDamage, setVisualDamage] = useState<VehicleDamageState>(() =>
    createInitialDamageState()
  );

  const wheelRefs = useRef<VehicleWheelRefs>({
    frontLeftSteer: null,
    frontRightSteer: null,
    frontLeftSpin: null,
    frontRightSpin: null,
    rearLeftSpin: null,
    rearRightSpin: null,
  });

  const lightRefs = useRef<VehicleLightRefs>({
    brakeLightLeft: null,
    brakeLightRight: null,
    brakeLightBar: null,
    reverseLightLeft: null,
    reverseLightRight: null,
    thrusterGlow: null,
    hoverRingGlow: null,
  });

  const inputRef = useKeyboardControls(enabled);

  // Internal simulation refs to avoid React re-renders on every animation frame
  const physicsRef = useRef<InternalPhysicsState>(
    createInitialPhysicsState(initialPosition, initialRotationY)
  );
  const collisionTrackerRef = useRef<CollisionTrackerState>(
    createCollisionTrackerState()
  );
  const damageRef = useRef<VehicleDamageState>(createInitialDamageState());
  const hasFiredTotaledRef = useRef<boolean>(false);
  const collisionCountRef = useRef<number>(0);
  const impactShakeRef = useRef<number>(0);
  const lastReportTimeRef = useRef<number>(-1);
  const lastReportedMovingRef = useRef<boolean>(false);
  const lastReportedSteerRef = useRef<number>(0);

  // Keep latest callbacks & obstacles in refs so useFrame never uses stale closures
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const onCollisionRef = useRef(onCollision);
  onCollisionRef.current = onCollision;

  const onTotaledRef = useRef(onTotaled);
  onTotaledRef.current = onTotaled;

  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;

  const { effectivePhysics } = useCustomization();
  const effectivePhysicsRef = useRef(effectivePhysics);
  effectivePhysicsRef.current = effectivePhysics;

  const spawnX = initialPosition[0];
  const spawnY = initialPosition[1];
  const spawnZ = initialPosition[2];

  // Reset vehicle state & restore 100% health when spawn transform, vehicle, or resetKey changes
  useEffect(() => {
    const startPos: Vec3 = [spawnX, spawnY, spawnZ];
    physicsRef.current = createInitialPhysicsState(startPos, initialRotationY);
    resetCollisionTrackerState(collisionTrackerRef.current);
    const freshDamage = createInitialDamageState();
    damageRef.current = freshDamage;
    hasFiredTotaledRef.current = false;
    setVisualDamage(cloneDamageStateSnapshot(freshDamage));
    debrisGroupRefs.current.clear();
    sparkMeshRefs.current.clear();

    collisionCountRef.current = 0;
    impactShakeRef.current = 0;
    lastReportTimeRef.current = -1;
    lastReportedMovingRef.current = false;
    lastReportedSteerRef.current = 0;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(spawnX, spawnY, spawnZ);
      rootGroupRef.current.rotation.set(0, initialRotationY, 0);
    }
    if (chassisSuspensionRef.current) {
      chassisSuspensionRef.current.position.set(0, 0, 0);
      chassisSuspensionRef.current.rotation.set(0, 0, 0);
    }

    onStateChangeRef.current?.({
      position: [spawnX, spawnY, spawnZ],
      rotationY: initialRotationY,
      speedMps: 0,
      steeringAngle: 0,
      collisionCount: 0,
      isMoving: false,
      isBraking: false,
      isReversing: false,
      damage: cloneDamageStateSnapshot(freshDamage),
    });
  }, [spawnX, spawnY, spawnZ, initialRotationY, vehicle.id, resetKey, resetTrigger]);

  useFrame((frameState, delta) => {
    const physics = physicsRef.current;
    const damage = damageRef.current;
    const elapsed = frameState.clock.getElapsedTime();
    const chassisSpec = getChassisSpec(vehicle);
    const isFlying = Boolean(chassisSpec.isFlyingVehicle);

    // 1. Step driving kinematics (incorporating mechanical damage, totaled lock & customized car physics)
    const customPhys = effectivePhysicsRef.current;
    stepDrivingPhysics(
      physics,
      inputRef.current,
      vehicle,
      delta,
      enabled,
      damage,
      customPhys
    );

    // 2. Resolve collisions against obstacles & outer world boundaries
    const collisionResult = resolveVehicleCollisions({
      position: physics.position,
      rotationY: physics.rotationY,
      speedMps: physics.speedMps,
      lateralVelocityX: physics.lateralVelocityX,
      lateralVelocityZ: physics.lateralVelocityZ,
      vehicleDimensions: vehicle.dimensions,
      obstacles: obstaclesRef.current,
      tracker: collisionTrackerRef.current,
      elapsedTimeSec: elapsed,
      worldBounds,
    });

    physics.speedMps = collisionResult.speedMps;

    const { outcome } = collisionResult;
    if (outcome.newCollisionsCounted > 0) {
      collisionCountRef.current += outcome.newCollisionsCounted;

      const impulseScale =
        customPhys.restitutionMultiplier /
        Math.sqrt(Math.max(0.5, customPhys.massMultiplier));

      for (let i = 0; i < outcome.impactEvents.length; i++) {
        const impact = outcome.impactEvents[i];

        // Apply rigid-body yaw spin, lateral rebound, and suspension shock impulses scaled by customized car physics
        physics.angularVelocityY += impact.yawImpulseRadPerSec * impulseScale;
        physics.lateralVelocityX += impact.lateralImpulseX * impulseScale;
        physics.lateralVelocityZ += impact.lateralImpulseZ * impulseScale;
        physics.pitchRad += impact.pitchImpulse * customPhys.suspensionCompliance;
        physics.rollRad += impact.rollImpulse * customPhys.suspensionCompliance;

        const shakeIntensity = Math.min(
          0.55,
          0.18 + impact.normalImpactSpeedMps * 0.045
        );
        impactShakeRef.current = Math.max(impactShakeRef.current, shakeIntensity);

        // Apply structural health loss, 3D dents, detachable parts & sparks for any customized car
        applyCollisionDamage(
          damage,
          impact,
          vehicle,
          physics.position,
          physics.rotationY,
          customPhys
        );
      }

      const snapshot = cloneDamageStateSnapshot(damage);
      setVisualDamage(snapshot);

      for (let i = 0; i < outcome.collidedObstacles.length; i++) {
        onCollisionRef.current?.(
          outcome.collidedObstacles[i],
          collisionCountRef.current
        );
      }

      if (damage.isTotaled && !hasFiredTotaledRef.current) {
        hasFiredTotaledRef.current = true;
        onTotaledRef.current?.(snapshot);
      }
    }

    // 2b. Step 3D detached car parts (gravity, bounce, asphalt friction) & spark particles
    const hadExpiredSparks = damage.sparks.length > 0;
    stepDamageDebrisAndSparks(damage, delta, customPhys);
    if (hadExpiredSparks && damage.sparks.length === 0) {
      setVisualDamage(cloneDamageStateSnapshot(damage));
    }

    // Update world-space detached debris meshes at 60 FPS
    for (let i = 0; i < damage.debris.length; i++) {
      const d = damage.debris[i];
      const node = debrisGroupRefs.current.get(d.id);
      if (node) {
        node.position.set(d.position[0], d.position[1], d.position[2]);
        node.rotation.set(d.rotation[0], d.rotation[1], d.rotation[2]);
      }
    }

    // Update world-space metallic spark particles at 60 FPS
    for (let i = 0; i < damage.sparks.length; i++) {
      const s = damage.sparks[i];
      const mesh = sparkMeshRefs.current.get(s.id);
      if (mesh) {
        mesh.position.set(s.position[0], s.position[1], s.position[2]);
        const lifeScale = Math.max(0.1, s.life / s.maxLife);
        mesh.scale.setScalar(lifeScale);
      }
    }

    // 3. Apply transforms directly to Three.js scene graph nodes via refs
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(
        physics.position[0],
        physics.position[1],
        physics.position[2]
      );
      rootGroupRef.current.rotation.set(0, physics.rotationY, 0);
    }

    if (chassisSuspensionRef.current) {
      let shakePitch = 0;
      let shakeRoll = 0;
      if (impactShakeRef.current > 0) {
        impactShakeRef.current = Math.max(0, impactShakeRef.current - delta);
        const shakeAmp = impactShakeRef.current * 0.16;
        shakePitch = Math.sin(elapsed * 55) * shakeAmp;
        shakeRoll = Math.cos(elapsed * 48) * shakeAmp;
      }

      const isAirborne = isFlying && physics.isAirborne;
      const hoverBobY = isAirborne
        ? Math.sin(elapsed * 3.8) * 0.055 +
          Math.min(Math.abs(physics.speedMps) * 0.012, 0.09)
        : 0;
      const pitchGain = isAirborne ? 1.2 : 1.0;
      const rollGain = isAirborne ? 1.35 : 1.0;

      chassisSuspensionRef.current.position.set(0, hoverBobY, 0);
      chassisSuspensionRef.current.rotation.set(
        physics.pitchRad * pitchGain + shakePitch,
        0,
        physics.rollRad * rollGain + shakeRoll
      );
    }

    // Animate rising engine smoke puffs when car health is low (< 48%) or totaled
    if (smokeGroupRef.current) {
      const children = smokeGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const puff = children[i];
        const phase = (elapsed * 1.45 + i * 0.25) % 1;
        puff.position.y = 0.65 + phase * 1.65;
        puff.position.x = Math.sin(elapsed * 2.2 + i * 1.7) * 0.22 * phase;
        puff.position.z =
          -vehicle.dimensions.length * 0.31 + phase * 0.35;
        const puffScale = 0.35 + phase * 1.15;
        puff.scale.setScalar(puffScale);
      }
    }

    // 4. Update wheel steering & rolling rotation
    const wheels = wheelRefs.current;
    const spinAngle =
      isFlying && physics.isAirborne
        ? physics.wheelSpinRad - elapsed * 6.5
        : physics.wheelSpinRad;

    if (wheels.frontLeftSteer) {
      wheels.frontLeftSteer.rotation.y = physics.steeringAngle;
    }
    if (wheels.frontRightSteer) {
      wheels.frontRightSteer.rotation.y = physics.steeringAngle;
    }
    if (wheels.frontLeftSpin) {
      wheels.frontLeftSpin.rotation.x = spinAngle;
    }
    if (wheels.frontRightSpin) {
      wheels.frontRightSpin.rotation.x = spinAngle;
    }
    if (wheels.rearLeftSpin) {
      wheels.rearLeftSpin.rotation.x = spinAngle;
    }
    if (wheels.rearRightSpin) {
      wheels.rearRightSpin.rotation.x = spinAngle;
    }

    // 5. Update dynamic brake, reverse & hazard lights (flash when totaled)
    const lights = lightRefs.current;
    const hazardFlash = damage.isTotaled
      ? Math.sin(elapsed * 10) > 0
        ? 3.2
        : 0.2
      : null;
    const brakeIntensity =
      hazardFlash !== null ? hazardFlash : physics.isBraking ? 2.6 : 0.85;

    if (lights.brakeLightLeft) {
      lights.brakeLightLeft.emissiveIntensity = brakeIntensity;
    }
    if (lights.brakeLightRight) {
      lights.brakeLightRight.emissiveIntensity = brakeIntensity;
    }
    if (lights.brakeLightBar) {
      lights.brakeLightBar.emissiveIntensity =
        hazardFlash !== null ? hazardFlash : physics.isBraking ? 2.8 : 1.1;
    }

    const reverseIntensity = physics.isReversing ? 2.2 : 0;
    if (lights.reverseLightLeft) {
      lights.reverseLightLeft.emissiveIntensity = reverseIntensity;
    }
    if (lights.reverseLightRight) {
      lights.reverseLightRight.emissiveIntensity = reverseIntensity;
    }

    if (lights.thrusterGlow) {
      const speedNorm = Math.min(1, Math.abs(physics.speedMps) / 10);
      const climbBoost = Math.min(1.5, Math.abs(physics.verticalVelocityY) / 6);
      lights.thrusterGlow.emissiveIntensity = physics.isAirborne
        ? 2.2 + speedNorm * 3.2 + climbBoost * 2.0 + Math.sin(elapsed * 28) * 0.45
        : 0.35 + speedNorm * 1.4;
    }
    if (lights.hoverRingGlow) {
      lights.hoverRingGlow.emissiveIntensity = physics.isAirborne
        ? 2.0 + Math.min(1.8, physics.position[1] * 0.15) + Math.sin(elapsed * 6.5) * 0.45
        : 0.15;
    }

    // 6. Emit throttled state updates to external consumers
    const isMoving =
      Math.abs(physics.speedMps) > MOVING_SPEED_THRESHOLD_MPS ||
      Math.abs(physics.verticalVelocityY) > MOVING_SPEED_THRESHOLD_MPS ||
      Math.abs(physics.lateralVelocityX) > MOVING_SPEED_THRESHOLD_MPS ||
      Math.abs(physics.lateralVelocityZ) > MOVING_SPEED_THRESHOLD_MPS;
    const movingChanged = isMoving !== lastReportedMovingRef.current;
    const steerChanged =
      Math.abs(physics.steeringAngle - lastReportedSteerRef.current) > 0.008;
    const throttleElapsed =
      elapsed - lastReportTimeRef.current >= STATE_REPORT_INTERVAL_SEC;

    if (
      outcome.newCollisionsCounted > 0 ||
      movingChanged ||
      ((isMoving || steerChanged) && throttleElapsed)
    ) {
      lastReportTimeRef.current = elapsed;
      lastReportedMovingRef.current = isMoving;
      lastReportedSteerRef.current = physics.steeringAngle;

      onStateChangeRef.current?.({
        position: [
          physics.position[0],
          physics.position[1],
          physics.position[2],
        ],
        rotationY: physics.rotationY,
        speedMps: isMoving ? physics.speedMps : 0,
        steeringAngle: physics.steeringAngle,
        collisionCount: collisionCountRef.current,
        isMoving,
        isBraking: physics.isBraking,
        isReversing: physics.isReversing,
        damage: cloneDamageStateSnapshot(damage),
      });
    }
  });

  const showEngineSmoke = visualDamage.health < 48 || visualDamage.isTotaled;
  const isCriticalSmoke = visualDamage.health < 22 || visualDamage.isTotaled;

  return (
    <>
      <group
        ref={rootGroupRef}
        position={[spawnX, spawnY, spawnZ]}
        rotation={[0, initialRotationY, 0]}
        name="player-vehicle-controller"
      >
        <group ref={chassisSuspensionRef}>
          <VehicleModel
            vehicle={vehicle}
            wheelRefs={wheelRefs}
            lightRefs={lightRefs}
            damageState={visualDamage}
            impactFlash={impactShakeRef.current > 0.12}
          />

          {/* Engine Smoke / Steam Plume when health < 48% or Totaled */}
          {showEngineSmoke && (
            <group ref={smokeGroupRef} name="engine-damage-smoke">
              {[0, 1, 2, 3].map((idx) => (
                <mesh
                  key={`smoke-${idx}`}
                  position={[0, 0.75 + idx * 0.32, -vehicle.dimensions.length * 0.31]}
                >
                  <dodecahedronGeometry args={[0.24, 1]} />
                  <meshStandardMaterial
                    color={isCriticalSmoke ? '#1e293b' : '#94a3b8'}
                    transparent
                    opacity={isCriticalSmoke ? 0.58 : 0.36}
                    roughness={0.95}
                  />
                </mesh>
              ))}
              {visualDamage.isTotaled && (
                <pointLight
                  position={[0, 0.7, -vehicle.dimensions.length * 0.32]}
                  color="#f97316"
                  intensity={1.6}
                  distance={3.5}
                />
              )}
            </group>
          )}
        </group>
      </group>

      {/* World-Space Detached 3D Car Parts (Bumpers, Hood, Trunk, Mirrors, Fenders) */}
      <group name="detached-vehicle-debris-world">
        {visualDamage.debris.map((part) => (
          <group
            key={part.id}
            ref={(node) => {
              if (node) {
                debrisGroupRefs.current.set(part.id, node);
              } else {
                debrisGroupRefs.current.delete(part.id);
              }
            }}
            position={part.position}
            rotation={part.rotation}
          >
            {/* Main detached painted/custom-skinned car part mesh */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={part.dimensions} />
              <meshPhysicalMaterial
                color={part.color}
                metalness={effectivePhysics.skin.metalness}
                roughness={effectivePhysics.skin.roughness}
                clearcoat={effectivePhysics.skin.metalness > 0.5 ? 0.85 : 0.25}
                transparent={effectivePhysics.skin.opacity < 1}
                opacity={effectivePhysics.skin.opacity}
              />
            </mesh>
            {/* Dark inner bracket / backing trim on the detached part */}
            <mesh position={[0, -part.dimensions[1] * 0.35, 0]}>
              <boxGeometry
                args={[
                  part.dimensions[0] * 0.88,
                  part.dimensions[1] * 0.35,
                  part.dimensions[2] * 0.88,
                ]}
              />
              <meshStandardMaterial
                color="#0f172a"
                metalness={0.6}
                roughness={0.6}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* World-Space Metallic Impact Spark Particles */}
      <group name="collision-spark-particles-world">
        {visualDamage.sparks.map((spark) => (
          <mesh
            key={spark.id}
            ref={(node) => {
              if (node) {
                sparkMeshRefs.current.set(spark.id, node);
              } else {
                sparkMeshRefs.current.delete(spark.id);
              }
            }}
            position={spark.position}
          >
            <boxGeometry args={[0.075, 0.075, 0.16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        ))}
      </group>
    </>
  );
}
