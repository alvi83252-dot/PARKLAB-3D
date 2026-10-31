/**
 * PARKLAB 3D — 2D Oriented Bounding Box (OBB) Collision Detection & Response
 * Uses the Separating Axis Theorem (SAT) in the XZ ground plane to detect and resolve
 * collisions between the player vehicle, challenge obstacles, and outer world boundaries.
 */

import type {
  ObstacleDefinition,
  Vec3,
  VehicleDimensions,
} from './types';

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

const OBSTACLE_COOLDOWN_SECONDS = 0.95;
const GLOBAL_COLLISION_COOLDOWN_SECONDS = 0.45;
const SEPARATION_EPSILON = 0.015;
const HITBOX_BEVEL_FACTOR = 0.97;

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
}

/**
 * Resolves vehicle collisions against all challenge obstacles and outer world boundaries.
 * Mutates `position` and `speedMps` in place to prevent driving through obstacles,
 * and filters repeated frame-by-frame contacts using `tracker`.
 */
export function resolveVehicleCollisions(params: {
  position: Vec3;
  rotationY: number;
  speedMps: number;
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

  let currentSpeed = params.speedMps;
  const currentFrameContacts = new Set<string>();
  const collidedObstacles: ObstacleDefinition[] = [];
  let newCollisionsCounted = 0;
  let hadPhysicalImpact = false;

  const registerContact = (contactId: string, obstacle: ObstacleDefinition) => {
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
    }
  };

  // 1. Check against all challenge obstacles
  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];
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

    // Push vehicle out along Minimum Translation Vector so it never drives through obstacles
    const pushDistance = mtv.penetration + SEPARATION_EPSILON;
    position[0] += mtv.normalX * pushDistance;
    position[2] += mtv.normalZ * pushDistance;

    // Calculate velocity component into the obstacle normal
    const forwardX = -Math.sin(rotationY);
    const forwardZ = -Math.cos(rotationY);
    const velX = forwardX * currentSpeed;
    const velZ = forwardZ * currentSpeed;
    const velAlongNormal = velX * mtv.normalX + velZ * mtv.normalZ;

    if (velAlongNormal < 0) {
      if (obstacle.kind === 'cone') {
        // Cones damp speed moderately on impact
        currentSpeed *= 0.45;
      } else {
        // Parked cars and kerbs arrest forward/reverse penetration and give a gentle rebound
        if (Math.abs(currentSpeed) > 1.2) {
          currentSpeed = -Math.sign(currentSpeed) * Math.min(1.1, Math.abs(currentSpeed) * 0.25);
        } else {
          currentSpeed = 0;
        }
      }
    }

    const contactId = obstacle.id || `obstacle-${i}`;
    registerContact(contactId, obstacle);
  }

  // 2. Check outer world boundaries so the player cannot drive off the world
  const vehicleOBB = buildOBB2D(position, rotationY, vehicleDimensions, 1.0);
  const extentX = projectOBBRadius(vehicleOBB, 1, 0);
  const extentZ = projectOBBRadius(vehicleOBB, 0, 1);

  let hitBoundary = false;
  let boundaryPosition: Vec3 = [position[0], 0, position[2]];

  if (position[0] - extentX < worldBounds.minX) {
    position[0] = worldBounds.minX + extentX + SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [worldBounds.minX, 0, position[2]];
  } else if (position[0] + extentX > worldBounds.maxX) {
    position[0] = worldBounds.maxX - extentX - SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [worldBounds.maxX, 0, position[2]];
  }

  if (position[2] - extentZ < worldBounds.minZ) {
    position[2] = worldBounds.minZ + extentZ + SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [position[0], 0, worldBounds.minZ];
  } else if (position[2] + extentZ > worldBounds.maxZ) {
    position[2] = worldBounds.maxZ - extentZ - SEPARATION_EPSILON;
    hitBoundary = true;
    boundaryPosition = [position[0], 0, worldBounds.maxZ];
  }

  if (hitBoundary) {
    currentSpeed = 0;
    const boundaryObstacle: ObstacleDefinition = {
      id: 'world-boundary',
      kind: 'kerb',
      position: boundaryPosition,
      rotationY: 0,
      dimensions: { length: 1, width: 1, height: 0.3 },
    };
    registerContact('world-boundary', boundaryObstacle);
  }

  // Update active contact tracking set for the next frame
  tracker.activeContactIds = currentFrameContacts;

  return {
    speedMps: currentSpeed,
    outcome: {
      newCollisionsCounted,
      collidedObstacles,
      hadPhysicalImpact,
    },
  };
}
