/**
 * PARKLAB 3D — 2D Oriented Bounding Box (OBB) Collision Detection & Rigid-Body Response
 * Uses the Separating Axis Theorem (SAT) in the XZ ground plane to detect and resolve
 * collisions between the player vehicle, challenge obstacles, city buildings/props,
 * and outer world boundaries, producing realistic contact points, angular yaw impulses,
 * lateral shunts, suspension shock, and damage impact events.
 */

import type {
  ObstacleDefinition,
  Vec3,
  VehicleDimensions,
} from './types';
import type { CollisionImpactEvent } from './damageSystem';

export interface OBB2D {
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfLength: number;
  axisXx: number;
  axisXz: number;
  axisZx: number;
  axisZz: number;
}

export interface MTVResult {
  intersecting: boolean;
  normalX: number;
  normalZ: number;
  penetration: number;
}

export interface WorldBoundaryLimits {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const DEFAULT_WORLD_BOUNDS: WorldBoundaryLimits = {
  minX: -58,
  maxX: 58,
  minZ: -58,
  maxZ: 58,
};

export interface CollisionTrackerState {
  /** Obstacles currently in physical contact during the previous frame */
  activeContactIds: Set<string>;
  /** Last timestamp (in seconds) each obstacle triggered a counted collision */
  lastCollisionTimeById: Map<string, number>;
  /** Last timestamp (in seconds) any collision was counted */
  lastGlobalCollisionTime: number;
}

const OBSTACLE_COOLDOWN_SECONDS = 0.65;
const GLOBAL_COLLISION_COOLDOWN_SECONDS = 0.28;
const SEPARATION_EPSILON = 0.018;
const HITBOX_BEVEL_FACTOR = 0.97;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function createCollisionTrackerState(): CollisionTrackerState {
  return {
    activeContactIds: new Set<string>(),
    lastCollisionTimeById: new Map<string, number>(),
    lastGlobalCollisionTime: -10,
  };
}

export function resetCollisionTrackerState(tracker: CollisionTrackerState): void {
  tracker.activeContactIds.clear();
  tracker.lastCollisionTimeById.clear();
  tracker.lastGlobalCollisionTime = -10;
}

export function buildOBB2D(
  position: Vec3,
  rotationY: number,
  dimensions: VehicleDimensions,
  scaleFactor = HITBOX_BEVEL_FACTOR
): OBB2D {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);

  return {
    centerX: position[0],
    centerZ: position[2],
    halfWidth: Math.max(0.12, (dimensions.width * scaleFactor) / 2),
    halfLength: Math.max(0.12, (dimensions.length * scaleFactor) / 2),
    // Local X axis in world XZ plane: (cos(theta), -sin(theta))
    axisXx: cos,
    axisXz: -sin,
    // Local Z axis in world XZ plane: (sin(theta), cos(theta))
    axisZx: sin,
    axisZz: cos,
  };
}

function projectOBBRadius(obb: OBB2D, axisX: number, axisZ: number): number {
  const dotX = Math.abs(obb.axisXx * axisX + obb.axisXz * axisZ);
  const dotZ = Math.abs(obb.axisZx * axisX + obb.axisZz * axisZ);
  return obb.halfWidth * dotX + obb.halfLength * dotZ;
}

/**
 * Computes approximate world-space contact point on the vehicle OBB perimeter
 * closest to the obstacle center along the collision normal.
 */
function computeVehicleContactPoint(
  vehicleOBB: OBB2D,
  obstacleOBB: OBB2D,
  normalX: number,
  normalZ: number
): Vec3 {
  // Vector from vehicle center toward obstacle center
  const toObsX = obstacleOBB.centerX - vehicleOBB.centerX;
  const toObsZ = obstacleOBB.centerZ - vehicleOBB.centerZ;

  // Project onto vehicle local axes and clamp to vehicle half-extents
  const localX = clamp(
    toObsX * vehicleOBB.axisXx + toObsZ * vehicleOBB.axisXz,
    -vehicleOBB.halfWidth,
    vehicleOBB.halfWidth
  );
  const localZ = clamp(
    toObsX * vehicleOBB.axisZx + toObsZ * vehicleOBB.axisZz,
    -vehicleOBB.halfLength,
    vehicleOBB.halfLength
  );

  // Also bias toward the face opposite the MTV normal
  const faceX = (-normalX * vehicleOBB.axisXx - normalZ * vehicleOBB.axisXz) * vehicleOBB.halfWidth;
  const faceZ = (-normalX * vehicleOBB.axisZx - normalZ * vehicleOBB.axisZz) * vehicleOBB.halfLength;

  const blendedLocalX = clamp(localX * 0.65 + faceX * 0.35, -vehicleOBB.halfWidth, vehicleOBB.halfWidth);
  const blendedLocalZ = clamp(localZ * 0.65 + faceZ * 0.35, -vehicleOBB.halfLength, vehicleOBB.halfLength);

  const worldX =
    vehicleOBB.centerX +
    blendedLocalX * vehicleOBB.axisXx +
    blendedLocalZ * vehicleOBB.axisZx;
  const worldZ =
    vehicleOBB.centerZ +
    blendedLocalX * vehicleOBB.axisXz +
    blendedLocalZ * vehicleOBB.axisZz;

  return [worldX, 0.42, worldZ];
}

/**
 * Computes 2D Oriented Bounding Box intersection using the Separating Axis Theorem (SAT).
 * Returns the Minimum Translation Vector (MTV) pointing from `obstacleOBB` towards `vehicleOBB`.
 */
export function testOBBIntersection(
  vehicleOBB: OBB2D,
  obstacleOBB: OBB2D
): MTVResult {
  const deltaX = vehicleOBB.centerX - obstacleOBB.centerX;
  const deltaZ = vehicleOBB.centerZ - obstacleOBB.centerZ;

  const candidateAxes: [number, number][] = [
    [vehicleOBB.axisXx, vehicleOBB.axisXz],
    [vehicleOBB.axisZx, vehicleOBB.axisZz],
    [obstacleOBB.axisXx, obstacleOBB.axisXz],
    [obstacleOBB.axisZx, obstacleOBB.axisZz],
  ];

  let minPenetration = Number.POSITIVE_INFINITY;
  let bestNormalX = 0;
  let bestNormalZ = 0;

  for (let i = 0; i < candidateAxes.length; i++) {
    const [ax, az] = candidateAxes[i];
    const rVehicle = projectOBBRadius(vehicleOBB, ax, az);
    const rObstacle = projectOBBRadius(obstacleOBB, ax, az);
    const centerDistance = Math.abs(deltaX * ax + deltaZ * az);
    const overlap = rVehicle + rObstacle - centerDistance;

    if (overlap <= 0) {
      return {
        intersecting: false,
        normalX: 0,
        normalZ: 0,
        penetration: 0,
      };
    }

    if (overlap < minPenetration) {
      minPenetration = overlap;
      const sign = deltaX * ax + deltaZ * az >= 0 ? 1 : -1;
      bestNormalX = ax * sign;
      bestNormalZ = az * sign;
    }
  }

  return {
    intersecting: true,
    normalX: bestNormalX,
    normalZ: bestNormalZ,
    penetration: minPenetration,
  };
}

export interface CollisionStepOutcome {
  newCollisionsCounted: number;
  collidedObstacles: ObstacleDefinition[];
  hadPhysicalImpact: boolean;
  impactEvents: CollisionImpactEvent[];
}

/**
 * Resolves vehicle collisions against all challenge/world obstacles and outer world boundaries.
 * Mutates `position` and `speedMps` in place to prevent driving through obstacles,
 * computes realistic off-center angular and lateral impulses, and emits `CollisionImpactEvent`s.
 */
export function resolveVehicleCollisions(params: {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  lateralVelocityX?: number;
  lateralVelocityZ?: number;
  vehicleDimensions: VehicleDimensions;
  obstacles: readonly ObstacleDefinition[];
  tracker: CollisionTrackerState;
  elapsedTimeSec: number;
  worldBounds?: WorldBoundaryLimits;
}): {
  speedMps: number;
  outcome: CollisionStepOutcome;
} {
  const {
    position,
    rotationY,
    vehicleDimensions,
    obstacles,
    tracker,
    elapsedTimeSec,
    worldBounds = DEFAULT_WORLD_BOUNDS,
  } = params;

  const initialSpeed = params.speedMps;
  let currentSpeed = params.speedMps;
  const currentFrameContacts = new Set<string>();
  const collidedObstacles: ObstacleDefinition[] = [];
  const impactEvents: CollisionImpactEvent[] = [];
  let newCollisionsCounted = 0;
  let hadPhysicalImpact = false;

  const forwardX = -Math.sin(rotationY);
  const forwardZ = -Math.cos(rotationY);
  const rightX = Math.cos(rotationY);
  const rightZ = -Math.sin(rotationY);

  const registerImpact = (
    contactId: string,
    obstacle: ObstacleDefinition,
    contactPoint: Vec3,
    normalX: number,
    normalZ: number,
    penetration: number,
    preImpactSpeed: number,
    normalImpactSpeedMps: number
  ) => {
    currentFrameContacts.add(contactId);

    const wasAlreadyTouching = tracker.activeContactIds.has(contactId);
    const lastHitTime =
      tracker.lastCollisionTimeById.get(contactId) ?? -100;
    const obstacleCooldownElapsed =
      elapsedTimeSec - lastHitTime >= OBSTACLE_COOLDOWN_SECONDS;
    const globalCooldownElapsed =
      elapsedTimeSec - tracker.lastGlobalCollisionTime >=
      GLOBAL_COLLISION_COOLDOWN_SECONDS;

    if (!wasAlreadyTouching && obstacleCooldownElapsed && globalCooldownElapsed) {
      newCollisionsCounted += 1;
      collidedObstacles.push(obstacle);
      tracker.lastCollisionTimeById.set(contactId, elapsedTimeSec);
      tracker.lastGlobalCollisionTime = elapsedTimeSec;
      hadPhysicalImpact = true;

      // Compute lever arm r = contactPoint - vehicleCenter
      const rx = contactPoint[0] - position[0];
      const rz = contactPoint[2] - position[2];

      // 2D cross product (r x N) in XZ plane for yaw torque
      // Positive rotationY turns left (counter-clockwise looking from +Y)
      const torqueArm = rz * normalX - rx * normalZ;
      const effectiveSpeed = Math.max(Math.abs(preImpactSpeed), normalImpactSpeedMps, 0.9);
      const isSoftObstacle = obstacle.kind === 'cone';
      const stiffness = isSoftObstacle ? 0.18 : obstacle.kind === 'kerb' ? 0.65 : 1.0;

      const yawImpulseRadPerSec = clamp(
        torqueArm * effectiveSpeed * 0.42 * stiffness,
        -3.2,
        3.2
      );

      const reboundScalar = clamp(effectiveSpeed * 0.42 * stiffness, 0.25, 4.8);
      const lateralImpulseX = normalX * reboundScalar;
      const lateralImpulseZ = normalZ * reboundScalar;

      // Pitch & roll suspension shock from impact direction in local vehicle frame
      const localNormalZ = normalX * forwardX + normalZ * forwardZ; // +1 if hit from front pushing back
      const localNormalX = normalX * rightX + normalZ * rightZ;
      const shockMag = clamp(effectiveSpeed * 0.022 * stiffness, 0.015, 0.14);
      const pitchImpulse = -localNormalZ * shockMag;
      const rollImpulse = localNormalX * shockMag * 1.15;

      impactEvents.push({
        obstacle,
        contactPoint,
        normalX,
        normalZ,
        penetration,
        impactSpeedMps: Math.abs(preImpactSpeed),
        normalImpactSpeedMps,
        yawImpulseRadPerSec,
        lateralImpulseX,
        lateralImpulseZ,
        pitchImpulse,
        rollImpulse,
      });
    }
  };

  // 1. Check against all challenge & city obstacles
  const vHalfDiag = (vehicleDimensions.length + vehicleDimensions.width) * 0.65;

  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];

    // 3D Vertical Altitude Clearance Check:
    // When flying above an obstacle's roof height, pass cleanly over it in 3D space
    const obstacleTopY = (obstacle.position[1] ?? 0) + obstacle.dimensions.height;
    if (position[1] > obstacleTopY - 0.12) {
      continue;
    }

    // Fast broadphase bounding circle check before SAT
    const dxBroad = position[0] - obstacle.position[0];
    const dzBroad = position[2] - obstacle.position[2];
    const maxObsSpan =
      (obstacle.dimensions.length + obstacle.dimensions.width) * 0.65 + vHalfDiag;
    if (dxBroad * dxBroad + dzBroad * dzBroad > maxObsSpan * maxObsSpan) {
      continue;
    }

    const vehicleOBB = buildOBB2D(position, rotationY, vehicleDimensions);
    const obstacleScale = obstacle.kind === 'cone' ? 0.92 : HITBOX_BEVEL_FACTOR;
    const obstacleOBB = buildOBB2D(
      obstacle.position,
      obstacle.rotationY,
      obstacle.dimensions,
      obstacleScale
    );

    const mtv = testOBBIntersection(vehicleOBB, obstacleOBB);
    if (!mtv.intersecting) {
      continue;
    }

    const contactPoint = computeVehicleContactPoint(
      vehicleOBB,
      obstacleOBB,
      mtv.normalX,
      mtv.normalZ
    );

    // Push vehicle out along Minimum Translation Vector so it never drives through obstacles
    const pushDistance = mtv.penetration + SEPARATION_EPSILON;
    position[0] += mtv.normalX * pushDistance;
    position[2] += mtv.normalZ * pushDistance;

    // Calculate velocity component into the obstacle normal
    const velX = forwardX * currentSpeed + (params.lateralVelocityX ?? 0);
    const velZ = forwardZ * currentSpeed + (params.lateralVelocityZ ?? 0);
    const velAlongNormal = velX * mtv.normalX + velZ * mtv.normalZ;
    const normalImpactSpeedMps = Math.max(
      0,
      -velAlongNormal,
      Math.abs(initialSpeed) * 0.55
    );

    if (velAlongNormal < 0) {
      if (obstacle.kind === 'cone') {
        // Cones damp speed moderately on impact
        currentSpeed *= 0.58;
      } else if (obstacle.kind === 'kerb' || obstacle.kind === 'island') {
        // Kerbs jolt the car and scrub speed
        if (Math.abs(currentSpeed) > 1.8) {
          currentSpeed = -Math.sign(currentSpeed) * Math.min(1.25, Math.abs(currentSpeed) * 0.28);
        } else {
          currentSpeed *= 0.2;
        }
      } else {
        // Parked cars, buildings, lampposts, and barriers arrest penetration and rebound
        const restitution = obstacle.kind === 'building' ? 0.34 : 0.3;
        if (Math.abs(currentSpeed) > 1.0) {
          currentSpeed =
            -Math.sign(currentSpeed) *
            Math.min(2.6, Math.abs(currentSpeed) * restitution);
        } else {
          currentSpeed = 0;
        }
      }
    }

    const contactId = obstacle.id || `obstacle-${i}`;
    registerImpact(
      contactId,
      obstacle,
      contactPoint,
      mtv.normalX,
      mtv.normalZ,
      mtv.penetration,
      initialSpeed,
      normalImpactSpeedMps
    );
  }

  // 2. Check outer world boundaries so the player cannot drive off the world
  const vehicleOBB = buildOBB2D(position, rotationY, vehicleDimensions, 1.0);
  const extentX = projectOBBRadius(vehicleOBB, 1, 0);
  const extentZ = projectOBBRadius(vehicleOBB, 0, 1);

  let hitBoundary = false;
  let boundaryPosition: Vec3 = [position[0], 0, position[2]];
  let boundaryNormalX = 0;
  let boundaryNormalZ = 0;

  if (position[0] - extentX < worldBounds.minX) {
    position[0] = worldBounds.minX + extentX + SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [worldBounds.minX, 0, position[2]];
    boundaryNormalX = 1;
  } else if (position[0] + extentX > worldBounds.maxX) {
    position[0] = worldBounds.maxX - extentX - SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [worldBounds.maxX, 0, position[2]];
    boundaryNormalX = -1;
  }

  if (position[2] - extentZ < worldBounds.minZ) {
    position[2] = worldBounds.minZ + extentZ + SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [position[0], 0, worldBounds.minZ];
    boundaryNormalZ = 1;
  } else if (position[2] + extentZ > worldBounds.maxZ) {
    position[2] = worldBounds.maxZ - extentZ - SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [position[0], 0, worldBounds.maxZ];
    boundaryNormalZ = -1;
  }

  if (hitBoundary) {
    const preSpeed = currentSpeed;
    currentSpeed = -Math.sign(currentSpeed) * Math.min(1.4, Math.abs(currentSpeed) * 0.25);
    const boundaryObstacle: ObstacleDefinition = {
      id: 'world-boundary',
      kind: 'barrier',
      label: 'Perimeter Barrier',
      position: boundaryPosition,
      rotationY: 0,
      dimensions: { length: 1, width: 1, height: 0.9 },
    };
    registerImpact(
      'world-boundary',
      boundaryObstacle,
      [boundaryPosition[0], 0.45, boundaryPosition[2]],
      boundaryNormalX || 0,
      boundaryNormalZ || 1,
      0.08,
      preSpeed,
      Math.abs(preSpeed) * 0.85
    );
  }

  // Update active contact tracking set for the next frame
  tracker.activeContactIds = currentFrameContacts;

  return {
    speedMps: currentSpeed,
    outcome: {
      newCollisionsCounted,
      collidedObstacles,
      hadPhysicalImpact,
      impactEvents,
    },
  };
}
