/**
 * PARKLAB 3D — Player Vehicle Controller (React Three Fiber)
 * Integrates keyboard input, arcade driving physics, OBB obstacle collision handling,
 * animated 3D procedural vehicle models (including the Flying Tesla Roadster hover-thruster
 * levitation dynamics), and throttled runtime telemetry reporting.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type {
  ObstacleDefinition,
  Vec3,
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
  VehicleModel,
  type VehicleLightRefs,
  type VehicleWheelRefs,
} from './VehicleModels';

export interface VehicleControllerProps {
  /** Selected player vehicle definition */
  vehicle?: VehicleDefinition;
  /** Spawn position [x, y, z] in world space */
  initialPosition?: Vec3;
  /** Spawn heading rotation around Y axis in radians */
  initialRotationY?: number;
  /** Static obstacles from the active parking challenge */
  obstacles?: ObstacleDefinition[];
  /** Whether keyboard driving controls are active */
  enabled?: boolean;
  /** Throttled callback receiving current vehicle telemetry state */
  onStateChange?: (state: VehicleRuntimeState) => void;
  /** Callback fired once per distinct obstacle/boundary collision event */
  onCollision?: (obstacle: ObstacleDefinition, collisionCount: number) => void;
  /** Optional world boundary overrides */
  worldBounds?: WorldBoundaryLimits;
  /** Optional external reset token to force respawn at initial transform */
  resetKey?: string | number;
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
  worldBounds,
  resetKey,
}: VehicleControllerProps) {
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const chassisSuspensionRef = useRef<THREE.Group | null>(null);

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

  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;

  const spawnX = initialPosition[0];
  const spawnY = initialPosition[1];
  const spawnZ = initialPosition[2];

  // Reset vehicle state when challenge spawn transform, vehicle, or resetKey changes
  useEffect(() => {
    const startPos: Vec3 = [spawnX, spawnY, spawnZ];
    physicsRef.current = createInitialPhysicsState(startPos, initialRotationY);
    resetCollisionTrackerState(collisionTrackerRef.current);
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
    });
  }, [spawnX, spawnY, spawnZ, initialRotationY, vehicle.id, resetKey]);

  useFrame((frameState, delta) => {
    const physics = physicsRef.current;
    const elapsed = frameState.clock.getElapsedTime();
    const chassisSpec = getChassisSpec(vehicle);
    const isFlying = Boolean(chassisSpec.isFlyingVehicle);

    // 1. Step driving / flight-hover kinematics
    stepDrivingPhysics(physics, inputRef.current, vehicle, delta, enabled);

    // 2. Resolve collisions against challenge obstacles & outer world boundaries
    const collisionResult = resolveVehicleCollisions({
      position: physics.position,
      rotationY: physics.rotationY,
      speedMps: physics.speedMps,
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
      impactShakeRef.current = 0.25;

      for (let i = 0; i < outcome.collidedObstacles.length; i++) {
        onCollisionRef.current?.(
          outcome.collidedObstacles[i],
          collisionCountRef.current
        );
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
        const shakeAmp = impactShakeRef.current * 0.14;
        shakePitch = Math.sin(elapsed * 55) * shakeAmp;
        shakeRoll = Math.cos(elapsed * 48) * shakeAmp;
      }

      // Flying Roadster features active anti-gravity hover oscillation & aerodynamic banking
      const hoverBobY = isFlying
        ? Math.sin(elapsed * 3.4) * 0.042 +
          Math.min(Math.abs(physics.speedMps) * 0.012, 0.09)
        : 0;
      const pitchGain = isFlying ? 1.85 : 1.0;
      const rollGain = isFlying ? 2.25 : 1.0;

      chassisSuspensionRef.current.position.set(0, hoverBobY, 0);
      chassisSuspensionRef.current.rotation.set(
        physics.pitchRad * pitchGain + shakePitch,
        0,
        physics.rollRad * rollGain + shakeRoll
      );
    }

    // 4. Update wheel steering & rolling / hover-turbine rotation
    const wheels = wheelRefs.current;
    const spinAngle = isFlying
      ? physics.wheelSpinRad - elapsed * 9.5 // Continuous hover-fan turbine spin
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

    // 5. Update dynamic brake, reverse & SpaceX cold-gas thruster lights via material refs
    const lights = lightRefs.current;
    const brakeIntensity = physics.isBraking ? 2.6 : 0.85;
    if (lights.brakeLightLeft) {
      lights.brakeLightLeft.emissiveIntensity = brakeIntensity;
    }
    if (lights.brakeLightRight) {
      lights.brakeLightRight.emissiveIntensity = brakeIntensity;
    }
    if (lights.brakeLightBar) {
      lights.brakeLightBar.emissiveIntensity = physics.isBraking ? 2.8 : 1.1;
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
      lights.thrusterGlow.emissiveIntensity =
        1.8 + speedNorm * 2.8 + Math.sin(elapsed * 24) * 0.35;
    }
    if (lights.hoverRingGlow) {
      lights.hoverRingGlow.emissiveIntensity =
        1.4 + Math.sin(elapsed * 4.5) * 0.4;
    }

    // 6. Emit throttled state updates to external consumers
    const isMoving = Math.abs(physics.speedMps) > MOVING_SPEED_THRESHOLD_MPS;
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
      });
    }
  });

  return (
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
        />
      </group>
    </group>
  );
}
